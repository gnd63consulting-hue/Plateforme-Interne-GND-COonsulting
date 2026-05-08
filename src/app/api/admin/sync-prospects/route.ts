import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { notionStatusToSupabaseStatus } from '@/lib/status-mapping';

export const dynamic = 'force-dynamic';

const NOTION_DB_ID =
  process.env.NOTION_PROSPECTS_DB_ID ?? 'cc69ef03-abfa-487e-b392-0f308a30f404';
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Statuts Notion considérés comme « morts » (rejet / archivage définitifs).
 *
 * Ces prospects sont physiquement DELETE de Supabase pour ne pas polluer la
 * base. NURTURE n'en fait PAS partie : un prospect en NURTURE est une fiche
 * « à recultiver plus tard » qu'on veut conserver côté plateforme avec un
 * statut `archived` (visible via toggle « voir tout le pipeline »), pas la
 * supprimer. Voir le mapping NURTURE -> 'archived' dans status-mapping.ts.
 */
const NOTION_DEAD_STATUSES = new Set([
  'Rejeté',
  'Non pertinent',
  'REJECT',
  'Archivé',
  'Archive',
]);

/** Statuts Notion totalement ignorés (non qualifiés). */
const NOTION_IGNORED_STATUSES = new Set(['Détecté']);

type NotionProps = Record<string, unknown>;

function title(prop: unknown): string {
  const arr = (prop as { title?: { plain_text?: string }[] })?.title ?? [];
  return arr.map((t) => t.plain_text ?? '').join('').trim();
}
function richText(prop: unknown): string {
  const arr =
    (prop as { rich_text?: { plain_text?: string }[] })?.rich_text ?? [];
  return arr.map((t) => t.plain_text ?? '').join('').trim();
}
function emailField(prop: unknown): string {
  return (prop as { email?: string })?.email ?? '';
}
function phoneField(prop: unknown): string {
  return (prop as { phone_number?: string })?.phone_number ?? '';
}
function urlField(prop: unknown): string {
  return (prop as { url?: string })?.url ?? '';
}
function selectName(prop: unknown): string {
  return (prop as { select?: { name?: string } })?.select?.name ?? '';
}
function multiSelectNames(prop: unknown): string[] {
  const arr =
    (prop as { multi_select?: { name?: string }[] })?.multi_select ?? [];
  return arr.map((o) => o.name ?? '').filter(Boolean);
}
function numberField(prop: unknown): number | null {
  const n = (prop as { number?: number | null })?.number;
  return typeof n === 'number' ? n : null;
}

/**
 * Lit la liste des users d'un people field Notion.
 *
 * Notion expose chaque user assigné comme :
 *   { id: <uuid>, name?: string, person?: { email?: string } }
 *
 * On retourne un tableau simplifié pour matcher contre `users` Supabase
 * via `notion_user_id` (priorité 1), `email` (priorité 2) ou nom complet
 * (priorité 3, fallback ancien).
 */
function peopleField(
  prop: unknown
): { id: string; name: string; email: string }[] {
  const arr =
    (
      prop as {
        people?: { id?: string; name?: string; person?: { email?: string } }[];
      }
    )?.people ?? [];
  return arr
    .filter((u) => typeof u.id === 'string' && u.id.length > 0)
    .map((u) => ({
      id: u.id as string,
      name: u.name ?? '',
      email: u.person?.email ?? '',
    }));
}

type NotionPage = { id: string; properties: NotionProps };

