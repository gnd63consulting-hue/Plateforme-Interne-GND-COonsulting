/**
 * Registry des agents IA (Hermès) — helpers PURS + types pour la page
 * `/admin/agents`.
 *
 * Modèle calqué sur `src/lib/pipelines.ts` : on garde ici uniquement des
 * helpers purs et testables (types partagés, liste de colonnes du SELECT, tri
 * stable, métadonnées de statut). Le DATA-FETCH (requête Supabase) vit côté
 * serveur dans `admin/agents/page.tsx`.
 *
 * Schéma (migration 0025_agents_cloisonnement) :
 *   agents(id, codename, role, mission, kpi, model, status, db_role,
 *          telegram_bot_handle, scope_note, last_seen_at, created_at, updated_at)
 *
 * RLS : `agents_admin_all` (lecture/écriture admin via `is_admin_or_limited()`).
 * La page lit donc avec le client server RLS-bound — un admin connecté passe la
 * policy, AUCUN service-role nécessaire (même approche que /admin/reporting).
 *
 * ⚠️ Cloisonnement : les agents ne voient JAMAIS le CA (deal_amount isolé dans
 * `prospect_finance`, migration 0021). Ce registre est purement descriptif.
 */

/** Statut d'exécution d'un agent (contrainte CHECK en base). */
export type AgentStatus = 'idle' | 'running' | 'paused' | 'error';

/** Un agent tel que stocké en base (table `agents`, migration 0025). */
export type Agent = {
  id: string;
  codename: string;
  role: string | null;
  mission: string | null;
  kpi: string | null;
  model: string | null;
  status: AgentStatus;
  db_role: string | null;
  telegram_bot_handle: string | null;
  scope_note: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Colonnes à demander dans `select(...)` pour charger un agent complet. */
export const AGENT_SELECT_COLUMNS =
  'id, codename, role, mission, kpi, model, status, db_role, ' +
  'telegram_bot_handle, scope_note, last_seen_at, created_at, updated_at';

/** Les statuts valides (mêmes valeurs que la contrainte CHECK en base). */
export const AGENT_STATUSES: AgentStatus[] = [
  'idle',
  'running',
  'paused',
  'error',
];

/**
 * Métadonnées d'affichage par statut : libellé FR + couleur du badge.
 *   idle=gris · running=vert · paused=jaune · error=rouge
 * Couleurs alignées sur le Design System crème/orange (texte foncé sur fond
 * clair, contraste AA).
 */
export const STATUS_META: Record<
  AgentStatus,
  { label: string; dot: string; fg: string; bg: string; border: string }
> = {
  idle: {
    label: 'En veille',
    dot: '#9A8A80',
    fg: '#5C5048',
    bg: 'rgba(154,138,128,0.12)',
    border: 'rgba(154,138,128,0.32)',
  },
  running: {
    label: 'En cours',
    dot: '#4F7A38',
    fg: '#3C5C2A',
    bg: 'rgba(79,122,56,0.12)',
    border: 'rgba(79,122,56,0.32)',
  },
  paused: {
    label: 'En pause',
    dot: '#B5601C',
    fg: '#8A4915',
    bg: 'rgba(181,96,28,0.12)',
    border: 'rgba(181,96,28,0.32)',
  },
  error: {
    label: 'Erreur',
    dot: '#A04A4A',
    fg: '#7E3636',
    bg: 'rgba(160,74,74,0.12)',
    border: 'rgba(160,74,74,0.32)',
  },
};

/**
 * Normalise un `status` venant de la base en `AgentStatus` sûr : toute valeur
 * inconnue (ou null) retombe sur `idle` (default-safe pour l'UI / les badges).
 */
export function normalizeStatus(raw: string | null | undefined): AgentStatus {
  return raw === 'running' || raw === 'paused' || raw === 'error'
    ? raw
    : 'idle';
}

/** Métadonnées d'affichage d'un statut (normalisé au passage). */
export function statusMeta(raw: string | null | undefined) {
  return STATUS_META[normalizeStatus(raw)];
}

/**
 * Tri stable des agents pour l'affichage : par `db_role` (regroupement des
 * agents partageant le même rôle Postgres scopé), puis par `codename`. Ne mute
 * PAS l'entrée (retourne une copie triée). Les `db_role` nuls passent en fin.
 */
export function sortAgents(agents: Agent[]): Agent[] {
  return [...agents].sort(
    (a, b) =>
      (a.db_role ?? '￿').localeCompare(b.db_role ?? '￿', 'fr') ||
      a.codename.localeCompare(b.codename, 'fr')
  );
}

/**
 * Formate `last_seen_at` pour l'UI (FR, date + heure courte). `null` → '—'
 * (agent jamais vu). Valeur invalide → '—' aussi (défensif).
 */
export function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
