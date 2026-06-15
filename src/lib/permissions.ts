/**
 * RBAC v1 (Sprint 21) — matrice rôle -> capacités.
 *
 * Source de vérité unique des autorisations. Enforcement applicatif (gardes de
 * pages + filtrage sidebar). Le masquage financier est UI d'abord ; un
 * durcissement RLS (field-level) suivra (cf. roadmap).
 *
 * Rôles :
 *  - admin / admin_limited : tout (fondateur, co-admin).
 *  - assistant : assistante commerciale (ex. Grâce) — voit le pipeline + suivi
 *    de toute l'équipe, peut mettre à jour les prospects, MAIS jamais le
 *    financier (CA / commissions) ni la gestion des membres.
 *  - freelance / commercial : ses propres prospects + sa commission only.
 *  - stagiaire : formation / ressources.
 */

export type Capability =
  | 'console.access' // entrer dans la console /admin
  | 'team.view' // voir le pipeline + suivi de TOUTE l'équipe
  | 'team.edit' // éditer les prospects de l'équipe
  | 'finance.view' // voir CA / commissions / montants / paliers
  | 'members.manage'; // inviter / archiver des membres

const MATRIX: Record<string, Capability[]> = {
  admin: ['console.access', 'team.view', 'team.edit', 'finance.view', 'members.manage'],
  admin_limited: ['console.access', 'team.view', 'team.edit', 'finance.view', 'members.manage'],
  assistant: ['console.access', 'team.view', 'team.edit'],
  freelance: [],
  commercial: [],
  stagiaire: [],
};

/** La capacité `cap` est-elle accordée au rôle ? */
export function can(role: string | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return (MATRIX[role] ?? []).includes(cap);
}

/** Rôles autorisés à entrer dans la console /admin (full ou restreinte). */
export const CONSOLE_ROLES = new Set(['admin', 'admin_limited', 'assistant']);

/** Rôles admin pleins (financier + gestion). */
export const FULL_ADMIN_ROLES = new Set(['admin', 'admin_limited']);

/** Libellé court du rôle pour l'UI. */
export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
      return 'FONDATEUR';
    case 'admin_limited':
      return 'CO-ADMIN';
    case 'assistant':
      return 'ASSISTANT';
    default:
      return 'MEMBRE';
  }
}
