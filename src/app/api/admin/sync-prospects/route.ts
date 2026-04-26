import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const NOTION_DB_ID =
  process.env.NOTION_PROSPECTS_DB_ID ?? 'cc69ef03-abfa-487e-b392-0f308a30f404';
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/** Statuts Notion considérés comme « morts » (rejet / archivage). */
const NOTION_DEAD_STATUSES = new Set([
  'Rejeté',
  'Non pertinent',
  'REJECT',
  'Archivé',
  'Archive',
  'NURTURE',
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
 *       - existantes en DB → UPDATE (préserve notes manuelles, assigned_to,
 *         status saisi à la main, created_by). Resynchronise tous les autres
 *         champs d'enrichissement Notion.
 *       - nouvelles en DB → INSERT (nécessite targetUserId pour created_by)
 *   - Lignes Notion mortes (Rejeté, Non pertinent, REJECT, Archivé, Archive,
 *     NURTURE) ou pages absentes de la query Notion mais présentes en DB
 *     (= déplacées hors database / supprimées) → DELETE physique.
 *   - Prospects créés à la main dans /prospects (notion_page_id IS NULL)
 *     ne sont jamais touchés (ni update, ni delete).
 *
 * @param targetUserId UUID du commercial cible pour les INSERT (optionnel).
 *                    Si non fourni, les nouveaux prospects sont skipped et
 *                    seront onboardés au prochain clic manuel admin.
 */
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

    const existing = dbByNotionId.get(page.id);

    if (existing) {
      // UPDATE : on ne touche jamais à `notes` (préserve la saisie commerciale).
      // Les autres champs d'enrichissement sont resynchronisés.
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
      if (!targetUserId) {
        // Pas de cible → on ne peut pas créer un prospect orphelin
        // (created_by NOT NULL). On skip et on le signale.
        skipped++;
        continue;
      }
      const { error: insertErr } = await admin.from('prospects').insert({
        ...baseFields,
        notes: notionDerivedNotes,
        created_by: targetUserId,
        assigned_to: targetUserId,
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
  //    (Rejeté, Non pertinent, REJECT, Archivé, Archive, NURTURE)
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
