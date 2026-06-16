import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { notionStatusToSupabaseStatus } from '@/lib/status-mapping';

export const dynamic = 'force-dynamic';

const NOTION_DB_ID =
  process.env.NOTION_PROSPECTS_DB_ID ?? 'cc69ef03-abfa-487e-b392-0f308a30f404';
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const ROUTE = '/api/admin/sync-prospects';

/**
 * Alerte de MISCONFIG : ce endpoint accepte aussi un déclenchement cron Vercel
 * (GET avec Bearer CRON_SECRET) et un déclenchement orchestrateur (Bearer
 * ADMIN_SYNC_SECRET). Si NI l'un NI l'autre n'est posé en env, ces appels
 * machine renverront 401 en permanence (le bouton Sync admin avec session
 * Supabase, lui, continue de marcher). On rend le cas bruyant dans les logs
 * (distinct d'un 401 d'appel non autorisé légitime) pour qu'un secret oublié
 * soit détectable.
 */
function warnIfNoCronSecretConfigured(): void {
  if (!process.env.CRON_SECRET && !process.env.ADMIN_SYNC_SECRET) {
    console.error(
      `[cron][MISCONFIG] ${ROUTE}: no CRON_SECRET/ADMIN_SYNC_SECRET set — cron will 401 forever`
    );
  }
}

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
 * Modèle de propriété des données (PLATEFORME = SOURCE DE VÉRITÉ) :
 *   La plateforme Supabase est désormais le master ; Notion n'est qu'un canal
 *   d'INTAKE (saisie initiale). En conséquence :
 *
 *   - Lignes Notion qualifiées (statut ≠ "Détecté" + ≠ morts) :
 *       - NOUVELLES en DB → INSERT (import UNIQUE). On pose `notion_page_id`
 *         (clé de match stable) + tous les champs d'enrichissement Notion +
 *         status initial + assigned_to. Après cet INSERT, l'UUID Supabase est
 *         le `prospect_id` canonique. Le match futur se fait par
 *         `notion_page_id` (colonne UNIQUE, déjà présente) — aucune réécriture
 *         dans Notion n'est nécessaire pour stabiliser le match.
 *
 *         GARDE ANTI-DOUBLON (sprint dédup 2026-06-16) : avant l'INSERT, on
 *         vérifie qu'aucun prospect au MÊME nom d'entreprise normalisé
 *         n'existe déjà (en DB OU inséré plus tôt dans CE run). Si un homonyme
 *         existe, on NE crée PAS de seconde fiche :
 *           - si l'homonyme n'a pas encore de `notion_page_id`, on le BACKFILL
 *             avec cette page (les syncs futures matcheront l'existant par
 *             `notion_page_id` → plus jamais de doublon créé) ;
 *           - sinon (homonyme déjà rattaché à une AUTRE page Notion), on skip
 *             simplement l'INSERT (`skippedDuplicate`).
 *         Dans les deux cas on NE TOUCHE PAS `assigned_to` / `status` /
 *         `notes` de l'existant (la plateforme reste master de la propriété).
 *         C'est la version permanente du correctif : la cause racine du
 *         doublon (2 lignes Notion homonymes → 2 fiches, 2 commerciaux) ne
 *         peut plus se reproduire.
 *       - EXISTANTES en DB → UPDATE NON DESTRUCTIF. On ne RÉÉCRIT JAMAIS une
 *         valeur saisie/éditée côté plateforme : on se contente de COMBLER les
 *         champs encore NULL/vides en DB avec la valeur Notion (Notion comble
 *         les trous, la plateforme gagne toujours sur une valeur non nulle).
 *         `assigned_to`, `status`/`statut`, `notes` ne sont jamais dans le
 *         payload d'UPDATE → toujours préservés. C'est ce qui corrige le bug
 *         connu « les éditions admin (email/téléphone/classification/secteur…)
 *         repartaient au sync 6h suivant » : avant, l'UPDATE écrasait en bloc
 *         tous les `baseFields` avec les valeurs Notion.
 *   - Lignes Notion mortes ou pages absentes de la query → DELETE physique.
 *   - Prospects créés à la main dans /prospects (notion_page_id IS NULL)
 *     ne sont jamais touchés (ni update, ni delete) — SAUF backfill du
 *     notion_page_id ci-dessus s'ils sont l'homonyme retenu (on rattache la
 *     fiche manuelle au lead Notion plutôt que d'en créer un doublon).
 *
 * Suivi (follow-up, hors scope de ce sprint) : si un token d'écriture Notion
 * devient disponible, on pourra réécrire l'UUID Supabase canonique dans la
 * propriété `prospect_id` de la ligne Notion. Ce n'est PAS requis pour la
 * stabilité du match (assurée par `notion_page_id`) — purement informatif côté
 * Notion. Aucune capacité d'écriture Notion n'existe dans le codebase
 * actuellement, donc on ne l'invente pas.
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

/**
 * Colonnes d'enrichissement « comblables » lues sur la ligne DB existante pour
 * calculer le diff non destructif de l'UPDATE. Doit rester aligné avec les clés
 * de `enrichmentFields` ci-dessous (hors clés techniques `notion_page_id` /
 * `synced_at` qui sont gérées à part).
 */
const FILLABLE_COLUMNS = [
  'company_name',
  'contact_name',
  'prenom_contact',
  'role_contact',
  'email',
  'phone',
  'city',
  'address',
  'sector',
  'website',
  'instagram',
  'facebook',
  'linkedin_contact',
  'linkedin_entreprise',
  'tiktok',
  'analyse_besoin',
  'analyse_budget',
  'analyse_timing',
  'recommandation_approche',
  'arguments_cles',
  'besoins_detectes',
  'ca_estime',
  'classification',
  'branche',
  'note_google',
  'nombre_avis',
  'taille_entreprise',
  'nombre_employes',
] as const;

/**
 * Une valeur DB est « vide » (donc comblable par Notion) si elle est null,
 * undefined, chaîne vide/espaces, ou tableau vide. Toute autre valeur est
 * considérée comme une donnée plateforme à préserver.
 */
function isEmptyDbValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Une valeur Notion candidate au comblement doit elle-même porter de
 * l'information (sinon comblement inutile / on ne « remplit » pas un trou par
 * un autre trou).
 */
