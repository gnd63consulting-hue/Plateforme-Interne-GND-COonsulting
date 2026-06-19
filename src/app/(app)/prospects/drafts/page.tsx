import { createClient } from '@/lib/supabase-server';
import { DRAFT_SELECT_COLUMNS, type DraftRow } from '@/lib/prospect-draft';
import DraftReviewClient from './DraftReviewClient';

export const dynamic = 'force-dynamic';

/**
 * Ecran "Drafts a valider". Lit prospect_draft (RLS admin) + le nom du prospect
 * lie + l'URL de sa maquette si elle existe (site_mockups). La validation
 * humaine est obligatoire avant tout envoi.
 */
export default async function DraftsPage() {
  const supabase = await createClient();

  const { data: drafts } = await supabase
    .from('prospect_draft')
    .select(DRAFT_SELECT_COLUMNS)
    .order('updated_at', { ascending: false });

  const list = (drafts ?? []) as Omit<DraftRow, 'prospect' | 'mockup_url'>[];
  const ids = Array.from(new Set(list.map((d) => d.prospect_id)));

  const { data: prospects } = ids.length
    ? await supabase
        .from('prospects')
        .select('id, company_name, contact_name, prenom_contact')
        .in('id', ids)
    : { data: [] as DraftRow['prospect'][] };

  const { data: mockups } = ids.length
    ? await supabase
        .from('site_mockups')
        .select('prospect_id, preview_url, updated_at')
        .in('prospect_id', ids)
        .not('preview_url', 'is', null)
        .order('updated_at', { ascending: false })
    : { data: [] as { prospect_id: string | null; preview_url: string | null }[] };

  const nameById = new Map((prospects ?? []).map((p) => [p!.id, p]));
  const mockupByProspect = new Map<string, string>();
  for (const m of mockups ?? []) {
    if (m.prospect_id && m.preview_url && !mockupByProspect.has(m.prospect_id)) {
      mockupByProspect.set(m.prospect_id, m.preview_url);
    }
  }

  const rows: DraftRow[] = list.map((d) => ({
    ...d,
    prospect: (nameById.get(d.prospect_id) as DraftRow['prospect']) ?? null,
    mockup_url: mockupByProspect.get(d.prospect_id) ?? null,
  }));

  return <DraftReviewClient rows={rows} />;
}
