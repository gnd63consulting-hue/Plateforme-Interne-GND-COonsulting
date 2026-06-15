'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Edit3,
  Phone,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { labelForStatus } from '@/lib/prospects';
import {
  TASK_SELECT_COLUMNS,
  type Task,
  type DueBucket,
  effectiveDue,
  groupTasksByDue,
  isDueToday,
  bucketForDue,
  toDateTimeInput,
  dateTimeInputToIso,
  formatDateTime,
  formatTime,
} from '@/lib/tasks';

export type RelanceLite = {
  id: string;
  company_name: string;
  contact_name: string | null;
  status: string;
  next_action_at: string;
};

export type ProspectOption = {
  id: string;
  company_name: string;
  contact_name: string | null;
};

type TachesClientProps = {
  initialTasks: Task[];
  relances: RelanceLite[];
  prospectOptions: ProspectOption[];
};

/** Élément unifié du to-do du jour : une tâche OU une relance. */
type AgendaItem =
  | { kind: 'task'; due: string | null; task: Task }
  | { kind: 'relance'; due: string; relance: RelanceLite };

export default function TachesClient({
  initialTasks,
  relances,
  prospectOptions,
}: TachesClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const reduceMotion = useReducedMotion();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  // Édition inline d'une tâche.
  const [editing, setEditing] = useState<Task | null>(null);

  // Formulaire de création.
  const [createOpen, setCreateOpen] = useState(false);

  const prospectName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of prospectOptions) map.set(p.id, p.company_name);
    return map;
  }, [prospectOptions]);

  // ------------------------------------------------------------------
  // Dérivés
  // ------------------------------------------------------------------
  const activeTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const doneTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.done)
        .sort(
          (a, b) =>
            new Date(b.done_at ?? b.created_at).getTime() -
            new Date(a.done_at ?? a.created_at).getTime()
        )
        .slice(0, 50),
    [tasks]
  );

  const grouped = useMemo(() => groupTasksByDue(activeTasks), [activeTasks]);

  // Agenda « À faire aujourd'hui » : tâches dues aujourd'hui/en retard + relances
  // dues aujourd'hui/en retard, fusionnées et triées par heure.
  const agenda = useMemo<AgendaItem[]>(() => {
    const items: AgendaItem[] = [];
    for (const t of activeTasks) {
      if (isDueToday(t)) items.push({ kind: 'task', due: effectiveDue(t), task: t });
    }
    for (const r of relances) {
      const bucket = bucketForDue(r.next_action_at);
      if (bucket === 'overdue' || bucket === 'today') {
        items.push({ kind: 'relance', due: r.next_action_at, relance: r });
      }
    }
    items.sort((a, b) => {
      const da = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
      const db = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
    return items;
  }, [activeTasks, relances]);

  // ------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------

  /** Coche une tâche (done=true, done_at=now). Optimistic + rollback. */
  async function toggleDone(task: Task, next: boolean) {
    setError(null);
    const prev = tasks;
    const done_at = next ? new Date().toISOString() : null;
    setTasks((list) =>
      list.map((t) => (t.id === task.id ? { ...t, done: next, done_at } : t))
    );
    const { error: err } = await supabase
      .from('tasks')
      .update({ done: next, done_at })
      .eq('id', task.id);
    if (err) {
      setTasks(prev); // rollback
      setError(`Impossible de mettre à jour la tâche : ${err.message}`);
      return;
    }
    setStatus(
      next ? `Tâche « ${task.title} » terminée.` : `Tâche « ${task.title} » réactivée.`
    );
  }

  async function deleteTask(task: Task) {
    if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) return;
    setError(null);
    const prev = tasks;
    setTasks((list) => list.filter((t) => t.id !== task.id));
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id);
    if (err) {
      setTasks(prev);
      setError(`Suppression impossible : ${err.message}`);
      return;
    }
    setStatus(`Tâche « ${task.title} » supprimée.`);
  }

  async function createTask(values: {
    title: string;
    due_at: string | null;
    remind_at: string | null;
    prospect_id: string | null;
  }) {
    setError(null);
    // owner_id non fourni : default auth.uid() côté Postgres (RLS owner).
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({
        title: values.title,
        due_at: values.due_at,
        remind_at: values.remind_at,
        prospect_id: values.prospect_id,
      })
      .select(TASK_SELECT_COLUMNS)
      .single();
    if (err) {
      setError(`Création impossible : ${err.message}`);
      throw err;
    }
    if (data) {
      setTasks((list) => [data as unknown as Task, ...list]);
      setStatus(`Tâche « ${values.title} » créée.`);
    }
  }

  async function saveEdit(
    task: Task,
    values: { title: string; due_at: string | null; remind_at: string | null }
  ) {
    setError(null);
    const prev = tasks;
    setTasks((list) =>
      list.map((t) => (t.id === task.id ? { ...t, ...values } : t))
    );
    const { error: err } = await supabase
      .from('tasks')
      .update(values)
      .eq('id', task.id);
    if (err) {
      setTasks(prev);
      setError(`Modification impossible : ${err.message}`);
      return;
    }
    setEditing(null);
    setStatus(`Tâche « ${values.title} » modifiée.`);
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.3 };

  return (
    <div className="mx-auto max-w-4xl">
      {/* aria-live : feedback non visuel sur create / check / delete. */}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-8 bg-gnd-amber" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
            Mon pilotage · Tâches
          </span>
        </div>
        <h1 className="font-display text-display-md font-medium leading-[0.95] tracking-tight text-gnd-bronze sm:text-4xl">
          Mes <span className="italic text-gnd-amber">tâches</span> &amp; to-do
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-gnd-bronze-soft sm:text-base">
          Ton to-do du jour réunit tes tâches et tes relances dues. Plus bas, gère
          toutes tes tâches : crée, édite, coche, classe par échéance.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* ================================================================== */}
      {/* A. À FAIRE AUJOURD'HUI                                              */}
      {/* ================================================================== */}
      <section className="mb-12" aria-labelledby="todo-today-heading">
        <div className="mb-4 flex items-center gap-2">
          <span
            className="flex h-2 w-2 rounded-full bg-gnd-amber shadow-[0_0_8px_rgba(243,146,83,0.7)]"
            aria-hidden
          />
          <h2
            id="todo-today-heading"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze"
          >
            À faire aujourd&apos;hui ({agenda.length})
          </h2>
        </div>

        {agenda.length === 0 ? (
          <div className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-10 text-center shadow-warm">
            <p className="font-display text-lg text-gnd-bronze">
              Rien d&apos;urgent aujourd&apos;hui. 👌
            </p>
            <p className="mt-2 text-sm text-gnd-bronze-soft">
              Aucune tâche ni relance due. Profites-en pour en planifier une.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {agenda.map((item) =>
                item.kind === 'task' ? (
                  <motion.div
                    key={`task-${item.task.id}`}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
                    transition={transition}
                  >
                    <AgendaTaskRow
                      task={item.task}
                      prospectName={
                        item.task.prospect_id
                          ? prospectName.get(item.task.prospect_id) ?? null
                          : null
                      }
                      onToggle={() => toggleDone(item.task, true)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`relance-${item.relance.id}`}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                  >
                    <AgendaRelanceRow relance={item.relance} />
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* B. MES TÂCHES                                                       */}
      {/* ================================================================== */}
      <section aria-labelledby="my-tasks-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="my-tasks-heading"
            className="font-display text-xl font-medium text-gnd-bronze sm:text-2xl"
          >
            Mes tâches
          </h2>
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            aria-expanded={createOpen}
            className="inline-flex items-center gap-2 rounded-full bg-gnd-bronze px-5 py-2.5 text-sm font-semibold text-gnd-cream transition-all hover:bg-gnd-ink hover:shadow-warm-lg"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle tâche
          </button>
        </div>

        {/* Formulaire de création */}
        <AnimatePresence initial={false}>
          {createOpen && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <TaskForm
                prospectOptions={prospectOptions}
                onCancel={() => setCreateOpen(false)}
                onSubmit={async (v) => {
                  await createTask(v);
                  setCreateOpen(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Liste groupée */}
        {activeTasks.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-10 text-center shadow-warm">
            <p className="font-display text-lg text-gnd-bronze">
              Aucune tâche active.
            </p>
            <p className="mt-2 text-sm text-gnd-bronze-soft">
              Crée ta première tâche pour la voir apparaître ici.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            <TaskGroup
              title="En retard"
              bucket="overdue"
              dotClass="bg-rose-500"
              tasks={grouped.overdue}
              editingId={editing?.id ?? null}
              prospectName={prospectName}
              onToggle={toggleDone}
              onEdit={setEditing}
              onCancelEdit={() => setEditing(null)}
              onSaveEdit={saveEdit}
              onDelete={deleteTask}
              reduceMotion={!!reduceMotion}
            />
            <TaskGroup
              title="Aujourd'hui"
              bucket="today"
              dotClass="bg-gnd-amber"
              tasks={grouped.today}
              editingId={editing?.id ?? null}
              prospectName={prospectName}
              onToggle={toggleDone}
              onEdit={setEditing}
              onCancelEdit={() => setEditing(null)}
              onSaveEdit={saveEdit}
              onDelete={deleteTask}
              reduceMotion={!!reduceMotion}
            />
            <TaskGroup
              title="À venir"
              bucket="upcoming"
              dotClass="bg-emerald-500"
              tasks={grouped.upcoming}
              editingId={editing?.id ?? null}
              prospectName={prospectName}
              onToggle={toggleDone}
              onEdit={setEditing}
              onCancelEdit={() => setEditing(null)}
              onSaveEdit={saveEdit}
              onDelete={deleteTask}
              reduceMotion={!!reduceMotion}
            />
            <TaskGroup
              title="Sans date"
              bucket="undated"
              dotClass="bg-gnd-bronze-faded"
              tasks={grouped.undated}
              editingId={editing?.id ?? null}
              prospectName={prospectName}
              onToggle={toggleDone}
              onEdit={setEditing}
              onCancelEdit={() => setEditing(null)}
              onSaveEdit={saveEdit}
              onDelete={deleteTask}
              reduceMotion={!!reduceMotion}
            />
          </div>
        )}

        {/* Tâches terminées (repliable) */}
        {doneTasks.length > 0 && (
          <div className="mt-10">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              aria-controls="done-tasks-panel"
              className="inline-flex items-center gap-2 rounded-full border border-gnd-bronze/10 bg-white px-4 py-2 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-cream hover:text-gnd-bronze"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showDone ? 'rotate-180' : ''}`}
                aria-hidden
              />
              Tâches terminées ({doneTasks.length})
            </button>
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div
                  id="done-tasks-panel"
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={transition}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-2">
                    {doneTasks.map((t) => (
                      <DoneTaskRow
                        key={t.id}
                        task={t}
                        prospectName={
                          t.prospect_id
                            ? prospectName.get(t.prospect_id) ?? null
                            : null
                        }
                        onUncheck={() => toggleDone(t, false)}
                        onDelete={() => deleteTask(t)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}

/* ===================================================================== */
/* Sous-composants                                                        */
/* ===================================================================== */

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnd-amber ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-gnd-bronze/30 bg-white text-transparent hover:border-gnd-amber'
      }`}
    >
      <Check className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function AgendaTaskRow({
  task,
  prospectName,
  onToggle,
}: {
  task: Task;
  prospectName: string | null;
  onToggle: () => void;
}) {
  const due = effectiveDue(task);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gnd-bronze/8 bg-gnd-paper p-4 shadow-warm transition-colors hover:border-gnd-amber/30">
      <Checkbox
        checked={false}
        onChange={onToggle}
        label={`Marquer « ${task.title} » comme terminée`}
      />
      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-gnd-amber-dim">
        {due ? formatTime(due) : '—'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-medium text-gnd-bronze">
          {task.title}
        </p>
        {prospectName && task.prospect_id && (
          <Link
            href={`/prospects/${task.prospect_id}`}
            className="truncate text-sm text-gnd-bronze-soft underline-offset-2 hover:text-gnd-amber-dim hover:underline"
          >
            {prospectName}
          </Link>
        )}
      </div>
      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-gnd-bronze/8 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gnd-bronze-soft sm:inline-flex">
        <CheckSquare className="h-3 w-3" aria-hidden />
        Tâche
      </span>
    </div>
  );
}

function AgendaRelanceRow({ relance }: { relance: RelanceLite }) {
  return (
    <Link
      href={`/prospects/${relance.id}`}
      className="flex items-center gap-4 rounded-2xl border border-gnd-bronze/8 bg-gnd-paper p-4 shadow-warm transition-all hover:-translate-y-0.5 hover:border-gnd-amber/30 hover:shadow-warm-lg"
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gnd-amber/12 text-gnd-amber-dim"
        aria-hidden
      >
        <Phone className="h-3.5 w-3.5" />
      </span>
      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-gnd-amber-dim">
        {formatTime(relance.next_action_at)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-medium text-gnd-bronze">
          {relance.company_name}
        </p>
        <p className="truncate text-sm text-gnd-bronze-soft">
          {relance.contact_name ?? labelForStatus(relance.status)}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-gnd-amber/12 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gnd-amber-dim sm:inline-flex">
        <CalendarClock className="h-3 w-3" aria-hidden />
        Relance
      </span>
    </Link>
  );
}

function TaskGroup({
  title,
  bucket,
  dotClass,
  tasks,
  editingId,
  prospectName,
  onToggle,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  reduceMotion,
}: {
  title: string;
  bucket: DueBucket;
  dotClass: string;
  tasks: Task[];
  editingId: string | null;
  prospectName: Map<string, string>;
  onToggle: (t: Task, next: boolean) => void;
  onEdit: (t: Task) => void;
  onCancelEdit: () => void;
  onSaveEdit: (
    t: Task,
    v: { title: string; due_at: string | null; remind_at: string | null }
  ) => void;
  onDelete: (t: Task) => void;
  reduceMotion: boolean;
}) {
  if (tasks.length === 0) return null;
  const danger = bucket === 'overdue';
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze">
          {title} ({tasks.length})
        </h3>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
            >
              {editingId === t.id ? (
                <InlineEdit
                  task={t}
                  onCancel={onCancelEdit}
                  onSave={(v) => onSaveEdit(t, v)}
                />
              ) : (
                <TaskRow
                  task={t}
                  danger={danger}
                  prospectName={
                    t.prospect_id ? prospectName.get(t.prospect_id) ?? null : null
                  }
                  onToggle={() => onToggle(t, true)}
                  onEdit={() => onEdit(t)}
                  onDelete={() => onDelete(t)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TaskRow({
  task,
  danger,
  prospectName,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  danger: boolean;
  prospectName: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const due = effectiveDue(task);
  return (
    <div
      className={`group flex items-center gap-4 rounded-2xl border bg-gnd-paper p-4 shadow-warm transition-colors ${
        danger
          ? 'border-rose-200 hover:border-rose-300'
          : 'border-gnd-bronze/8 hover:border-gnd-amber/30'
      }`}
    >
      <Checkbox
        checked={false}
        onChange={onToggle}
        label={`Marquer « ${task.title} » comme terminée`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-medium text-gnd-bronze">
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          {due && (
            <span
              className={`inline-flex items-center gap-1 font-mono ${
                danger ? 'text-rose-600' : 'text-gnd-bronze-soft'
              }`}
            >
              <Clock className="h-3 w-3" aria-hidden />
              {formatDateTime(due)}
            </span>
          )}
          {prospectName && task.prospect_id && (
            <Link
              href={`/prospects/${task.prospect_id}`}
              className="truncate text-gnd-amber-dim underline-offset-2 hover:underline"
            >
              {prospectName}
            </Link>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
          aria-label={`Modifier « ${task.title} »`}
        >
          <Edit3 className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500/70 transition-colors hover:bg-rose-50 hover:text-rose-600"
          aria-label={`Supprimer « ${task.title} »`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function DoneTaskRow({
  task,
  prospectName,
  onUncheck,
  onDelete,
}: {
  task: Task;
  prospectName: string | null;
  onUncheck: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gnd-bronze/8 bg-white/60 p-4">
      <Checkbox
        checked
        onChange={onUncheck}
        label={`Réactiver « ${task.title} »`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-medium text-gnd-bronze-soft line-through">
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gnd-bronze-faded">
          {task.done_at && (
            <span className="font-mono">Fait le {formatDateTime(task.done_at)}</span>
          )}
          {prospectName && task.prospect_id && (
            <Link
              href={`/prospects/${task.prospect_id}`}
              className="truncate underline-offset-2 hover:text-gnd-amber-dim hover:underline"
            >
              {prospectName}
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-rose-500/60 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Supprimer « ${task.title} »`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** Formulaire de création de tâche. */
function TaskForm({
  prospectOptions,
  onCancel,
  onSubmit,
}: {
  prospectOptions: ProspectOption[];
  onCancel: () => void;
  onSubmit: (v: {
    title: string;
    due_at: string | null;
    remind_at: string | null;
    prospect_id: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [prospectId, setProspectId] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? prospectOptions.filter(
          (p) =>
            p.company_name.toLowerCase().includes(q) ||
            (p.contact_name?.toLowerCase().includes(q) ?? false)
        )
      : prospectOptions;
    return list.slice(0, 50);
  }, [prospectOptions, search]);

  const canSubmit = title.trim().length > 0 && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        due_at: dateTimeInputToIso(dueAt),
        remind_at: dateTimeInputToIso(remindAt),
        prospect_id: prospectId || null,
      });
      setTitle('');
      setDueAt('');
      setRemindAt('');
      setProspectId('');
      setSearch('');
    } catch {
      /* erreur affichée par le parent via setError */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="task-title"
            className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Titre <span className="text-rose-500">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Rappeler le restaurant, préparer le devis…"
            className="w-full rounded-2xl border border-gnd-bronze/10 bg-white px-4 py-2.5 text-sm text-gnd-bronze placeholder:text-gnd-bronze-faded focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </div>

        <div>
          <label
            htmlFor="task-due"
            className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Échéance
          </label>
          <input
            id="task-due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full rounded-2xl border border-gnd-bronze/10 bg-white px-4 py-2.5 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </div>

        <div>
          <label
            htmlFor="task-remind"
            className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Rappel
          </label>
          <input
            id="task-remind"
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className="w-full rounded-2xl border border-gnd-bronze/10 bg-white px-4 py-2.5 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="task-prospect-search"
            className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Rattacher à un prospect (optionnel)
          </label>
          {prospectOptions.length > 8 && (
            <input
              id="task-prospect-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer la liste…"
              className="mb-2 w-full rounded-2xl border border-gnd-bronze/10 bg-white px-4 py-2 text-sm text-gnd-bronze placeholder:text-gnd-bronze-faded focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            />
          )}
          <select
            aria-label="Prospect rattaché"
            value={prospectId}
            onChange={(e) => setProspectId(e.target.value)}
            className="w-full rounded-2xl border border-gnd-bronze/10 bg-white px-4 py-2.5 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          >
            <option value="">— Aucun —</option>
            {filteredProspects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company_name}
                {p.contact_name ? ` · ${p.contact_name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gnd-bronze/10 bg-white px-5 py-2.5 text-sm font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-full bg-gnd-bronze px-5 py-2.5 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Création…' : 'Créer la tâche'}
        </button>
      </div>
    </form>
  );
}

/** Édition inline d'une tâche (titre + échéance + rappel). */
function InlineEdit({
  task,
  onCancel,
  onSave,
}: {
  task: Task;
  onCancel: () => void;
  onSave: (v: {
    title: string;
    due_at: string | null;
    remind_at: string | null;
  }) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [dueAt, setDueAt] = useState(toDateTimeInput(task.due_at));
  const [remindAt, setRemindAt] = useState(toDateTimeInput(task.remind_at));

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      due_at: dateTimeInputToIso(dueAt),
      remind_at: dateTimeInputToIso(remindAt),
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-2xl border border-gnd-amber/30 bg-white p-4 shadow-warm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`edit-title-${task.id}`} className="sr-only">
            Titre de la tâche
          </label>
          <input
            id={`edit-title-${task.id}`}
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-due-${task.id}`}
            className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Échéance
          </label>
          <input
            id={`edit-due-${task.id}`}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-remind-${task.id}`}
            className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Rappel
          </label>
          <input
            id={`edit-remind-${task.id}`}
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className="w-full rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full border border-gnd-bronze/10 bg-white px-4 py-2 text-xs font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Annuler
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze px-4 py-2 text-xs font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Enregistrer
        </button>
      </div>
    </form>
  );
}
