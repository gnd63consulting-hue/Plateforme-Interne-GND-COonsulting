'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Loader2, Pause, Play, Route, Square } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  ENROLLMENT_SELECT_COLUMNS,
  SEQUENCE_STEP_SELECT_COLUMNS,
  formatSeqDate,
  kindLabel,
  nextDueFrom,
  type Sequence,
  type SequenceEnrollment,
  type SequenceStep,
} from '@/lib/sequences';

/**
 * Panneau « Séquence de relance » de la fiche 360 (Sprint 7).
 *
 * - Pas d'inscription ouverte → select d'une séquence active + bouton Inscrire.
 * - Inscription ouverte → séquence, étape courante, prochaine échéance, et
 *   boutons Pause / Reprendre / Arrêter.
 *
 * Tout passe par le client anon Supabase (RLS owner sur sequence_enrollments,
 * SELECT authenticated sur sequences/sequence_steps). owner_id est posé en
 * default = auth.uid() côté Postgres — jamais forcé à la main.
 *
 * À l'inscription, on crée l'enrollment puis on pose IMMÉDIATEMENT la 1ère
 * tâche + prospects.next_action_at, pour que la relance soit visible tout de
 * suite sans attendre le cron quotidien.
 */
export default function SequenceEnrollPanel({
  prospectId,
  prospectOwnerId,
  sequences,
  initialEnrollment,
}: {
  prospectId: string;
  /** assigned_to ?? created_by — propriétaire pour la tâche initiale. */
  prospectOwnerId: string;
  sequences: Sequence[];
  initialEnrollment: SequenceEnrollment | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [enrollment, setEnrollment] = useState<SequenceEnrollment | null>(
    initialEnrollment
  );
  const [selectedId, setSelectedId] = useState<string>(
    sequences[0]?.id ?? ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const seqById = useMemo(() => {
    const m = new Map<string, Sequence>();
    for (const s of sequences) m.set(s.id, s);
    return m;
  }, [sequences]);

  /* ---- Inscription ----------------------------------------------------- */
  async function enroll() {
    if (!selectedId) return;
    setError('');
    setBusy(true);
    try {
      // 1. Récupère l'étape 1 (position 0) pour calculer la 1ère échéance.
      const { data: firstStepRow, error: stepErr } = await supabase
        .from('sequence_steps')
        .select(SEQUENCE_STEP_SELECT_COLUMNS)
        .eq('sequence_id', selectedId)
        .eq('position', 0)
        .maybeSingle();

      if (stepErr) throw new Error(stepErr.message);
      if (!firstStepRow) {
        throw new Error("Cette séquence n'a pas encore d'étape.");
      }
      const firstStep = firstStepRow as unknown as SequenceStep;

      const nowIso = new Date().toISOString();
      const firstDue = nextDueFrom(firstStep.delay_days, new Date());

      // 2. Crée l'inscription (owner_id default = auth.uid()).
      const { data: enrRow, error: enrErr } = await supabase
        .from('sequence_enrollments')
        .insert({
          sequence_id: selectedId,
          prospect_id: prospectId,
          current_step: 0,
          status: 'active',
          next_due_at: firstDue,
        })
        .select(ENROLLMENT_SELECT_COLUMNS)
        .single();

      if (enrErr || !enrRow) {
        throw new Error(enrErr?.message ?? "Inscription impossible.");
      }
      const created = enrRow as unknown as SequenceEnrollment;

      // 3. Si l'étape 1 est due maintenant (delay 0), pose tout de suite la
      //    tâche + next_action_at + avance l'inscription. Sinon, on laisse le
      //    cron déclencher à l'échéance.
      if (firstStep.delay_days <= 0) {
        await materializeFirstStep(created, firstStep, nowIso);
      }

      // Recharge l'inscription (peut avoir avancé).
      const { data: refreshed } = await supabase
        .from('sequence_enrollments')
        .select(ENROLLMENT_SELECT_COLUMNS)
        .eq('id', created.id)
        .maybeSingle();
      setEnrollment(
        (refreshed as unknown as SequenceEnrollment) ?? created
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Pose la tâche de l'étape 1 + next_action_at, puis avance l'inscription
   * (vers l'étape 2 ou clôture). Réplique côté client la logique du moteur
   * cron pour l'inscription immédiate.
   */
  async function materializeFirstStep(
    enr: SequenceEnrollment,
    step: SequenceStep,
    nowIso: string
  ) {
    const title = `${kindLabel(step.kind)} — ${step.title}`;

    await supabase.from('tasks').insert({
      prospect_id: prospectId,
      title,
      due_at: nowIso,
      remind_at: nowIso,
      owner_id: prospectOwnerId,
    });

    await supabase
      .from('prospects')
      .update({ next_action_at: nowIso })
      .eq('id', prospectId);

    await supabase.from('activities').insert({
      prospect_id: prospectId,
      kind: 'task',
      body: step.template_body
        ? `Étape séquence déclenchée : ${title}\n\n${step.template_body}`
        : `Étape séquence déclenchée : ${title}`,
      metadata: {
        sequence_id: enr.sequence_id,
        enrollment_id: enr.id,
        step_position: 0,
        step_kind: step.kind,
      },
    });

    // Avance vers l'étape suivante (ou clôture).
    const { data: nextStep } = await supabase
      .from('sequence_steps')
      .select('delay_days')
      .eq('sequence_id', enr.sequence_id)
      .eq('position', 1)
      .maybeSingle();

    if (nextStep) {
      await supabase
        .from('sequence_enrollments')
        .update({
          current_step: 1,
          next_due_at: nextDueFrom(
            (nextStep as { delay_days: number }).delay_days,
            new Date()
          ),
        })
        .eq('id', enr.id);
    } else {
      await supabase
        .from('sequence_enrollments')
        .update({ current_step: 1, status: 'done', next_due_at: null })
        .eq('id', enr.id);
    }
  }

  /* ---- Pause / reprise / arrêt ---------------------------------------- */
  async function patchStatus(status: 'paused' | 'active' | 'stopped') {
    if (!enrollment) return;
    setError('');
    setBusy(true);
    const patch: Record<string, unknown> = { status };
    if (status === 'stopped') patch.next_due_at = null;
    const { data, error: err } = await supabase
      .from('sequence_enrollments')
      .update(patch)
      .eq('id', enrollment.id)
      .select(ENROLLMENT_SELECT_COLUMNS)
      .single();
    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? 'Mise à jour impossible.');
      return;
    }
    const updated = data as unknown as SequenceEnrollment;
    // Une inscription arrêtée disparaît du panneau « ouvert ».
    setEnrollment(updated.status === 'stopped' ? null : updated);
  }

  /* ---- Rendu ---------------------------------------------------------- */
  const seq = enrollment ? seqById.get(enrollment.sequence_id) : null;

  return (
    <section className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-5 shadow-warm">
      <div className="mb-4 flex items-center gap-2">
        <Route className="h-4 w-4 text-gnd-amber" aria-hidden />
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
          Séquence de relance
        </h2>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800"
        >
          {error}
        </p>
      )}

      {enrollment ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-gnd-bronze/8">
            <p className="font-display text-base font-medium text-gnd-bronze">
              {seq?.name ?? 'Séquence'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                  enrollment.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {enrollment.status === 'paused' ? 'En pause' : 'Active'}
              </span>
              <span className="text-gnd-bronze-soft">
                Étape {enrollment.current_step + 1}
              </span>
            </div>
            {enrollment.next_due_at && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gnd-bronze-soft">
                <CalendarClock className="h-3.5 w-3.5 text-gnd-amber-dim" aria-hidden />
                Prochaine étape le {formatSeqDate(enrollment.next_due_at)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {enrollment.status === 'active' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => patchStatus('paused')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gnd-bronze/10 bg-white px-3 py-1.5 text-xs font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5" aria-hidden />
                Mettre en pause
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => patchStatus('active')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gnd-bronze/10 bg-white px-3 py-1.5 text-xs font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Reprendre
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm('Arrêter définitivement cette séquence pour ce prospect ?')) {
                  patchStatus('stopped');
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" aria-hidden />
              Arrêter
            </button>
            {busy && (
              <Loader2 className="h-4 w-4 animate-spin text-gnd-bronze-faded" aria-hidden />
            )}
          </div>
        </div>
      ) : sequences.length === 0 ? (
        <p className="text-xs text-gnd-bronze-soft">
          Aucune séquence active disponible.{' '}
          <Link
            href="/sequences"
            className="font-semibold text-gnd-amber-dim underline underline-offset-2"
          >
            Voir les séquences
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
              Inscrire à une séquence
            </span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm font-semibold text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            >
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !selectedId}
            onClick={enroll}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Route className="h-4 w-4" aria-hidden />
            )}
            Inscrire ce prospect
          </button>
        </div>
      )}
    </section>
  );
}
