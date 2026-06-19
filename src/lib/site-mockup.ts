/**
 * Types et helpers pour les maquettes de site generees par Dedale (Studio)
 * dans `public.site_mockups`. Le site est deploye sur Vercel ; `preview_url`
 * est l'URL publique. Lisible par les authentifies (RLS 0035) pour la galerie
 * et le lien dans les Drafts.
 */

export type MockupStatus = 'draft' | 'published' | 'archived';

export type MockupRow = {
  id: string;
  prospect_id: string | null;
  brief_id: string | null;
  slug: string;
  sector: string | null;
  title: string | null;
  status: MockupStatus | string;
  preview_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const MOCKUP_SELECT_COLUMNS =
  'id, prospect_id, brief_id, slug, sector, title, status, preview_url, created_by, created_at, updated_at';

export function mockupStatusLabel(s?: string | null): string {
  switch (s) {
    case 'draft':
      return 'Brouillon';
    case 'published':
      return 'Publiee';
    case 'archived':
      return 'Archivee';
    default:
      return s ?? '--';
  }
}

export function mockupStatusTone(s?: string | null): string {
  switch (s) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700';
    case 'archived':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}
