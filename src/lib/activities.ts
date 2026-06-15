/**
 * Types et helpers pour la timeline d'activité (`public.activities`).
 *
 * La table `activities` est une timeline polymorphe par prospect, créée par
 * la migration 0012. RLS owner-based (owner_id = auth.uid()) + accès admin.
 * Un commercial ne voit/écrit que ses propres activités via le client anon.
 *
 * Conventions alignées sur src/lib/prospects.ts (types stricts, helpers purs).
 */

/** Nature d'une activité. Doit rester aligné sur le CHECK SQL de 0012. */
export type ActivityKind =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'status_change'
  | 'task';

export type Activity = {
  id: string;
  prospect_id: string;
  kind: ActivityKind | string; // string toléré pour des kinds futurs côté BDD
  body: string | null;
  /** Métadonnées libres. Pour kind='status_change' : { from, to }. */
  metadata: Record<string, unknown> | null;
  owner_id: string;
  occurred_at: string;
};

/** Colonnes à demander dans `select(...)` côté Supabase. */
export const ACTIVITY_SELECT_COLUMNS = [
  'id',
  'prospect_id',
  'kind',
  'body',
  'metadata',
  'owner_id',
  'occurred_at',
].join(', ');

/**
 * Forme minimale du client Supabase dont ce helper a besoin (insert sur une
 * table). Typage structurel volontaire : évite d'importer le type lourd
 * `SupabaseClient` et garde ce module sans dépendance serveur (importable
 * depuis un composant `"use client"`).
 */
type ActivityInsertClient = {
  from: (table: string) => {
    // PromiseLike (et non Promise) : le builder PostgREST de supabase-js est un
    // thenable, pas une vraie Promise → on type au plus large pour rester
    // compatible avec le client réel sans cast.
    insert: (
      values: Record<string, unknown>
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/**
 * Insère une activité dans la timeline d'un prospect et ATTEND le résultat.
 *
 * Contrairement à un fire-and-forget (`.insert().then()` non awaité), ce helper
 * renvoie `{ ok }` : le caller peut donc savoir si la trace a réellement été
 * persistée et avertir le commercial le cas échéant (exigence de traçabilité
 * fiable du Sprint 9 — jamais d'échec silencieux de l'historique).
 *
 * `owner_id` et `occurred_at` sont posés par défaut côté Postgres
 * (auth.uid() / now()) — on ne les force jamais à la main. RLS owner-based :
 * un commercial n'écrit que ses propres activités.
 */
export async function insertActivityRow(
  supabase: ActivityInsertClient,
  prospectId: string,
  kind: ActivityKind,
  opts: { body?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from('activities').insert({
    prospect_id: prospectId,
    kind,
    body: opts.body ?? null,
    metadata: opts.metadata ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[activities] insert ${kind} failed:`, error.message);
    return { ok: false };
  }
  return { ok: true };
}

/** Libellé FR + emoji par type d'activité (pour la timeline). */
const ACTIVITY_META: Record<
  ActivityKind,
  { label: string; icon: string }
> = {
  call: { label: 'Appel', icon: '📞' },
  email: { label: 'Email', icon: '✉️' },
  meeting: { label: 'Rendez-vous', icon: '🤝' },
  note: { label: 'Note', icon: '📝' },
  status_change: { label: 'Changement de statut', icon: '🔄' },
  task: { label: 'Tâche', icon: '✅' },
};

export function labelForActivityKind(kind: string): string {
  return ACTIVITY_META[kind as ActivityKind]?.label ?? kind;
}

export function iconForActivityKind(kind: string): string {
  return ACTIVITY_META[kind as ActivityKind]?.icon ?? '•';
}

/** Lit { from, to } d'une activité status_change (tolère un metadata absent). */
export function statusChangeParts(
  metadata: Record<string, unknown> | null | undefined
): { from: string | null; to: string | null } {
  if (!metadata) return { from: null, to: null };
  const from = typeof metadata.from === 'string' ? metadata.from : null;
  const to = typeof metadata.to === 'string' ? metadata.to : null;
  return { from, to };
}
