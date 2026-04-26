/**
 * Types et helpers pour les prospects — schéma EN de prod + enrichissement Notion.
 *
 * La table `public.prospects` utilise les colonnes anglaises pour les fondamentaux
 * (company_name, contact_name, phone, email, city, sector, status, created_by,
 *  assigned_to, notes, next_action_at, notion_page_id, synced_at) et toutes les
 * colonnes d'enrichissement Notion ajoutées par la migration 0007 :
 *   - Contact split  : prenom_contact, role_contact (contact_name reste calculé)
 *   - Social         : instagram, facebook, linkedin_contact, linkedin_entreprise, tiktok
 *   - Analyses long  : analyse_besoin, analyse_budget, analyse_timing, recommandation_approche
 *   - Multi-select   : arguments_cles (TEXT[]), besoins_detectes (TEXT[])
 *   - Qualif         : ca_estime, classification, branche, note_google, nombre_avis,
 *                      taille_entreprise, nombre_employes
 *   - Adresse        : address (rue précise) en complément de city
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
  // Contact split (Notion enrichment)
  prenom_contact: string | null;
  role_contact: string | null;
  // Coordonnées
  email: string | null;
  phone: string | null;
  website: string | null;
  // Social (Notion enrichment)
  instagram: string | null;
  facebook: string | null;
  linkedin_contact: string | null;
  linkedin_entreprise: string | null;
  tiktok: string | null;
  // Localisation
  sector: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  // Pipeline
  status: string; // libre — on ne force pas un union type pour tolérer le schéma prod
  notes: string | null;
  next_action_at: string | null;
  // Analyses long (Notion enrichment)
  analyse_besoin: string | null;
  analyse_budget: string | null;
  analyse_timing: string | null;
  recommandation_approche: string | null;
  // Multi-select (Notion enrichment)
  arguments_cles: string[] | null;
  besoins_detectes: string[] | null;
  // Qualification (Notion enrichment)
  ca_estime: string | null;
  classification: string | null;
  branche: string | null;
  note_google: number | null;
  nombre_avis: number | null;
  taille_entreprise: string | null;
  nombre_employes: number | null;
  // Sync Notion
  notion_page_id: string | null;
  synced_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
};

/** Liste des colonnes à demander dans `select(...)` côté Supabase pour récupérer
 *  un prospect complet (fondamentaux + enrichissement Notion). */
export const PROSPECT_SELECT_COLUMNS = [
  'id',
  'created_by',
  'assigned_to',
  'company_name',
  'contact_name',
  'prenom_contact',
  'role_contact',
  'email',
  'phone',
  'website',
  'instagram',
  'facebook',
  'linkedin_contact',
  'linkedin_entreprise',
  'tiktok',
  'sector',
  'city',
  'postal_code',
  'address',
  'status',
  'notes',
  'next_action_at',
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
  'notion_page_id',
  'synced_at',
  'created_at',
  'updated_at',
].join(', ');

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
