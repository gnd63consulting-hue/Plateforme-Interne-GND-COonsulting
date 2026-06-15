/**
 * Deal rotting — détection des prospects "qui pourrissent" (Sprint 2 Kanban).
 *
 * Deux signaux indépendants, calculés côté client (pur, testable) :
 *  - relance en retard : next_action_at < maintenant ;
 *  - inactivité : updated_at ancien (> seuil) sur un prospect ACTIF
 *    (les statuts de sortie / morts ne pourrissent pas — l'affaire est close).
 *
 * Utilisé pour afficher un liseré / point orange #F39253 + tooltip sur la carte.
 */

import { getColumnForStatus } from './pipeline';

/** Au-delà de ce nombre de jours sans MAJ, un prospect actif est "froid". */
export const ROT_DAYS_THRESHOLD = 14;

const DAY_MS = 86_400_000;

export type RottenInfo = {
  rotten: boolean;
  /** Relance dépassée (next_action_at < now). */
  overdue: boolean;
  /** Inactif depuis trop longtemps (updated_at ancien) sur prospect actif. */
  stale: boolean;
  /** Jours entiers écoulés depuis updated_at (>= 0). */
  daysIdle: number;
  /** Message FR prêt pour un tooltip / aria-label, ou null si pas pourri. */
  reason: string | null;
};

const NOT_ROTTEN: RottenInfo = {
  rotten: false,
  overdue: false,
  stale: false,
  daysIdle: 0,
  reason: null,
};

function daysBetween(fromIso: string, now: number): number {
  const t = new Date(fromIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

/**
 * Évalue l'état de "pourrissement" d'un prospect.
 * `now` injectable pour tests / rendu déterministe (défaut: Date.now()).
 */
export function evaluateRotting(
  prospect: {
    status: string;
    updated_at: string | null;
    next_action_at: string | null;
  },
  now: number = Date.now()
): RottenInfo {
  // Les colonnes de sortie ("mort" : perdu, signé… affaires closes) ne pourrissent pas.
  const col = getColumnForStatus(prospect.status);
  const isClosed = col === 'mort' || col === 'gagne';
  if (isClosed) return NOT_ROTTEN;

  const overdue =
    !!prospect.next_action_at && new Date(prospect.next_action_at).getTime() < now;

  const daysIdle = prospect.updated_at ? daysBetween(prospect.updated_at, now) : 0;
  const stale = daysIdle >= ROT_DAYS_THRESHOLD;

  if (!overdue && !stale) return NOT_ROTTEN;

  // Priorité au message le plus actionnable : relance en retard d'abord.
  const reason = overdue
    ? 'Relance en retard'
    : `${daysIdle} jour${daysIdle > 1 ? 's' : ''} sans activité`;

  return { rotten: true, overdue, stale, daysIdle, reason };
}
