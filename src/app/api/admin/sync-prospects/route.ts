import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const NOTION_DB_ID =
  process.env.NOTION_PROSPECTS_DB_ID ?? 'cc69ef03-abfa-487e-b392-0f308a30f404';
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

type ProspectStatut =
  | 'a_contacter'
  | 'contacte'
  | 'rdv_pris'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu';

// Mapping statuts Notion → statuts plateforme
const STATUS_MAP: Record<string, ProspectStatut> = {
  Qualifié: 'a_contacter',
  Scoré: 'a_contacter',
  GO: 'a_contacter',
  Contacté: 'contacte',
  'Email envoyé': 'contacte',
  'Email généré': 'contacte',
  'RDV réservé': 'rdv_pris',
  'RDV réalisé': 'rdv_pris',
  'Transféré vente': 'devis_envoye',
  Opportunité: 'devis_envoye',
  Gagné: 'gagne',
  Perdu: 'perdu',
  'Non pertinent': 'perdu',
  Rejeté: 'perdu',
  REJECT: 'perdu',
};

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
 * POST /api/admin/sync-prospects
 *
 * Headers : Authorization: Bearer <ADMIN_SYNC_SECRET>
 * Body    : { user_id?: string } — si fourni, les prospects sont assignés
 *           à ce commercial (à utiliser quand l'admin dispatche le pipeline).
 *
 * Upsert idempotent sur `notion_page_id`. Ne touche ni aux notes ni au
 * statut des prospects créés manuellement par le commercial (ils n'ont
 * pas de notion_page_id).
 */
export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SYNC_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SYNC_SECRET not configured on the server.' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { page_id: string; error: string }[] = [];

  for (const page of pages) {
    const props = page.properties;

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
    const statutRaw = selectName(props['statut']);
    const secteur = selectName(props['secteur_activite']);
    const siteWeb = urlField(props['site_web']);
    const classification = selectName(props['classification']);
    const recommandation = richText(props['recommandation_approche']);
    const besoins = multiSelectNames(props['besoins_detectes']).join(', ');

    // On ne sync pas les prospects non qualifiés (Notion statut "Détecté"
    // ou vide) — ils ne sont pas prêts pour le terrain.
    if (!statutRaw || statutRaw === 'Détecté') {
      skipped++;
      continue;
    }

    // Schéma prod : company_name NOT NULL → on garantit une valeur.
    const companyName = nomEntreprise || `${prenomContact} ${nomContact}`.trim();
    if (!companyName) {
      skipped++;
      continue;
    }
    const contactName = `${prenomContact} ${nomContact}`.trim() || null;

    // Payload aligné sur le schéma EN réel de la prod :
    // company_name (NN), contact_name, email, phone, city, sector, website, notes,
    // notion_page_id, synced_at. `status` est volontairement omis pour laisser
    // Postgres appliquer la DEFAULT 'prospecte' sur INSERT et ne pas écraser
    // le statut saisi par un humain sur UPDATE (on ne connaît pas l'univers
    // des valeurs du CHECK prod côté Notion → mapping dangereux ici).
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

    // Sur INSERT uniquement on fixe created_by (NOT NULL) et assigned_to.
    // En UPDATE on ne touche pas à ces deux colonnes — l'assignation reste
    // la propriété de l'admin et ne doit pas être réécrite par la sync.
    const { data: existing, error: lookupErr } = await admin
      .from('prospects')
      .select('id')
      .eq('notion_page_id', page.id)
      .maybeSingle();

    if (lookupErr) {
      errors.push({ page_id: page.id, error: lookupErr.message });
      continue;
    }

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

  return NextResponse.json({
    total: pages.length,
    inserted,
    updated,
    skipped,
    errors,
  });
}
