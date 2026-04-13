export type ProspectStatut =
  | 'a_contacter'
  | 'contacte'
  | 'rdv_pris'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu';

export type Prospect = {
  id: string;
  user_id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  ville: string | null;
  statut: ProspectStatut;
  notes: string | null;
  // Champs remplis par la sync Notion (null pour les prospects créés à la main).
  notion_page_id: string | null;
  nom_entreprise: string | null;
  secteur_activite: string | null;
  site_web: string | null;
  classification: string | null;
  recommandation: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUT_OPTIONS: { value: ProspectStatut; label: string; tone: string }[] = [
  { value: 'a_contacter', label: 'À contacter', tone: 'bg-slate-100 text-slate-700' },
  { value: 'contacte', label: 'Contacté', tone: 'bg-blue-100 text-blue-700' },
  { value: 'rdv_pris', label: 'RDV pris', tone: 'bg-indigo-100 text-indigo-700' },
  { value: 'devis_envoye', label: 'Devis envoyé', tone: 'bg-amber-100 text-amber-700' },
  { value: 'gagne', label: 'Gagné', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'perdu', label: 'Perdu', tone: 'bg-rose-100 text-rose-700' },
];

export function labelForStatut(statut: ProspectStatut): string {
  return STATUT_OPTIONS.find((o) => o.value === statut)?.label ?? statut;
}

export function toneForStatut(statut: ProspectStatut): string {
  return (
    STATUT_OPTIONS.find((o) => o.value === statut)?.tone ?? 'bg-slate-100 text-slate-700'
  );
}

export function formatDate(iso: string): string {
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
