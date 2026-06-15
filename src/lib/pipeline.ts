/**
 * Pipeline Kanban — regroupement des 16 statuts prospect en colonnes
 * commerciales ordonnées (Sprint 2).
 *
 * Source de vérité unique pour la vue Kanban : chaque ProspectStatus est mappé
 * vers EXACTEMENT une colonne de pipeline. Aucun statut n'est perdu — le legacy
 * 'prospecte' et tout statut inconnu retombent dans la colonne « À contacter »
 * (entrée de pipeline) via getColumnForStatus().
 *
 * L'ordre des colonnes suit le parcours commercial réel :
 *   À contacter → Tentative / À rappeler → Contacté / En discussion →
 *   En attente retour → RDV / Devis → Signé · puis sorties (Perdu, Frigo,
 *   Ne plus démarcher) regroupées dans une colonne « morte » repliable.
 *
 * Conventions alignées sur src/lib/prospects.ts (types stricts, helpers purs).
 */

import type { ProspectStatus } from './prospects';

/** Identifiant stable d'une colonne de pipeline. */
export type PipelineColumnId =
  | 'a_contacter'
  | 'tentative'
  | 'contact_etabli'
  | 'en_attente'
  | 'rdv_devis'
  | 'gagne'
  | 'mort';

export type PipelineColumn = {
  id: PipelineColumnId;
  label: string;
  /** Description courte (titre HTML / aria). */
  hint: string;
  /** Statut posé en base quand on dépose une carte dans cette colonne :
   *  le statut "canonique" de la colonne. Les colonnes multi-statuts gardent
   *  le statut d'origine de la carte s'il appartient déjà à la colonne (cf.
   *  resolveDropStatus), sinon on retombe sur ce défaut. */
  defaultStatus: ProspectStatus;
  /** Tous les statuts qui vivent dans cette colonne (1er = canonique). */
  statuses: ProspectStatus[];
  /** Colonne de sortie / "morte" : repliable, masquée par défaut. */
  dead?: boolean;
  /** Accent visuel de l'entête de colonne (point + barre). */
  accent: string;
};

/**
 * Définition ordonnée des colonnes. L'ordre du tableau = ordre d'affichage
 * gauche → droite. La colonne morte est en dernier et `dead: true`.
 */
export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: 'a_contacter',
    label: 'À contacter',
    hint: 'Prospects pas encore approchés',
    defaultStatus: 'a_contacter',
    statuses: ['a_contacter'],
    accent: 'bg-slate-400',
  },
  {
    id: 'tentative',
    label: 'Tentative / À rappeler',
    hint: "Appels tentés, rappels à passer",
    defaultStatus: 'tentative_appel',
    statuses: ['tentative_appel', 'a_rappeler'],
    accent: 'bg-amber-400',
  },
  {
    id: 'contact_etabli',
    label: 'Contacté / En discussion',
    hint: 'Premier contact établi, échange en cours',
    defaultStatus: 'contacte',
    statuses: ['contacte', 'en_discussion'],
    accent: 'bg-sky-400',
  },
  {
    id: 'en_attente',
    label: 'En attente retour',
    hint: 'Balle dans leur camp · recontact différé',
    defaultStatus: 'en_attente_retour',
    statuses: ['en_attente_retour', 'a_recontacter'],
    accent: 'bg-orange-400',
  },
  {
    id: 'rdv_devis',
    label: 'RDV / Devis',
    hint: 'Rendez-vous pris, devis envoyé',
    defaultStatus: 'rdv_pris',
    statuses: ['rdv_pris', 'devis_envoye'],
    accent: 'bg-indigo-400',
  },
  {
    id: 'gagne',
    label: 'Devis signé',
    hint: 'Affaire gagnée 🎉',
    defaultStatus: 'gagne',
    statuses: ['gagne'],
    accent: 'bg-emerald-500',
  },
  {
    id: 'mort',
    label: 'Sorties',
    hint: 'Perdu · pas intéressé · ne plus démarcher · clôturé',
    defaultStatus: 'perdu',
    statuses: [
      'perdu',
      'pas_interesse',
      'coordonnees_invalides',
      'ne_plus_demarcher',
      'processus_termine',
      'archived',
    ],
    dead: true,
    accent: 'bg-rose-400',
  },
];

/** Index statut → colonne, construit une fois. */
const STATUS_TO_COLUMN: Record<string, PipelineColumnId> = (() => {
  const map: Record<string, PipelineColumnId> = {};
  for (const col of PIPELINE_COLUMNS) {
    for (const s of col.statuses) map[s] = col.id;
  }
  // Legacy / tolérance : 'prospecte' (retag 0008) → entrée de pipeline.
  map.prospecte = 'a_contacter';
  return map;
})();

/** Colonne d'un statut. Tout statut inconnu retombe sur l'entrée de pipeline
 *  ('a_contacter') pour ne jamais "perdre" une carte. */
export function getColumnForStatus(status: string | null | undefined): PipelineColumnId {
  if (!status) return 'a_contacter';
  return STATUS_TO_COLUMN[status] ?? 'a_contacter';
}

const COLUMN_BY_ID: Record<PipelineColumnId, PipelineColumn> = PIPELINE_COLUMNS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<PipelineColumnId, PipelineColumn>
);

export function columnById(id: PipelineColumnId): PipelineColumn {
  return COLUMN_BY_ID[id];
}

/**
 * Statut à écrire en base quand une carte (statut `currentStatus`) est déposée
 * dans la colonne `targetColumnId`.
 *
 * - Si le statut courant appartient déjà à la colonne cible (drop dans la même
 *   colonne, ou multi-statuts), on NE change rien (retourne currentStatus) pour
 *   préserver la nuance (ex. 'a_rappeler' vs 'tentative_appel').
 * - Sinon on applique le statut canonique de la colonne (defaultStatus).
 */
export function resolveDropStatus(
  currentStatus: string,
  targetColumnId: PipelineColumnId
): ProspectStatus {
  const col = COLUMN_BY_ID[targetColumnId];
  if ((col.statuses as string[]).includes(currentStatus)) {
    return currentStatus as ProspectStatus;
  }
  return col.defaultStatus;
}
