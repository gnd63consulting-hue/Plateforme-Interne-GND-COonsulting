'use client';

import { useState, useTransition } from 'react';
import {
  PhoneCall,
  CalendarClock,
  PhoneOff,
  ThumbsDown,
  XCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { logCall } from './call-actions';

/** Issue d'appel rapide -> statut prospect. Aligne sur STATUS_OPTIONS. */
type Outcome = {
  value: string; // statut cible
  label: string;
  icon: typeof PhoneCall;
  /** Revele le selecteur de date de rappel (next_action_at). */
  needsDate?: boolean;
};

const OUTCOMES: Outcome[] = [
  { value: 'rdv_pris', label: 'Joignable / RDV', icon: PhoneCall },
  { value: 'a_rappeler', label: 'Rappeler', icon: CalendarClock, needsDate: true },
  { value: 'tentative_appel', label: 'Pas de reponse', icon: PhoneOff },
  { value: 'pas_interesse', label: 'Pas interesse', icon: ThumbsDown },
  { value: 'perdu', label: 'Perdu', icon: XCircle },
];

/** Date du jour (J+1 par defaut pour un rappel) au format input date. */
function defaultRecallDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function LogCallDialog({
  prospectId,
  company,
  onClose,
  onLogged,
}: {
  prospectId: string;
  company: string;
  onClose: () => void;
  onLogged: (status: string) => void;
}) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [recallDate, setRecallDate] = useState(defaultRecallDate());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const selected = OUTCOMES.find((o) => o.value === outcome) ?? null;
  const needsDate = selected?.needsDate ?? false;

  function handleSave() {
    if (!outcome) {
      setError("Choisis une issue d'appel.");
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await logCall({
        prospectId,
        status: outcome,
        note: note.trim() || null,
        nextActionAt: needsDate ? recallDate : null,
      });
      if (res.ok) {
        onLogged(outcome);
        onClose();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-3 rounded-2xl border border-border-soft bg-cream-deep/50 p-3 ring-1 ring-gnd-bronze/8">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-inter text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark">
          Loguer l&apos;appel
          <span className="ml-1 normal-case tracking-normal text-muted-warm">
            &middot; {company}
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-warm hover:bg-white hover:text-choco"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Issues rapides */}
      <div className="flex flex-wrap gap-1.5">
        {OUTCOMES.map((o) => {
          const Icon = o.icon;
          const active = outcome === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-brand text-choco'
                  : 'border border-border-soft bg-white text-ink-warm hover:bg-cream-deep'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Date de rappel (si "Rappeler") */}
      {needsDate && (
        <label className="mt-3 flex items-center gap-2 text-xs text-ink-warm">
          <CalendarClock className="h-3.5 w-3.5 text-brand-dark" aria-hidden />
          <span className="font-semibold">Rappeler le</span>
          <input
            type="date"
            value={recallDate}
            onChange={(e) => setRecallDate(e.target.value)}
            className="rounded-lg border border-border-soft bg-white px-2 py-1 text-xs text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
      )}

      {/* Note libre */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note d'appel (facultatif) : ce qui s'est dit, prochaine etape..."
        className="mt-3 w-full resize-none rounded-xl border border-border-soft bg-white px-3 py-2 text-sm text-ink-warm placeholder:text-muted-warm/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-xl border border-border-soft bg-white px-3 py-2 text-xs font-semibold text-ink-warm hover:bg-cream-deep disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !outcome}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-choco transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
