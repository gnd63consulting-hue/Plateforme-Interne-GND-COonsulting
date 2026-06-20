'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * RecallDatePicker — sélecteur de date de relance sur la charte GND
 * (crème/orange). Remplace le <input type="datetime-local"> natif.
 *
 * CONTRÔLÉ + DROP-IN : même contrat que datetime-local.
 *   value  : 'yyyy-mm-ddThh:mm' (heure locale) ou '' (aucune date)
 *   onChange(value) : appelé à chaque changement de jour ou d'heure.
 * Ainsi un parent qui faisait dateTimeInputToIso(value) marche sans changement.
 */

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toValue(d: Date, time: string): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
}

function parseValue(v: string): { date: Date | null; time: string } {
  const m = (v || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return { date: null, time: '09:00' };
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return { date: Number.isNaN(d.getTime()) ? null : d, time: `${m[4]}:${m[5]}` };
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function RecallDatePicker({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { date: selected, time } = useMemo(() => parseValue(value), [value]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [view, setView] = useState(() => {
    const base = selected ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  const firstOfMonth = new Date(view.y, view.m, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // semaine commence lundi
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const safeTime = time || '09:00';

  function pick(day: number) {
    onChange(toValue(new Date(view.y, view.m, day), safeTime));
  }
  function setTime(t: string) {
    const base = selected ?? new Date(view.y, view.m, today.getDate());
    onChange(toValue(base, t || '09:00'));
  }
  function jump(daysAhead: number) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    onChange(toValue(d, safeTime));
  }
  function nextMonday() {
    const d = new Date(today);
    const delta = ((8 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + delta);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    onChange(toValue(d, safeTime));
  }
  function prevMonth() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  }
  function nextMonth() {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      className={`w-full max-w-[18rem] rounded-2xl border border-border-soft bg-white p-3 shadow-soft ${className}`}
    >
      {/* En-tête mois */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mois précédent"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-warm transition-colors hover:bg-cream hover:text-choco"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="font-marcellus text-sm font-medium capitalize text-choco">
          {MONTHS[view.m]} {view.y}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mois suivant"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-warm transition-colors hover:bg-cream hover:text-choco"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Jours de semaine */}
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d, i) => (
          <div
            key={`dow-${i}`}
            className="flex h-6 items-center justify-center font-inter text-[10px] font-semibold uppercase text-muted-warm"
          >
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-8 w-8" />;
          const d = new Date(view.y, view.m, day);
          const isSel = selected != null && sameDay(d, selected);
          const isToday = sameDay(d, today);
          const isPast = d < today;
          const cls = isSel
            ? 'bg-brand font-semibold text-white'
            : isToday
              ? 'font-semibold text-brand-dark ring-1 ring-brand/40 hover:bg-brand-soft'
              : isPast
                ? 'text-muted-warm/60 hover:bg-cream'
                : 'text-ink-warm hover:bg-brand-soft';
          return (
            <button
              key={`d-${i}`}
              type="button"
              onClick={() => pick(day)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-inter text-sm transition-colors ${cls}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Raccourcis + heure */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => jump(1)}
          className="rounded-full border border-border-soft bg-cream px-2.5 py-1 font-inter text-[11px] font-medium text-choco transition-colors hover:bg-brand-soft"
        >
          Demain
        </button>
        <button
          type="button"
          onClick={() => jump(3)}
          className="rounded-full border border-border-soft bg-cream px-2.5 py-1 font-inter text-[11px] font-medium text-choco transition-colors hover:bg-brand-soft"
        >
          +3 j
        </button>
        <button
          type="button"
          onClick={() => jump(7)}
          className="rounded-full border border-border-soft bg-cream px-2.5 py-1 font-inter text-[11px] font-medium text-choco transition-colors hover:bg-brand-soft"
        >
          +7 j
        </button>
        <button
          type="button"
          onClick={nextMonday}
          className="rounded-full border border-border-soft bg-cream px-2.5 py-1 font-inter text-[11px] font-medium text-choco transition-colors hover:bg-brand-soft"
        >
          Lun. prochain
        </button>
        <label className="ml-auto inline-flex items-center gap-1">
          <span className="font-inter text-[10px] uppercase tracking-wide text-muted-warm">
            à
          </span>
          <input
            type="time"
            value={safeTime}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Heure de la relance"
            className="rounded-lg border border-border-soft bg-white px-2 py-1 font-inter text-xs text-ink-warm focus:border-brand focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
