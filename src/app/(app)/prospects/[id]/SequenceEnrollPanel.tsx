'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Loader2, Pause, Play, Route, Square } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  ENROLLMENT_SELECT_COLUMNS,
  formatSeqDate,
  type Sequence,
  type SequenceEnrollment,
} from '@/lib/sequences';

/**
 * Panneau « Séquence de relance » de la fiche 360 (Sprint 7).
 *
 * - Pas d'inscription ouverte → select d'une séquence active + bouton Inscrire.
 * - Inscription ouverte → séquence, étape courante, prochaine échéance, et
 *   boutons Pause / Reprendre / Arrêter.
 *
 * Tout passe par le client anon Supabase (RLS owner sur sequence_enrollments,
 * SELECT authenticated sur sequences/sequence_steps).
 *
 * INSCRIPTION (Sprint 9) : un seul appel RPC transactionnel
 * `fn_enroll_sequence(prospect, sequence)` (migration 0016, SECURITY DEFINER +
 * contrôle d'autorisation interne + idempotence). La RPC crée l'enrollment et,
 * si l'étape 1 est due immédiatement, la 1ère tâche + l'activité + pose
 * prospects.next_action_at — le tout dans UNE transaction atomique côté
 * Postgres. Plus aucune cascade d'écritures non atomiques côté client (fini le
 * risque d'enrollment orphelin ou de tâche sans trace en cas d'échec partiel).
 */
export default function SequenceEnrollPanel({
  prospectId,
  sequences,
  initialEnrollment,
}: {
  prospectId: string;
  /**
   * @deprecated Plus utilisé côté client depuis le Sprint 9 : la RPC
   * `fn_enroll_sequence` (migration 0016) calcule le owner (assigned_to ??
   * created_by) côté serveur. Conservé optionnel pour compat appelant.
   */
  prospectOwnerId?: string;
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

  /* ---- Inscription (RPC transactionnelle, migration 0016) -------------- */
  // Un seul appel atomique côté Postgres : crée l'enrollment + (si l'étape 1
  // est due immédiatement) la tâche + l'activité + pose next_action_at, sous
  // contrôle d'autorisation interne (owner du prospect OU admin) et idempotent
  // (renvoie l'enrollment 'active' existant sans doublon). On vérifie
  // { data, error } et on rafraîchit l'état depuis le retour de la RPC.
  async function enroll() {
    if (!selectedId) return;
    setError('');
    setBusy(true);
    const { data, error: rpcErr } = await supabase.rpc('fn_enroll_sequence', {
      p_prospect_id: prospectId,
      p_sequence_id: selectedId,
    });
    setBusy(false);

    if (rpcErr || !data) {
      setError(rpcErr?.message ?? 'Inscription impossible.');
      return;
    }
    setEnrollment(data as unknown as SequenceEnrollment);
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
