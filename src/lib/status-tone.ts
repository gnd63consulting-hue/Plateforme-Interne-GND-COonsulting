/**
 * status-tone.ts — Mapping SÉMANTIQUE des 16 statuts prospect vers des TONS
 * PASTEL chauds (Sprint 10, redesign réf mockup ChatGPT).
 *
 * Pourquoi un module séparé de `prospects.ts` ?
 *  - `STATUS_OPTIONS.tone` (dans prospects.ts) porte la palette HISTORIQUE
 *    (Tailwind `bg-blue-100`, `bg-emerald-100`, …) encore utilisée par la vue
 *    table legacy. On NE la touche pas (additif, zéro régression).
 *  - Ici on définit la palette PASTEL OFFICIELLE alignée sur la charte
 *    verrouillée (vert #DDF2E4 / bleu #DDEBFF / sable #F8E8B8 / rouge #F7D7D7 /
 *    crème neutre), pilotée par le composant <StatusBadge>. C'est elle qui
 *    s'affiche partout dans le nouveau langage (kanban, relances, snapshot…).
 *
 * Module PUR : aucune dépendance server-only → importable depuis un composant
 * `"use client"`.
 */

/** Familles de tons pastel (réf charte). Chaque famille = fond + texte + bord. */
export type PastelTone =
  | 'slate'
  | 'blue'
  | 'sky'
  | 'sand'
  | 'indigo'
  | 'green'
  | 'purple'
  | 'red'
  | 'neutral';

/** Classes Tailwind par famille (fond pastel + texte foncé contrasté + bord). */
export const PASTEL_TONE_CLASSES: Record<PastelTone, string> = {
  // Neutre froid — pas encore travaillé
  slate: 'bg-[#EEF1F4] text-[#5A6573] border-[#DCE2E8]',
  // Premier contact établi
  blue: 'bg-[#DDEBFF] text-[#3E67A8] border-[#C5DAF7]',
  sky: 'bg-[#DBEEF8] text-[#2F6E94] border-[#C2E2F1]',
  // En attente / sable
  sand: 'bg-[#F8E8B8] text-[#8D6A1A] border-[#EBD58E]',
  // Avancé
  indigo: 'bg-[#E4E3FB] text-[#5048B8] border-[#D2D0F4]',
  // Signé / succès
  green: 'bg-[#DDF2E4] text-[#3A7A52] border-[#C4E7D1]',
  // Recontact futur
  purple: 'bg-[#ECE2F8] text-[#7A4FA8] border-[#DCCBF0]',
  // Sorties / négatif
  red: 'bg-[#F7D7D7] text-[#A04A4A] border-[#EFBFBF]',
  // Archivé / clôturé
  neutral: 'bg-[#ECE6DE] text-[#8A7E73] border-[#DFD6C9]',
};

/** Statut Supabase → famille de ton pastel. */
const STATUS_PASTEL: Record<string, PastelTone> = {
  // Phase 1 — pas encore contacté
  a_contacter: 'slate',
  tentative_appel: 'slate',
  prospecte: 'slate',
  // Phase 2 — premier contact établi
  contacte: 'blue',
  en_discussion: 'sky',
  a_rappeler: 'sand',
  en_attente_retour: 'sand',
  // Phase 3 — avancé
  rdv_pris: 'indigo',
  devis_envoye: 'sand',
  gagne: 'green',
  // Phase 4 — recontact futur
  a_recontacter: 'purple',
  // Phase 5 — sorties
  pas_interesse: 'red',
  coordonnees_invalides: 'neutral',
  ne_plus_demarcher: 'red',
  processus_termine: 'neutral',
  perdu: 'red',
  archived: 'neutral',
};

/** Famille de ton pastel d'un statut (défaut = neutre froid). */
export function pastelToneForStatus(status: string | null | undefined): PastelTone {
  if (!status) return 'slate';
  return STATUS_PASTEL[status] ?? 'slate';
}

/** Classes pastel prêtes à l'emploi pour un statut (fond + texte + bord). */
export function pastelClassesForStatus(status: string | null | undefined): string {
  return PASTEL_TONE_CLASSES[pastelToneForStatus(status)];
}
