/**
 * Types et helpers pour les brouillons d'approche ecrits par les agents (Nyx)
 * dans `public.prospect_draft` (migration 0025).
 *
 * Cloisonnement : aucune donnee financiere ici. Lecture/ecriture par l'admin
 * via la policy `prospect_draft_admin_all` (0025). La validation humaine est
 * obligatoire : un draft ne part jamais sans passer 'ready' puis 'sent'.
 */

export type DraftStatus = 'draft' | 'ready' | 'sent' | 'discarded';
export type DraftChannel = 'email' | 'linkedin' | 'sms';

export type ProspectInfo = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  prenom_contact: string | null;
};

export type DraftRow = {
  id: string;
  prospect_id: string;
  channel: DraftChannel | string;
  subject: string | null;
  body: string | null;
  status: DraftStatus | string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  prospect: ProspectInfo | null;
  mockup_url?: string | null;
};

export const DRAFT_SELECT_COLUMNS =
  'id, prospect_id, channel, subject, body, status, created_by, created_at, updated_at';

export function statusLabel(s?: string | null): string {
  switch (s) {
    case 'draft':
      return 'A valider';
    case 'ready':
      return 'Valide';
    case 'sent':
      return 'Envoye';
    case 'discarded':
      return 'Rejete';
    default:
      return s ?? '--';
  }
}

export function statusTone(s?: string | null): string {
  switch (s) {
    case 'draft':
      return 'bg-amber-100 text-amber-800';
    case 'ready':
      return 'bg-emerald-100 text-emerald-700';
    case 'sent':
      return 'bg-sky-100 text-sky-700';
    case 'discarded':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function channelLabel(c?: string | null): string {
  switch (c) {
    case 'email':
      return 'Email';
    case 'linkedin':
      return 'LinkedIn';
    case 'sms':
      return 'SMS';
    default:
      return c ?? '--';
  }
}

export function prospectDisplay(p?: ProspectInfo | null): string {
  if (!p) return 'Prospect inconnu';
  return p.company_name || p.contact_name || p.prenom_contact || 'Sans nom';
}