async function fetchAllNotionPages(token: string): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`${NOTION_API}/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Notion API ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      results: NotionPage[];
      next_cursor: string | null;
      has_more: boolean;
    };

    results.push(...json.results);
    cursor = json.has_more ? json.next_cursor ?? undefined : undefined;
  } while (cursor);

  return results;
}

/**
 * Authentification :
 *   - `Authorization: Bearer <ADMIN_SYNC_SECRET>` (orchestrateur, curl manuel)
 *   - `Authorization: Bearer <CRON_SECRET>` (Vercel Cron — auto-set)
 *   - OU session Supabase avec un user ayant `users.role = 'admin'`
 *     (bouton Sync dans /admin)
 */
async function authenticate(req: Request): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const authHeader = req.headers.get('authorization') ?? '';

  const adminSecret = process.env.ADMIN_SYNC_SECRET;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return { ok: true };

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return { ok: true };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (me?.role === 'admin') return { ok: true };
    }
  } catch {
    // Continue en 401
  }

  return { ok: false, status: 401, message: 'Unauthorized' };
}

/**
 * Logique partagée entre POST (manuel ou orchestrateur) et GET (cron Vercel).
 *
 * Comportement :
 *   - Lignes Notion qualifiées (statut ≠ "Détecté" + ≠ morts) :
 *       - existantes en DB → UPDATE (préserve notes manuelles, status saisi
 *         à la main, assigned_to, created_by). Resynchronise tous les autres
 *         champs d'enrichissement Notion.
 *       - nouvelles en DB → INSERT (nécessite targetUserId pour created_by ;
 *         status initial calculé depuis Notion via notionStatusToSupabase()).
 *         Pour les fiches NURTURE, le mapping renvoie `archived` : le
 *         prospect est conservé en base avec ce statut, masqué par défaut
 *         côté commercial.
 *   - Lignes Notion mortes (Rejeté, Non pertinent, REJECT, Archivé, Archive)
 *     ou pages absentes de la query Notion mais présentes en DB
 *     (= déplacées hors database / supprimées) → DELETE physique.
 *     NURTURE n'est PAS dans cette liste : ces prospects sont conservés.
 *   - Prospects créés à la main dans /prospects (notion_page_id IS NULL)
 *     ne sont jamais touchés (ni update, ni delete).
 *
 * @param targetUserId UUID du commercial cible (fallback) pour les INSERT
 *                    quand la fiche Notion n'a pas de `Commercial assigné`
 *                    mappable. Si la fiche Notion porte un commercial
 *                    reconnu dans `users` Supabase, son UUID prime sur
 *                    `targetUserId` (cas du bouton Sync CIBLE TOUS).
 */
function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

async function runSync(targetUserId?: string) {
  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) {
    return {
      error: 'NOTION_API_KEY not configured.',
      status: 500 as const,
    };
  }

  let pages: NotionPage[];
  try {
    pages = await fetchAllNotionPages(notionToken);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Notion query failed',
      status: 502 as const,
    };
  }

  const admin = createAdminClient();
  const syncedAt = new Date().toISOString();

  // -------- Lookup dynamique des commerciaux Supabase --------
  // Trois index complémentaires pour matcher le commercial Notion vers
  // l'UUID Supabase, par ordre de priorité :
  //   1. `commercialByNotionId` — Map<notion_user_id, supabase_user_id>
  //      Utilisé en priorité quand la fiche Notion porte un people field
  //      `Commercial assigné`. Source de vérité (les UUID Notion sont
  //      stables, contrairement aux noms qui peuvent varier en accents).
  //   2. `commercialByEmail`    — Map<email, supabase_user_id>
  //      Fallback si l'UUID Notion n'est pas renseigné côté Supabase
  //      mais que Notion expose l'email du user (people.person.email).
  //   3. `commercialByName`     — Map<normalized_name, supabase_user_id>
  //      Fallback ultime + rétrocompat avec l'ancien select Notion.
  //      Reconstruit aussi à partir du préfixe d'email (cas legacy).
  // Aucun hardcoding : tout nouveau commercial ajouté à `users` Supabase
  // (avec son notion_user_id) est auto-mappé sans toucher au code.
  const { data: commercialUsers, error: usersErr } = await admin
    .from('users')
    .select('id, email, full_name, notion_user_id')
    .in('role', ['freelance', 'admin', 'admin_limited']);

  if (usersErr) {
    return {
      error: `Failed to read users for commercial mapping: ${usersErr.message}`,
      status: 500 as const,
    };
  }

  const commercialByNotionId = new Map<string, string>();
  const commercialByEmail = new Map<string, string>();
  const commercialByName = new Map<string, string>();
  for (const u of (commercialUsers ?? []) as {
    id: string;
    email: string | null;
    full_name: string | null;
    notion_user_id: string | null;
  }[]) {
    if (u.notion_user_id) {
      commercialByNotionId.set(u.notion_user_id, u.id);
    }
    if (u.email) {
      commercialByEmail.set(u.email.toLowerCase(), u.id);
    }
    if (u.full_name) {
      commercialByName.set(normalizeName(u.full_name), u.id);
    }
    if (u.email) {
      // Fallback : "hedi.galloub@..." → "hedi galloub"
      const emailLocal = u.email.split('@')[0]?.replace(/[._-]+/g, ' ');
      if (emailLocal) {
        const key = normalizeName(emailLocal);
        if (!commercialByName.has(key)) commercialByName.set(key, u.id);
      }
    }
  }

  let unmappedCommercials = 0;
  const unmappedSamples = new Set<string>();

  // -------- Récupère l'état actuel côté DB pour calculer la diff --------
  const { data: dbRowsRaw, error: dbQueryErr } = await admin
    .from('prospects')
    .select('id, notion_page_id, status')
    .not('notion_page_id', 'is', null);

  if (dbQueryErr) {
    return {
      error: `Failed to read existing prospects: ${dbQueryErr.message}`,
      status: 500 as const,
    };
  }

  const dbByNotionId = new Map<string, { id: string; status: string }>();
  for (const row of dbRowsRaw ?? []) {
    if (!row.notion_page_id) continue;
    dbByNotionId.set(row.notion_page_id, { id: row.id, status: row.status });
  }

  // Page IDs vus côté Notion à ce run
  const seenNotionIds = new Set<string>();
  const deadFromNotion = new Set<string>(); // à supprimer

  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  const errors: { page_id: string; error: string }[] = [];

  // -------- Pass 1 : upserts & collecte des dead --------
  for (const page of pages) {
    seenNotionIds.add(page.id);
    const props = page.properties;

    const statutRaw = selectName(props['statut']);

    if (!statutRaw || NOTION_IGNORED_STATUSES.has(statutRaw)) {
      skipped++;
      continue;
    }

    if (NOTION_DEAD_STATUSES.has(statutRaw)) {
      deadFromNotion.add(page.id);
      continue;
    }

    // ---- Champs fondamentaux ----
    const nomEntreprise = title(props['nom_entreprise']);
    const nomContact = richText(props['nom_contact']);
    const prenomContact = richText(props['prenom_contact']);
    const roleContact = selectName(props['role_contact']);
    const emailDecisionnaire = emailField(props['email_decisionnaire']);
    const emailGenerique = emailField(props['email_generique']);
    const email = emailDecisionnaire || emailGenerique;
    const telephoneDirect = phoneField(props['telephone_direct']);
    const telephoneGenerique = phoneField(props['telephone_generique']);
    const telephone = telephoneDirect || telephoneGenerique;
    const adresse = richText(props['adresse']);
    const secteur = selectName(props['secteur_activite']);
    const siteWeb = urlField(props['site_web']);

    // ---- Social ----
    const instagram = urlField(props['instagram']);
    const facebook = urlField(props['facebook']);
    const linkedinContact = urlField(props['linkedin_contact']);
    const linkedinEntreprise = urlField(props['linkedin_entreprise']);
    const tiktok = urlField(props['tiktok']);

    // ---- Analyses long ----
    const analyseBesoin = richText(props['analyse_besoin']);
    const analyseBudget = richText(props['analyse_budget']);
    const analyseTiming = richText(props['analyse_timing']);
    const recommandationApproche = richText(props['recommandation_approche']);

    // ---- Multi-select ----
    const argumentsCles = multiSelectNames(props['arguments_cles']);
    const besoinsDetectes = multiSelectNames(props['besoins_detectes']);

    // ---- Qualif metadata ----
    const caEstime = selectName(props['ca_estime']);
    const classification = selectName(props['classification']);
    const branche = selectName(props['branche']);
    const noteGoogle = numberField(props['note_google']);
    const nombreAvis = numberField(props['nombre_avis']);
    const tailleEntreprise = selectName(props['taille_entreprise']);
    const nombreEmployes = numberField(props['nombre_employes']);

    const companyName = nomEntreprise || `${prenomContact} ${nomContact}`.trim();
    if (!companyName) {
      skipped++;
      continue;
    }
    const contactName = `${prenomContact} ${nomContact}`.trim() || null;

    // Champs synchronisés à chaque run (UPDATE et INSERT). Notion = source de
    // vérité pour ces champs ; les éditions y sont propagées au sync suivant.
    // NOTE: `status` n'est PAS dans ce payload car il est préservé à l'UPDATE
    // (commercial saisit) et ajouté uniquement à l'INSERT initial ci-dessous.
    const baseFields: Record<string, unknown> = {
      notion_page_id: page.id,
      company_name: companyName,
      contact_name: contactName,
      prenom_contact: prenomContact || null,
      role_contact: roleContact || null,
      email: email || null,
      phone: telephone || null,
      city: adresse || null,
      address: adresse || null,
      sector: secteur || null,
      website: siteWeb || null,
      instagram: instagram || null,
      facebook: facebook || null,
      linkedin_contact: linkedinContact || null,
      linkedin_entreprise: linkedinEntreprise || null,
      tiktok: tiktok || null,
      analyse_besoin: analyseBesoin || null,
      analyse_budget: analyseBudget || null,
      analyse_timing: analyseTiming || null,
      recommandation_approche: recommandationApproche || null,
      arguments_cles: argumentsCles.length ? argumentsCles : null,
      besoins_detectes: besoinsDetectes.length ? besoinsDetectes : null,
      ca_estime: caEstime || null,
      classification: classification || null,
      branche: branche || null,
      note_google: noteGoogle,
      nombre_avis: nombreAvis,
      taille_entreprise: tailleEntreprise || null,
      nombre_employes: nombreEmployes,
      synced_at: syncedAt,
    };

    // Notes générées depuis Notion (legacy concat). Utilisées UNIQUEMENT à
    // l'INSERT pour ne pas écraser ce que les commerciaux ont écrit après dans
    // la plateforme. Les UPDATE conservent intactes les notes existantes.
    // Les détails analytiques sont désormais stockés dans leurs propres
    // colonnes — ce concat reste à titre informatif pour les commerciaux qui
    // utilisent uniquement le panneau "Notes" historique.
    const notionDerivedNotes =
      [
        recommandationApproche
          ? `Recommandation : ${recommandationApproche}`
          : null,
        classification ? `Classification : ${classification}` : null,
        besoinsDetectes.length
          ? `Besoins détectés : ${besoinsDetectes.join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n') || null;

    // Statut initial calculé depuis Notion. Utilisé UNIQUEMENT à l'INSERT —
    // l'UPDATE préserve toujours le status saisi par le commercial sur la
    // plateforme (qui lui-même est propagé vers Notion via /api/prospects/[id]
    // /sync-status-to-notion).
    const initialStatus =
      notionStatusToSupabaseStatus(statutRaw) ?? 'a_contacter';

    const existing = dbByNotionId.get(page.id);

    if (existing) {
      // UPDATE : on ne touche jamais à `notes` ni à `status` (préserve la
      // saisie commerciale). Les autres champs d'enrichissement sont
      // resynchronisés.
      const { error: updateErr } = await admin
        .from('prospects')
        .update(baseFields)
        .eq('id', existing.id);
      if (updateErr) {
        errors.push({ page_id: page.id, error: updateErr.message });
      } else {
        updated++;
      }
    } else {
      // ---- Lecture du commercial assigné côté Notion ----
      // Ordre de priorité (le premier match gagne) :
      //   1. People field `commercial_assigne` → match par notion_user_id
      //      (source de vérité, UUID stable). Si non mappé → on essaie l'email.
      //   2. People field email → match par email Supabase.
      //   3. People field name → match par nom normalisé (rétrocompat).
      //   4. Select Commercial assigné (legacy snake_case ou label avec
      //      accent, fallback pour fiches encore configurées en select).
      //   5. targetUserId du body de la requête (Sync ciblé).

      const peopleAssignees =
        peopleField(props['commercial_assigne']).length > 0
          ? peopleField(props['commercial_assigne'])
          : peopleField(props['Commercial assigné']);

      let assignedTo: string | null = null;
      let unmappedSourceLabel: string | null = null;

      if (peopleAssignees.length > 0) {
        const first = peopleAssignees[0];

        // 1. Match par notion_user_id
        const byNotionId = commercialByNotionId.get(first.id);
        if (byNotionId) {
          assignedTo = byNotionId;
        } else if (first.email) {
          // 2. Match par email
          const byEmail = commercialByEmail.get(first.email.toLowerCase());
          if (byEmail) {
            assignedTo = byEmail;
          }
        }

        // 3. Match par nom (rétrocompat)
        if (!assignedTo && first.name) {
          const byName = commercialByName.get(normalizeName(first.name));
          if (byName) {
            assignedTo = byName;
          }
        }

        if (!assignedTo) {
          unmappedSourceLabel =
            first.name || first.email || `notion_id:${first.id}`;
        }
      } else {
        // 4. Fallback : ancien select (rétrocompat fiches non migrées)
        const commercialNotionName =
          selectName(props['commercial_assigne']) ||
          selectName(props['Commercial assigné']);

        if (commercialNotionName) {
          const matched = commercialByName.get(
            normalizeName(commercialNotionName)
          );
          if (matched) {
            assignedTo = matched;
          } else {
            unmappedSourceLabel = commercialNotionName;
          }
        }
      }

      if (unmappedSourceLabel) {
        unmappedCommercials++;
        unmappedSamples.add(unmappedSourceLabel);
        console.warn(
          `[sync-prospects] Commercial Notion "${unmappedSourceLabel}" introuvable dans users Supabase (page ${page.id}). Vérifie users.notion_user_id / users.email / users.full_name.`
        );
      }

      // 5. Fallback sur targetUserId du body si Notion vide ou non mappable.
      if (!assignedTo) assignedTo = targetUserId ?? null;

      if (!assignedTo) {
        // Ni Notion ni body ne fournissent de cible → on ne peut pas créer
        // un prospect orphelin (created_by NOT NULL). On skip.
        skipped++;
        continue;
      }

      const { error: insertErr } = await admin.from('prospects').insert({
        ...baseFields,
        notes: notionDerivedNotes,
        status: initialStatus,
        created_by: targetUserId ?? assignedTo,
        assigned_to: assignedTo,
      });
      if (insertErr) {
        errors.push({ page_id: page.id, error: insertErr.message });
      } else {
        inserted++;
      }
    }
  }

  // -------- Pass 2 : DELETE physique --------
  // 1) Lignes DB dont le notion_page_id n'a PAS été vu ce run
  //    (= prospect déplacé hors database Notion ou supprimé)
  // 2) Lignes DB dont la page Notion est en statut "mort"
  //    (Rejeté, Non pertinent, REJECT, Archivé, Archive). NURTURE est
  //    volontairement absent : les prospects en NURTURE sont conservés
  //    en base avec status='archived' (cf. mapping status-mapping.ts).
  //
  // Les prospects manuels (notion_page_id IS NULL) sont préservés grâce au
  // filtre `.not('notion_page_id', 'is', null)` au moment de la lecture.
  const toDeleteIds = new Set<string>();
  for (const [notionId, row] of dbByNotionId.entries()) {
    if (!seenNotionIds.has(notionId)) toDeleteIds.add(row.id);
    else if (deadFromNotion.has(notionId)) toDeleteIds.add(row.id);
  }

  if (toDeleteIds.size > 0) {
    const ids = [...toDeleteIds];
    const { error: deleteErr } = await admin
      .from('prospects')
      .delete()
      .in('id', ids);
    if (deleteErr) {
      errors.push({
        page_id: `delete:${ids.length}`,
        error: deleteErr.message,
      });
    } else {
      deleted = ids.length;
    }
  }

  return {
    total: pages.length,
    inserted,
    updated,
    deleted,
    skipped,
    errors,
    unmapped_commercials: unmappedCommercials,
    unmapped_commercial_samples: [...unmappedSamples].slice(0, 5),
  };
}

/**
 * POST /api/admin/sync-prospects
 *
 * Sync manuelle Notion → Supabase (bouton dans /admin ou orchestrateur curl).
 *
 * Body : { user_id?: string } — UUID du commercial cible pour les INSERT.
 */
export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: { user_id?: string } = {};
  try {
    body = (await req.json()) as { user_id?: string };
  } catch {
    // body vide toléré
  }

  const result = await runSync(body.user_id);
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json(result);
}

/**
 * GET /api/admin/sync-prospects
 *
 * Sync automatique déclenchée par Vercel Cron (vercel.json).
 * Vercel ajoute automatiquement `Authorization: Bearer ${CRON_SECRET}` quand
 * `CRON_SECRET` est défini en env var.
 *
 * Pas de user_id transmis → les nouveaux prospects Notion non encore
 * synchronisés sont skipped. L'admin doit cliquer le bouton manuel pour
 * les onboarder avec un commercial cible. Les UPDATE et DELETE eux
 * tournent automatiquement.
 */
export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const result = await runSync();
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json(result);
}
