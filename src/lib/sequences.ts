/**
 * Types et helpers pour les séquences de relance (cadences multi-étapes).
 *
 * Tables (migration 0014) :
 *   - sequences            : bibliothèque de cadences (modèles partagés)
 *   - sequence_steps       : étapes ordonnées (kind, delay_days, title, body)
 *   - sequence_enrollments : inscription d'un prospect à une séquence
 *
 * MVP : pas d'envoi email. Le moteur cron (/api/sequences/tick) transforme
 * chaque étape échue en TÂCHE (public.tasks) + pose prospects.next_action_at.
 *
 * ⚠️ Ce fichier ne dépend d'AUCUN module serveur (pas de supabase-server).
 *    Il est sûr à importer depuis un composant `"use client"` comme depuis
 *    une route serveur / server action. C'est le point d'ancrage unique des
 *    types partagés côté UI ↔ moteur (évite le piège Sprint 6).
 *
 * Sémantique de delay_days : délai en jours DEPUIS L'ÉTAPE PRÉCÉDENTE
 * (relatif). Pour l'étape 1 (position 0), compté depuis l'inscription.
 * Voir l'en-tête de 0014_sequences.sql.
 */

/** Nature d'une étape — aligné sur le CHECK SQL de 0014. */
export type SequenceStepKind =
  | 'call'
  | 'email'
  | 'linkedin'
  | 'task'
  | 'note';

/** Statut d'une inscription — aligné sur le CHECK SQL de 0014. */
export type EnrollmentStatus = 'active' | 'paused' | 'done' | 'stopped';

export type Sequence = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
};

export type SequenceStep = {
  id: string;
  sequence_id: string;
  position: number;
  kind: SequenceStepKind | string; // string toléré pour kinds futurs en BDD
  delay_days: number;
  title: string;
  template_body: string | null;
};

export type SequenceEnrollment = {
  id: string;
  sequence_id: string;
  prospect_id: string;
  current_step: number;
  status: EnrollmentStatus | string;
  started_at: string;
  next_due_at: string | null;
  owner_id: string;
  created_at: string;
};

/** Séquence + ses étapes (jointure applicative pour le builder / la liste). */
export type SequenceWithSteps = Sequence & { steps: SequenceStep[] };

/** Colonnes `select(...)` pour une séquence complète. */
export const SEQUENCE_SELECT_COLUMNS = [
  'id',
  'name',
  'description',
  'active',
  'created_by',
  'created_at',
].join(', ');

/** Colonnes `select(...)` pour une étape de séquence. */
export const SEQUENCE_STEP_SELECT_COLUMNS = [
  'id',
  'sequence_id',
  'position',
  'kind',
  'delay_days',
  'title',
  'template_body',
].join(', ');

/** Colonnes `select(...)` pour une inscription. */
export const ENROLLMENT_SELECT_COLUMNS = [
  'id',
  'sequence_id',
  'prospect_id',
  'current_step',
  'status',
  'started_at',
  'next_due_at',
  'owner_id',
  'created_at',
].join(', ');

/** Libellé FR + emoji par type d'étape (pour le builder et la timeline). */
const STEP_META: Record<
  SequenceStepKind,
  { label: string; icon: string }
> = {
  call: { label: 'Appel', icon: '📞' },
  email: { label: 'Email', icon: '✉️' },
  linkedin: { label: 'LinkedIn', icon: '💼' },
  task: { label: 'Tâche', icon: '✅' },
  note: { label: 'Note', icon: '📝' },
};

/** Liste ordonnée des kinds proposés dans le builder. */
export const STEP_KIND_OPTIONS: { value: SequenceStepKind; label: string }[] = [
  { value: 'call', label: 'Appel' },
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'task', label: 'Tâche' },
  { value: 'note', label: 'Note' },
];

export function kindLabel(kind: string): string {
  return STEP_META[kind as SequenceStepKind]?.label ?? kind;
}

export function kindIcon(kind: string): string {
  return STEP_META[kind as SequenceStepKind]?.icon ?? '•';
}

/** Libellé FR d'un statut d'inscription. */
const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Active',
  paused: 'En pause',
  done: 'Terminée',
  stopped: 'Arrêtée',
};

export function enrollmentStatusLabel(status: string): string {
  return ENROLLMENT_STATUS_LABELS[status as EnrollmentStatus] ?? status;
}

/** Statuts d'inscription considérés « actifs » (encore en cours de relance). */
export const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  'active',
  'paused',
];

/** Une inscription est-elle encore en cours (active OU en pause) ? */
export function isEnrollmentOpen(status: string): boolean {
  return status === 'active' || status === 'paused';
}

/** Ajoute `days` jours à une date (UTC-safe : ajoute des millisecondes). */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

/**
 * Échéance de déclenchement d'une étape donnée, relative à une date de
 * référence (par défaut : maintenant). Renvoie un ISO string.
 *
 * `delayDays` est le délai DEPUIS L'ÉTAPE PRÉCÉDENTE (cf. sémantique 0014).
 * Le moteur appelle ce helper avec le delay de l'étape SUIVANTE à chaque
 * avancement, ce qui produit naturellement une cadence cumulative.
 */
export function nextDueFrom(
  delayDays: number,
  from: Date = new Date()
): string {
  const safeDelay = Number.isFinite(delayDays) ? Math.max(0, delayDays) : 0;
  return addDays(from, safeDelay).toISOString();
}

/**
 * Trie une liste d'étapes par position croissante (copie, ne mute pas).
 */
export function sortSteps<T extends { position: number }>(steps: T[]): T[] {
  return [...steps].sort((a, b) => a.position - b.position);
}

/**
 * Résumé court d'une cadence pour l'affichage en liste, ex.
 * « 4 étapes · J+0, J+2, J+5, J+9 ». Les jours sont cumulés depuis
 * l'inscription à partir des delay_days relatifs.
 */
export function cadenceSummary(steps: SequenceStep[]): string {
  const ordered = sortSteps(steps);
  if (ordered.length === 0) return 'Aucune étape';
  let cumulative = 0;
  const days = ordered.map((s) => {
    cumulative += Math.max(0, s.delay_days ?? 0);
    return `J+${cumulative}`;
  });
  const n = ordered.length;
  return `${n} étape${n > 1 ? 's' : ''} · ${days.join(', ')}`;
}

/** Date courte FR (ex. « 15 juin 2026 »). */
export function formatSeqDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
