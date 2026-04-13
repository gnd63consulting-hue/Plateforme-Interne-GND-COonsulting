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
 *   - `Authorization: Bearer <ADMIN_SYNC_SECRET>` (orchestrateur, curl)
 *   - OU session Supabase avec un user ayant `users.role = 'admin'`
 *     (bouton Sync dans /admin)
 */
async function authenticate(req: Request): Promise<
  | { ok: true }
  | { ok: false; status: number; message: string }
> {
  const adminSecret = process.env.ADMIN_SYNC_SECRET;
  if (adminSecret) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader === `Bearer ${adminSecret}`) return { ok: true };
  }

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
 * POST /api/admin/sync-prospects
 *
 * Sync bidirectionnelle Notion → Supabase.
 *
 * Comportement :
 *   - Lignes Notion qualifiées (statut ≠ "Détecté" + ≠ morts) :
 *       - existantes en DB → UPDATE (préserve notes manuelles, assigned_to,
 *         status saisi à la main, created_by)
 *       - nouvelles en DB → INSERT (nécessite body.user_id pour created_by)
 *   - Lignes Notion mortes (Rejeté, Non pertinent, Archivé) ou pages
 *     supprimées de Notion mais présentes en DB → UPDATE status='archived'.
 *   - Prospects créés à la main dans /prospects (notion_page_id IS NULL)
 *     ne sont jamais touchés.
 *
 * Body : { user_id?: string } — UUID du commercial cible pour les INSERT.
 */
export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY not configured.' },
      { status: 500 }
    );
  }

  let body: { user_id?: string } = {};
  try {
    body = (await req.json()) as { user_id?: string };
  } catch {
    // body vide toléré
  }
  const targetUserId = body.user_id;

  let pages: NotionPage[];
  try {
    pages = await fetchAllNotionPages(notionToken);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Notion query failed' },
      { status: 502 }
    );
  }

  const admin = createAdminClient();
  const syncedAt = new Date().toISOString();

  // -------- Récupère l'état actuel côté DB pour calculer la diff --------
  const { data: dbRowsRaw, error: dbQueryErr } = await admin
    .from('prospects')
    .select('id, notion_page_id, status')
    .not('notion_page_id', 'is', null);

  if (dbQueryErr) {
    return NextResponse.json(
      { error: `Failed to read existing prospects: ${dbQueryErr.message}` },
      { status: 500 }
    );
  }

  const dbByNotionId = new Map<string, { id: string; status: string }>();
  for (const row of dbRowsRaw ?? []) {
    if (!row.notion_page_id) continue;
    dbByNotionId.set(row.notion_page_id, { id: row.id, status: row.status });
  }

  // Page IDs vus côté Notion à ce run
  const seenNotionIds = new Set<string>();
  const deadFromNotion = new Set<string>(); // à archiver

  let inserted = 0;
  let updated = 0;
  let archived = 0;
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

    const nomEntreprise = title(props['nom_entreprise']);
    const nomContact = richText(props['nom_contact']);
    const prenomContact = richText(props['prenom_contact']);
    const email =
      emailField(props['email_decisionnaire']) ||
      emailField(props['email_generique']);
    const telephone =
      phoneField(props['telephone_direct']) ||
      phoneField(props['telephone_generique']);
    const adresse = richText(props['adresse']);
    const secteur = selectName(props['secteur_activite']);
    const siteWeb = urlField(props['site_web']);
    const classification = selectName(props['classification']);
    const recommandation = richText(props['recommandation_approche']);
    const besoins = multiSelectNames(props['besoins_detectes']).join(', ');

    const companyName = nomEntreprise || `${prenomContact} ${nomContact}`.trim();
    if (!companyName) {
      skipped++;
      continue;
    }
    const contactName = `${prenomContact} ${nomContact}`.trim() || null;

    const payload: Record<string, unknown> = {
      notion_page_id: page.id,
      company_name: companyName,
      contact_name: contactName,
      email: email || null,
      phone: telephone || null,
      city: adresse || null,
      sector: secteur || null,
      website: siteWeb || null,
      notes: [
        recommandation ? `Recommandation : ${recommandation}` : null,
        classification ? `Classification : ${classification}` : null,
        besoins ? `Besoins détectés : ${besoins}` : null,
      ]
        .filter(Boolean)
        .join('\n\n') || null,
      synced_at: syncedAt,
    };

    const existing = dbByNotionId.get(page.id);

    if (existing) {
      const { error: updateErr } = await admin
        .from('prospects')
        .update(payload)
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
        ...payload,
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

  // -------- Pass 2 : archivage --------
  // 1) Lignes DB dont le notion_page_id n'a PAS été vu ce run.
  // 2) Lignes DB dont la page Notion est en statut "mort".
  const toArchiveIds = new Set<string>();
  for (const [notionId, row] of dbByNotionId.entries()) {
    if (row.status === 'archived') continue; // déjà archivé
    if (!seenNotionIds.has(notionId)) toArchiveIds.add(row.id);
    else if (deadFromNotion.has(notionId)) toArchiveIds.add(row.id);
  }

  if (toArchiveIds.size > 0) {
    const ids = [...toArchiveIds];
    const { error: archiveErr } = await admin
      .from('prospects')
      .update({ status: 'archived', synced_at: syncedAt })
      .in('id', ids);
    if (archiveErr) {
      errors.push({
        page_id: `archive:${ids.length}`,
        error: archiveErr.message,
      });
    } else {
      archived = ids.length;
    }
  }

  return NextResponse.json({
    total: pages.length,
    inserted,
    updated,
    archived,
    skipped,
    errors,
  });
}
