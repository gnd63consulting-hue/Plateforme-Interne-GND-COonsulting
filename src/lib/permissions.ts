/**
 * RBAC v2 (Sprint 24) — permissions GRANULAIRES par section (Voir/Éditer/Aucun).
 *
 * Le rôle est un PRESET : il fournit un jeu de permissions par défaut. Un admin
 * peut ensuite OVERRIDER par personne (colonne users.permissions, jsonb). Les
 * permissions effectives = preset du rôle, écrasé par l'override éventuel.
 *
 * Enforcement v1 (cf. roadmap) : sections `pipeline`, `suivi`, `relances` sont
 * gardées au niveau page ; les sections `finance`, `doublons`, `members`
 * restent admin-only (rôle) en attendant leur conversion — donc aucun risque de
 * fuite (default-deny).
 */

export const SECTIONS = [
  'pipeline',
  'suivi',
  'relances',
  'finance',
  'doublons',
  'members',
  'formation',
] as const;
export type Section = (typeof SECTIONS)[number];

export type Level = 'none' | 'view' | 'edit';
export type PermMap = Partial<Record<Section, Level>>;

export const SECTION_LABELS: Record<Section, string> = {
  pipeline: 'Pipeline commercial',
  suivi: 'Suivi équipe',
  relances: 'Relances',
  finance: 'Financier (CA, commissions)',
  doublons: 'Doublons',
  members: "Gestion de l'équipe",
  formation: 'Formation & ressources',
};

/** Description courte de chaque section (UI). */
export const SECTION_HINTS: Record<Section, string> = {
  pipeline: "Prospects de toute l'équipe (lecture / mise à jour).",
  suivi: 'Page Suivi équipe : qui est en retard.',
  relances: 'Page Relances : agenda des rappels.',
  finance: 'CA, commissions, paliers bonus. Sensible.',
  doublons: 'Détection et fusion des doublons.',
  members: 'Inviter, archiver, changer les rôles.',
  formation: 'E-learning + Sales toolkit.',
};

/** Sections dont la garde de page lit déjà les permissions (v1). */
export const ENFORCED_SECTIONS: Section[] = ['pipeline', 'suivi', 'relances'];

const FULL: PermMap = {
  pipeline: 'edit',
  suivi: 'edit',
  relances: 'edit',
  finance: 'edit',
  doublons: 'edit',
  members: 'edit',
  formation: 'edit',
};

/** Preset d'autorisations par rôle. */
const PRESETS: Record<string, PermMap> = {
  admin: FULL,
  admin_limited: FULL,
  assistant: {
    pipeline: 'edit',
    suivi: 'view',
    relances: 'edit',
    finance: 'none',
    doublons: 'none',
    members: 'none',
    formation: 'view',
  },
  freelance: { pipeline: 'none', suivi: 'none', relances: 'none', finance: 'none', doublons: 'none', members: 'none', formation: 'view' },
  commercial: { pipeline: 'none', suivi: 'none', relances: 'none', finance: 'none', doublons: 'none', members: 'none', formation: 'view' },
  stagiaire: { pipeline: 'none', suivi: 'none', relances: 'none', finance: 'none', doublons: 'none', members: 'none', formation: 'view' },
};

export function presetFor(role: string | null | undefined): PermMap {
  return { ...(PRESETS[role ?? ''] ?? {}) };
}

/** Nettoie un override venant de la base (jsonb) en PermMap valide. */
export function sanitizePerms(raw: unknown): PermMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: PermMap = {};
  for (const s of SECTIONS) {
    const v = (raw as Record<string, unknown>)[s];
    if (v === 'none' || v === 'view' || v === 'edit') out[s] = v;
  }
  return out;
}

/** Permissions effectives = preset du rôle, écrasé par l'override éventuel. */
export function effectivePerms(
  role: string | null | undefined,
  override: unknown
): PermMap {
  const base = presetFor(role);
  const ov = sanitizePerms(override);
  if (Object.keys(ov).length > 0) return { ...base, ...ov };
  return base;
}

const RANK: Record<Level, number> = { none: 0, view: 1, edit: 2 };

export function levelOf(perms: PermMap, section: Section): Level {
  return perms[section] ?? 'none';
}

export function allows(perms: PermMap, section: Section, min: Level): boolean {
  return RANK[levelOf(perms, section)] >= RANK[min];
}

/** Accès à la console /admin = au moins une section admin lisible. */
export function hasConsoleAccess(perms: PermMap): boolean {
  return (['pipeline', 'suivi', 'relances', 'finance', 'doublons', 'members'] as Section[]).some(
    (s) => allows(perms, s, 'view')
  );
}

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

// ----- Compat (anciens consommateurs encore en place) -----
export const CONSOLE_ROLES = new Set(['admin', 'admin_limited', 'assistant']);
export const FULL_ADMIN_ROLES = new Set(['admin', 'admin_limited']);
export type Capability =
  | 'console.access'
  | 'team.view'
  | 'team.edit'
  | 'finance.view'
  | 'members.manage';
const LEGACY: Record<string, Capability[]> = {
  admin: ['console.access', 'team.view', 'team.edit', 'finance.view', 'members.manage'],
  admin_limited: ['console.access', 'team.view', 'team.edit', 'finance.view', 'members.manage'],
  assistant: ['console.access', 'team.view', 'team.edit'],
  freelance: [],
  commercial: [],
  stagiaire: [],
};
export function can(role: string | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return (LEGACY[role] ?? []).includes(cap);
}
