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
 *
 * Déduplication (migration 0013) :
 *   - email_norm / phone_norm : colonnes GÉNÉRÉES STORED (lecture seule côté app)
 *   - merged_into             : id de la fiche maître si cette fiche a été fusionnée
 *
 * Finance (migration 0015) :
 *   - deal_amount : montant HT du contrat signé (rempli au passage en status='gagne').
 */

/** Statuts affichables. Le legacy 'prospecte' n'est plus dans la liste
 *  visible (cf. migration 0008 qui retag les rows existantes en
 *  'a_contacter'), mais le type le couvre encore pour tolérer des lignes
 *  héritées éventuelles côté BDD.
 *
 *  Mai 2026: extension avec 9 nouveaux statuts terrain commercial pour
 *  matcher la réalité du démarchage téléphonique (Roodny, brief Vague α).
 *  Migration SQL appliquée: prospects_status_check étendu à 16 valeurs.
 *  Notion select 'statut' aligné: 34 options au total. */
export type ProspectStatus =
  | 'prospecte'
  | 'a_contacter'
  | 'contacte'
  | 'rdv_pris'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu'
  | 'archived'
  // Nouveaux statuts terrain commercial (mai 2026)
  | 'tentative_appel'
  | 'a_rappeler'
  | 'en_discussion'
  | 'en_attente_retour'
  | 'a_recontacter'
  | 'pas_interesse'
  | 'coordonnees_invalides'
  | 'ne_plus_demarcher'
  | 'processus_termine';

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
  // Finance (migration 0015) — montant HT du contrat signé
  deal_amount: number | null;
  // Sync Notion
  notion_page_id: string | null;
  synced_at: string | null;
  // Déduplication (migration 0013) — colonnes générées + traçabilité fusion
  email_norm: string | null;
  phone_norm: string | null;
  merged_into: string | null;
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
  'deal_amount',
  'notion_page_id',
  'synced_at',
  'email_norm',
  'phone_norm',
  'merged_into',
  'created_at',
  'updated_at',
].join(', ');

/** Options proposées dans les dropdowns de statut (commercials + filtres).
 *  Ordre logique du pipeline commercial groupé par phase. 'prospecte'
 *  (legacy) est volontairement absent — les anciennes rows ont été retag
 *  a_contacter par 0008. `gagne` porte le label "Devis signé" (vocabulaire
 *  commercial réel) — même code Supabase, juste un label aligné sur Notion.
 *
 *  Mai 2026: 9 nouveaux statuts insérés dans le bon bucket de phase pour
 *  donner aux commerciaux des cases qui correspondent à leur réalité
 *  terrain (téléphone, relances, frigo, opt-out RGPD). */
export const STATUS_OPTIONS: {
  value: ProspectStatus;
  label: string;
  tone: string;
}[] = [
  // Phase 1 — Pas encore contacté
  { value: 'a_contacter', label: 'À contacter', tone: 'bg-slate-100 text-slate-700' },
  { value: 'tentative_appel', label: "Tentative d'appel", tone: 'bg-slate-100 text-slate-600' },
  // Phase 2 — Premier contact établi
  { value: 'contacte', label: 'Contacté', tone: 'bg-blue-100 text-blue-700' },
  { value: 'en_discussion', label: 'En discussion', tone: 'bg-sky-100 text-sky-700' },
  { value: 'a_rappeler', label: 'À rappeler', tone: 'bg-yellow-100 text-yellow-800' },
  { value: 'en_attente_retour', label: 'En attente retour', tone: 'bg-orange-100 text-orange-700' },
  // Phase 3 — Avancé
  { value: 'rdv_pris', label: 'RDV pris', tone: 'bg-indigo-100 text-indigo-700' },
  { value: 'devis_envoye', label: 'Devis envoyé', tone: 'bg-amber-100 text-amber-700' },
  { value: 'gagne', label: 'Devis signé', tone: 'bg-emerald-100 text-emerald-700' },
  // Phase 4 — Parking / recontact futur
  { value: 'a_recontacter', label: 'À recontacter', tone: 'bg-purple-100 text-purple-700' },
  // Phase 5 — Sorties
  { value: 'pas_interesse', label: 'Pas intéressé', tone: 'bg-red-100 text-red-700' },
  { value: 'coordonnees_invalides', label: 'Coordonnées invalides', tone: 'bg-gray-100 text-gray-600' },
  { value: 'ne_plus_demarcher', label: 'Ne plus démarcher', tone: 'bg-red-200 text-red-800' },
  { value: 'processus_termine', label: 'Processus terminé', tone: 'bg-stone-100 text-stone-600' },
  { value: 'perdu', label: 'Perdu', tone: 'bg-rose-100 text-rose-700' },
  { value: 'archived', label: 'Archivé', tone: 'bg-zinc-200 text-zinc-600' },
];

/** Map du label "Prospecté" legacy pour les rows qui n'ont pas encore été
 *  retaggées (rare après 0008, mais on tolère). */
const LEGACY_LABELS: Record<string, string> = {
  prospecte: 'Prospecté (legacy)',
};

export function labelForStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return (
    STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    LEGACY_LABELS[status] ??
    status
  );
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