function hasNotionValue(v: unknown): boolean {
  return !isEmptyDbValue(v);
}

type DbProspectRow = {
  id: string;
  notion_page_id: string | null;
  status: string;
} & Record<string, unknown>;

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
  // On lit désormais TOUTES les colonnes comblables (pas seulement id/status) :
  // l'UPDATE non destructif a besoin de connaître quels champs sont déjà
  // remplis côté plateforme pour ne combler QUE les trous (cf. FILLABLE_COLUMNS
  // + le diff plus bas). `select('*')` reste sûr ici : la table prospects ne
  // porte plus de colonne financière (deal_amount déplacé dans
  // prospect_finance, cf. migration 0021) — aucun montant ne transite par ce
  // service-role read.
  const { data: dbRowsRaw, error: dbQueryErr } = await admin
    .from('prospects')
    .select('*')
    .not('notion_page_id', 'is', null);

  if (dbQueryErr) {
    return {
      error: `Failed to read existing prospects: ${dbQueryErr.message}`,
      status: 500 as const,
    };
  }

  const dbByNotionId = new Map<string, DbProspectRow>();
  for (const row of (dbRowsRaw ?? []) as DbProspectRow[]) {
    if (!row.notion_page_id) continue;
    dbByNotionId.set(row.notion_page_id, row);
  }

  // -------- Index anti-doublon par nom d'entreprise normalisé --------
  // Garde permanente contre la cause racine du bug doublon : deux lignes Notion
  // homonymes (même société) qui, importées 1:1 par notion_page_id, créaient
  // DEUX fiches prospects pour la même entreprise (souvent 2 commerciaux).
  //
  // On lit TOUTE la table prospects (pas seulement les lignes Notion) car un
  // homonyme peut être une fiche créée manuellement (notion_page_id NULL) :
  // dans ce cas on préfère RATTACHER le lead Notion à la fiche manuelle
  // (backfill du notion_page_id) plutôt qu'en créer un doublon.
  //
  // `companyNameIndex` : Map<nom_normalisé, { id, notion_page_id }>. On garde
  // le PREMIER rencontré par nom (stable, suffisant pour décider backfill vs
  // skip). Les fiches sans nom (company_name vide) sont ignorées : elles ne
  // doivent jamais provoquer de faux positif de doublon.
  const { data: allNameRows, error: nameQueryErr } = await admin
    .from('prospects')
    .select('id, company_name, notion_page_id');

  if (nameQueryErr) {
    return {
      error: `Failed to read prospects for dedup index: ${nameQueryErr.message}`,
      status: 500 as const,
    };
  }

  const companyNameIndex = new Map<
    string,
    { id: string; notion_page_id: string | null }
  >();
  for (const row of (allNameRows ?? []) as {
    id: string;
    company_name: string | null;
    notion_page_id: string | null;
  }[]) {
    const key = normalizeName(row.company_name ?? '');
    if (!key) continue;
    if (!companyNameIndex.has(key)) {
      companyNameIndex.set(key, {
        id: row.id,
        notion_page_id: row.notion_page_id,
      });
    }
  }

  // Page IDs vus côté Notion à ce run
  const seenNotionIds = new Set<string>();
  const deadFromNotion = new Set<string>(); // à supprimer

  let inserted = 0;
  let updated = 0;
  let skippedNoFill = 0; // existants déjà complets → aucun trou à combler
  let skippedDuplicate = 0; // homonyme déjà présent → pas de seconde fiche
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

    // Champs d'enrichissement Notion. À l'INSERT : tous écrits tels quels.
    // À l'UPDATE : utilisés UNIQUEMENT pour combler les colonnes encore vides
    // côté plateforme (jamais d'écrasement d'une valeur non nulle). Notion =
    // intake, la plateforme reste master.
    // NOTE: `status`, `notes`, `assigned_to` ne sont PAS ici → toujours
    // préservés à l'UPDATE.
    const enrichmentFields: Record<string, unknown> = {
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
      // UPDATE NON DESTRUCTIF : on ne touche jamais à `notes`, `status` ni
      // `assigned_to` (préserve la saisie commerciale/admin). Pour les champs
      // d'enrichissement, on ne réécrit QUE ceux qui sont encore vides en DB —
      // Notion comble les trous, la plateforme gagne sur toute valeur non nulle.
      // C'est le correctif du bug « les éditions admin repartent au sync 6h ».
      const fillUpdate: Record<string, unknown> = {};
      for (const col of FILLABLE_COLUMNS) {
        if (
          isEmptyDbValue(existing[col]) &&
          hasNotionValue(enrichmentFields[col])
        ) {
          fillUpdate[col] = enrichmentFields[col];
        }
      }

      // Rien à combler → on n'écrit même pas `synced_at` pour éviter de
      // déclencher le trigger d'audit / le trigger updated_at inutilement.
      if (Object.keys(fillUpdate).length === 0) {
        skippedNoFill++;
        continue;
      }

      // On marque le passage de sync uniquement quand on a effectivement
      // comblé quelque chose.
      fillUpdate.synced_at = syncedAt;

      const { error: updateErr } = await admin
        .from('prospects')
        .update(fillUpdate)
        .eq('id', existing.id);
      if (updateErr) {
        errors.push({ page_id: page.id, error: updateErr.message });
      } else {
        updated++;
      }
    } else {
      // ====================================================================
      // GARDE ANTI-DOUBLON (avant tout INSERT d'un nouveau lead Notion).
      // ====================================================================
      // Cause racine du bug : 2 lignes Notion homonymes (même société, parfois
      // 2 commerciaux) → 2 fiches prospects. On l'élimine ICI, de façon
      // permanente : si une fiche au MÊME nom d'entreprise normalisé existe
      // déjà (en DB OU insérée plus tôt dans CE run via `companyNameIndex`),
      // on NE crée PAS de seconde fiche.
      //   - Si l'existant n'a pas encore de notion_page_id → on le BACKFILL
      //     avec cette page (fill-null-only). Les syncs suivantes matcheront
      //     alors l'existant par notion_page_id (branche `existing` ci-dessus)
      //     → plus jamais de doublon. On ne touche ni assigned_to, ni status,
      //     ni notes.
      //   - Si l'existant a DÉJÀ un autre notion_page_id → on skip l'INSERT
      //     (skippedDuplicate) sans rien modifier (pas de changement de
      //     propriété).
      const nameKey = normalizeName(companyName);
      const dupExisting = nameKey ? companyNameIndex.get(nameKey) : undefined;

      if (dupExisting) {
        if (dupExisting.notion_page_id === null) {
          // Backfill fill-null-only du notion_page_id sur l'homonyme existant.
          // Le filtre `.is('notion_page_id', null)` garantit qu'on n'écrase
          // jamais un rattachement déjà posé (course concurrente / idempotence).
          const { error: backfillErr } = await admin
            .from('prospects')
            .update({ notion_page_id: page.id })
            .eq('id', dupExisting.id)
            .is('notion_page_id', null);
          if (backfillErr) {
            errors.push({ page_id: page.id, error: backfillErr.message });
          } else {
            // L'index pointe désormais sur cette page (le lead est rattaché).
            companyNameIndex.set(nameKey, {
              id: dupExisting.id,
              notion_page_id: page.id,
            });
            skippedDuplicate++;
          }
        } else {
          // Homonyme déjà rattaché à une autre page Notion → pas de 2e fiche.
          skippedDuplicate++;
        }
        continue;
      }

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
      //    NOTE (pool admin) : sur le run cron 6h, `targetUserId` est undefined.
      //    Une fiche Notion sans commercial mappable est donc SKIPPÉE (pas
      //    d'auto-assignation arbitraire à un commercial) → elle reste
      //    disponible pour le pool d'attribution admin, qui l'onboarde via le
      //    bouton Sync ciblé (targetUserId fourni). On NE réintroduit donc PAS
      //    le bug « auto-assign à l'INSERT vide le pool admin ».
      if (!assignedTo) assignedTo = targetUserId ?? null;

      if (!assignedTo) {
        // Ni Notion ni body ne fournissent de cible → on ne peut pas créer
        // un prospect orphelin (created_by NOT NULL). On skip.
        skipped++;
        continue;
      }

      const { data: insertedRow, error: insertErr } = await admin
        .from('prospects')
        .insert({
          ...enrichmentFields,
          notion_page_id: page.id,
          synced_at: syncedAt,
          notes: notionDerivedNotes,
          status: initialStatus,
          created_by: targetUserId ?? assignedTo,
          assigned_to: assignedTo,
        })
        .select('id')
        .maybeSingle();
      if (insertErr) {
        errors.push({ page_id: page.id, error: insertErr.message });
      } else {
        inserted++;
        // Indexe le nouveau prospect par nom : les pages SUIVANTES de CE run
        // portant le même nom d'entreprise ne créeront pas de doublon (elles
        // seront rattachées/skippées par la garde ci-dessus). Couvre le cas
        // « deux leads Notion homonymes dans le même sync ».
        const newId = (insertedRow as { id?: string } | null)?.id;
        if (nameKey && newId) {
          companyNameIndex.set(nameKey, {
            id: newId,
            notion_page_id: page.id,
          });
        }
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
    skipped_no_fill: skippedNoFill,
    skipped_duplicate: skippedDuplicate,
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
  warnIfNoCronSecretConfigured();
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

  try {
    const result = await runSync(body.user_id);
    if ('error' in result) {
      console.error(`[cron][ERROR] ${ROUTE}: ${result.error}`);
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error(`[cron][ERROR] ${ROUTE}: ${message}`);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
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
 * les onboarder avec un commercial cible. Les UPDATE (comblement non
 * destructif) et DELETE eux tournent automatiquement.
 */
export async function GET(req: Request) {
  warnIfNoCronSecretConfigured();
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const result = await runSync();
    if ('error' in result) {
      console.error(`[cron][ERROR] ${ROUTE}: ${result.error}`);
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error(`[cron][ERROR] ${ROUTE}: ${message}`);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
