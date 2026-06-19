/**
 * Types et helpers pour la bibliotheque d'inspiration du Studio
 * (`public.design_references`). References dont Metis (structures) et Dedale
 * (composants) s'inspirent. Admin-gere ; les agents la lisent cote VPS.
 */

export type DesignRefKind = 'gnd_site' | 'external_ref';

export type DesignRefRow = {
  id: string;
  name: string;
  kind: DesignRefKind | string;
  url: string | null;
  repo_url: string | null;
  sector: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
};

export const DESIGN_REF_SELECT =
  'id, name, kind, url, repo_url, sector, tags, notes, created_at';

export function kindLabel(k?: string | null): string {
  switch (k) {
    case 'gnd_site':
      return 'Site GND';
    case 'external_ref':
      return 'Reference externe';
    default:
      return k ?? '--';
  }
}

export function kindTone(k?: string | null): string {
  switch (k) {
    case 'gnd_site':
      return 'bg-brand-pale text-brand-dark';
    case 'external_ref':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}
