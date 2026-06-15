/**
 * Types et helpers pour les tâches / to-do — table `public.tasks` (migration
 * 0012, déjà en prod). RLS owner-based (owner_id = auth.uid()), donc tout passe
 * par le client anon côté `"use client"` : on ne force jamais owner_id à la main
 * (default = auth.uid() côté Postgres).
 *
 * Schéma `public.tasks` (0012) :
 *   id uuid pk, prospect_id uuid (nullable, ref prospects ON DELETE CASCADE),
 *   title text not null, due_at timestamptz, remind_at timestamptz,
 *   done boolean default false, done_at timestamptz,
 *   owner_id uuid not null default auth.uid(), created_at timestamptz default now()
 */

export type Task = {
  id: string;
  prospect_id: string | null;
  title: string;
  due_at: string | null;
  remind_at: string | null;
  done: boolean;
  done_at: string | null;
  owner_id: string;
  created_at: string;
};

/** Colonnes à demander dans `select(...)` pour récupérer une tâche complète. */
export const TASK_SELECT_COLUMNS = [
  'id',
  'prospect_id',
  'title',
  'due_at',
  'remind_at',
  'done',
  'done_at',
  'owner_id',
  'created_at',
].join(', ');

/** Bucket d'échéance d'une tâche, dérivé de due_at ou (à défaut) remind_at. */
export type DueBucket = 'overdue' | 'today' | 'upcoming' | 'undated';

/**
 * Échéance effective d'une tâche : on privilégie `due_at`, puis `remind_at`.
 * Renvoie null si aucune des deux n'est posée (tâche « sans date »).
 */
export function effectiveDue(task: {
  due_at: string | null;
  remind_at: string | null;
}): string | null {
  return task.due_at ?? task.remind_at ?? null;
}

/** Début du jour local (00:00) pour une date donnée (défaut : maintenant). */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Fin de journée locale exclusive (00:00 du lendemain). */
export function endOfToday(now: Date = new Date()): Date {
  const d = startOfToday(now);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Classe une échéance ISO dans un bucket relatif à aujourd'hui (heure locale).
 *   - null            → 'undated'
 *   - < début du jour → 'overdue'
 *   - < fin du jour   → 'today'
 *   - sinon           → 'upcoming'
 */
export function bucketForDue(
  iso: string | null,
  now: Date = new Date()
): DueBucket {
  if (!iso) return 'undated';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'undated';
  const start = startOfToday(now);
  const end = endOfToday(now);
  if (d < start) return 'overdue';
  if (d < end) return 'today';
  return 'upcoming';
}

/** Bucket d'une tâche à partir de son échéance effective. */
export function bucketForTask(task: Task, now: Date = new Date()): DueBucket {
  return bucketForDue(effectiveDue(task), now);
}

/** Une tâche est-elle « à faire aujourd'hui » (non faite, échéance ≤ fin du jour) ? */
export function isDueToday(task: Task, now: Date = new Date()): boolean {
  if (task.done) return false;
  const bucket = bucketForTask(task, now);
  return bucket === 'overdue' || bucket === 'today';
}

/** Regroupe une liste de tâches par bucket d'échéance, triées par date. */
export function groupTasksByDue(
  tasks: Task[],
  now: Date = new Date()
): Record<DueBucket, Task[]> {
  const groups: Record<DueBucket, Task[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    undated: [],
  };
  for (const t of tasks) {
    groups[bucketForTask(t, now)].push(t);
  }
  const byDue = (a: Task, b: Task) => {
    const da = effectiveDue(a);
    const db = effectiveDue(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(da).getTime() - new Date(db).getTime();
  };
  groups.overdue.sort(byDue);
  groups.today.sort(byDue);
  groups.upcoming.sort(byDue);
  groups.undated.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return groups;
}

/** 'yyyy-mm-ddThh:mm' (heure locale) pour un <input type="datetime-local">. */
export function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/** 'yyyy-mm-ddThh:mm' (heure locale saisie) → ISO UTC, ou null si vide. */
export function dateTimeInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Date + heure courtes en fr-FR (ex. « 15 juin, 14:30 »). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Heure courte seule en fr-FR (ex. « 14:30 »), '—' si pas d'heure. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
