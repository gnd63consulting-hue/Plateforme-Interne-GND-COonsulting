/**
 * Types et helpers pour les prospects — schéma EN de prod.
 *
 * La table `public.prospects` utilise les colonnes anglaises :
 *   - company_name (NOT NULL) / contact_name
 *   - phone, email, website, city, postal_code, sector
 *   - status (NOT NULL, default 'prospecte')
 *   - created_by (NOT NULL, FK users) / assigned_to (FK users)
 *   - notes, next_action_at
 *   - notion_page_id, synced_at (pour la sync Notion)
 *
 * Les anciennes colonnes FR (nom, telephone, ville, statut, user_id,
 * nom_entreprise, secteur_activite, site_web, classification,
 * recommandation) ajoutées par 0005 sont conservées vides, supprimées
 * par la migration 0006 une fois le frontend migré.
 */

/** Statuts affichables. L'univers exact du CHECK côté prod est incertain,
 *  on couvre donc à la fois les valeurs EN (style prod) et FR (legacy). */
export type ProspectStatus =
  | 'prospecte'
  | 'a_contacter'
  | 'contacte'
  | 'rdv_pris'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu'
  | 'archived';

export type Prospect = {
  id: string;
  // Ownership
  created_by: string;
  assigned_to: string | null;
  // Infos principales
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  sector: string | null;
  city: string | null;
  postal_code: string | null;
  status: string; // libre — on ne force pas un union type pour tolérer le schéma prod
  notes: string | null;
  next_action_at: string | null;
  // Sync Notion
  notion_page_id: string | null;
  synced_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
};

export const STATUS_OPTIONS: {
  value: ProspectStatus;
  label: string;
  tone: string;
}[] = [
  { value: 'prospecte', label: 'Prospecté', tone: 'bg-slate-100 text-slate-700' },
  { value: 'a_contacter', label: 'À contacter', tone: 'bg-slate-100 text-slate-700' },
  { value: 'contacte', label: 'Contacté', tone: 'bg-blue-100 text-blue-700' },
  { value: 'rdv_pris', label: 'RDV pris', tone: 'bg-indigo-100 text-indigo-700' },
  { value: 'devis_envoye', label: 'Devis envoyé', tone: 'bg-amber-100 text-amber-700' },
  { value: 'gagne', label: 'Gagné', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'perdu', label: 'Perdu', tone: 'bg-rose-100 text-rose-700' },
  { value: 'archived', label: 'Archivé', tone: 'bg-zinc-200 text-zinc-600' },
];

export function labelForStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function toneForStatus(status: string | null | undefined): string {
  if (!status) return 'bg-slate-100 text-slate-700';
  return (
    STATUS_OPTIONS.find((o) => o.value === status)?.tone ??
    'bg-slate-100 text-slate-700'
  );
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
