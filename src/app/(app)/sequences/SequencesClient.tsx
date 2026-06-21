'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  cadenceSummary,
  kindIcon,
  kindLabel,
  STEP_KIND_OPTIONS,
  type SequenceStep,
  type SequenceWithSteps,
} from '@/lib/sequences';
import { SectionHeader, Button } from '@/components/ui';
import {
  createSequence,
  deleteSequence,
  deleteStep,
  reorderSteps,
  toggleSequenceActive,
  upsertStep,
  type ActionResult,
  type StepInput,
} from './actions';

/* ====================================================================== */
/* Composant principal                                                    */
/* ====================================================================== */

export default function SequencesClient({
  initialSequences,
  canEdit,
  userId,
}: {
  initialSequences: SequenceWithSteps[];
  canEdit: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    setError('');
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {/* En-tête — nouveau langage DS (SectionHeader) */}
      <SectionHeader
        as="h1"
        eyebrow="CRM · Relances"
        title={
          <>
            Séquences de <span className="italic text-brand-dark">relance</span>
          </>
        }
        subtitle="Des cadences multi-étapes qui génèrent automatiquement les tâches de relance au bon moment. Inscris un prospect depuis sa fiche."
        className="mb-8"
        action={
          canEdit ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreating((v) => !v)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Nouvelle séquence
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Formulaire de création */}
      {canEdit && creating && (
        <CreateSequenceForm
          pending={pending}
          onCancel={() => setCreating(false)}
          onCreate={(name, description) =>
            run(() => createSequence(name, description, userId), () =>
              setCreating(false)
            )
          }
        />
      )}

      {/* Liste */}
      {initialSequences.length === 0 ? (
        <div className="rounded-3xl border border-border-soft/70 bg-surface-soft p-12 text-center shadow-soft">
          <p className="font-marcellus text-lg text-choco">
            Aucune séquence pour l&apos;instant.
          </p>
          <p className="mt-2 text-sm text-muted-warm">
            {canEdit
              ? 'Crée ta première cadence de relance ci-dessus.'
              : 'Un administrateur doit en créer une.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialSequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              canEdit={canEdit}
              pending={pending}
              run={run}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Formulaire de création de séquence                                     */
/* ====================================================================== */

function CreateSequenceForm({
  pending,
  onCancel,
  onCreate,
}: {
  pending: boolean;
  onCancel: () => void;
  onCreate: (name: string, description: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="mb-6 rounded-3xl border border-brand/20 bg-white p-5 shadow-soft">
      <h2 className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
        Nouvelle séquence
      </h2>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
            Nom
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Relance restaurateur froid — 4 touches"
            autoFocus
            className="w-full rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
            Description (facultatif)
          </span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="À qui s'adresse cette cadence, dans quel contexte…"
            className="w-full resize-y rounded-lg border border-border-soft bg-white px-3 py-2 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => onCreate(name, description || null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-choco transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Carte séquence (liste + builder déroulant)                             */
/* ====================================================================== */

function SequenceCard({
  sequence,
  canEdit,
  pending,
  run,
}: {
  sequence: SequenceWithSteps;
  canEdit: boolean;
  pending: boolean;
  run: (action: () => Promise<ActionResult>, onOk?: () => void) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft">
      {/* Bandeau */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className="text-muted-warm/70">
            {open ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-marcellus text-lg font-medium text-choco">
                {sequence.name}
              </h2>
              {sequence.active ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6F5A50]">
                  Inactive
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-warm">
              <Clock className="h-3 w-3 text-brand-dark" aria-hidden />
              {cadenceSummary(sequence.steps)}
            </p>
            {sequence.description && (
              <p className="mt-1 truncate text-xs text-muted-warm/70">
                {sequence.description}
              </p>
            )}
          </div>
        </button>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => toggleSequenceActive(sequence.id, !sequence.active))
              }
              className="rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-xs font-semibold text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm disabled:opacity-50"
            >
              {sequence.active ? 'Désactiver' : 'Activer'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Supprimer la séquence « ${sequence.name} » et toutes ses étapes ? Les inscriptions en cours ne seront plus avancées.`
                  )
                ) {
                  run(() => deleteSequence(sequence.id));
                }
              }}
              aria-label="Supprimer la séquence"
              className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Builder / liste d'étapes */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-border-soft"
          >
            <StepsEditor
              sequence={sequence}
              canEdit={canEdit}
              pending={pending}
              run={run}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ====================================================================== */
/* Éditeur d'étapes                                                       */
/* ====================================================================== */

function StepsEditor({
  sequence,
  canEdit,
  pending,
  run,
}: {
  sequence: SequenceWithSteps;
  canEdit: boolean;
  pending: boolean;
  run: (action: () => Promise<ActionResult>, onOk?: () => void) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const steps = sequence.steps;

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const ordered = steps.map((s) => s.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    run(() => reorderSteps(sequence.id, ordered));
  }

  return (
    <div className="space-y-3 bg-cream/40 p-5">
      {steps.length === 0 && !adding && (
        <p className="text-xs italic text-muted-warm/70">
          Aucune étape. {canEdit ? 'Ajoute la première touche ci-dessous.' : ''}
        </p>
      )}

      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.id}>
            {editingId === step.id ? (
              <StepForm
                pending={pending}
                initial={step}
                position={index}
                onCancel={() => setEditingId(null)}
                onSubmit={(input) =>
                  run(
                    () => upsertStep(sequence.id, { ...input, id: step.id }),
                    () => setEditingId(null)
                  )
                }
              />
            ) : (
              <StepRow
                step={step}
                index={index}
                total={steps.length}
                canEdit={canEdit}
                pending={pending}
                onEdit={() => setEditingId(step.id)}
                onDelete={() =>
                  run(() => deleteStep(step.id))
                }
                onMove={(dir) => move(index, dir)}
              />
            )}
          </li>
        ))}
      </ol>

      {canEdit && (
        <>
          {adding ? (
            <StepForm
              pending={pending}
              position={steps.length}
              onCancel={() => setAdding(false)}
              onSubmit={(input) =>
                run(
                  () => upsertStep(sequence.id, input),
                  () => setAdding(false)
                )
              }
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border-soft bg-white px-3 py-2 text-xs font-semibold text-muted-warm transition-colors hover:border-brand/40 hover:text-ink-warm"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Ajouter une étape
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Ligne d'affichage d'une étape (lecture). */
function StepRow({
  step,
  index,
  total,
  canEdit,
  pending,
  onEdit,
  onDelete,
  onMove,
}: {
  step: SequenceStep;
  index: number;
  total: number;
  canEdit: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-soft bg-white p-3">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-sm ring-1 ring-border-soft"
        aria-hidden
      >
        {kindIcon(step.kind)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-warm">
            {kindLabel(step.kind)}
          </span>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 font-inter text-[10px] font-semibold text-muted-warm">
            {step.delay_days === 0
              ? 'immédiat'
              : `+${step.delay_days} j`}
          </span>
        </div>
        <p className="mt-0.5 break-words text-sm font-medium text-ink-warm">
          {step.title}
        </p>
        {step.template_body && (
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-warm">
            {step.template_body}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={pending || index === 0}
            onClick={() => onMove(-1)}
            aria-label="Monter l'étape"
            className="rounded p-1 text-muted-warm/70 transition-colors hover:bg-cream hover:text-ink-warm disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            disabled={pending || index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Descendre l'étape"
            className="rounded p-1 text-muted-warm/70 transition-colors hover:bg-cream hover:text-ink-warm disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onEdit}
            aria-label="Modifier l'étape"
            className="rounded p-1 text-muted-warm/70 transition-colors hover:bg-cream hover:text-ink-warm disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            aria-label="Supprimer l'étape"
            className="rounded p-1 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/** Formulaire d'ajout / édition d'une étape. */
function StepForm({
  pending,
  initial,
  position,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  initial?: SequenceStep;
  position: number;
  onCancel: () => void;
  onSubmit: (input: StepInput) => void;
}) {
  const [kind, setKind] = useState<string>(initial?.kind ?? 'call');
  const [delay, setDelay] = useState<string>(
    String(initial?.delay_days ?? 0)
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.template_body ?? '');

  function submit() {
    const parsed = parseInt(delay, 10);
    onSubmit({
      position,
      kind,
      delay_days: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
      title,
      template_body: body || null,
    });
  }

  return (
    <div className="rounded-xl border border-brand/25 bg-white p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
            Type
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-sm font-semibold text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {STEP_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {kindIcon(o.value)} {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
            Délai (jours depuis l&apos;étape précédente)
          </span>
          <input
            type="number"
            min={0}
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
      </div>
      <label className="mt-2 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
          Intitulé de la tâche
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Premier appel de prise de contact"
          className="w-full rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
          Script / modèle (facultatif)
        </span>
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Trame d'appel, modèle d'email, points à aborder…"
          className="w-full resize-y rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Annuler
        </button>
        <button
          type="button"
          disabled={pending || !title.trim()}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-choco transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          {initial ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </div>
  );
}
