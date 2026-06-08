'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  "Lire les scripts d'appel (Appel 1, 2, 3)",
  'Consulter le site démo à montrer aux prospects',
  'Découvrir ta liste de prospects',
  'Lancer ta prospection',
  'Suivre la formation (7 modules · quiz)',
];

export function OnboardingChecklist({ storageKey }: { storageKey: string }) {
  const [done, setDone] = useState<boolean[]>(() => STEPS.map(() => false));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) setDone(STEPS.map((_, i) => Boolean(arr[i])));
      }
    } catch {
      // ignore corrupted storage
    }
  }, [storageKey]);

  function toggle(i: number) {
    setDone((prev) => {
      const next = prev.map((v, idx) => (idx === i ? !v : v));
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }

  const completed = done.filter(Boolean).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
          {completed}/{STEPS.length} terminé{completed > 1 ? 's' : ''}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gnd-bronze/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gnd-amber to-gnd-amber-dim transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const checked = done[i];
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-center gap-3 rounded-xl border border-gnd-bronze/10 bg-white/60 px-4 py-3 text-left transition-all hover:border-gnd-bronze/25 hover:shadow-warm"
              >
                <span
                  className={
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ' +
                    (checked
                      ? 'border-gnd-amber bg-gnd-amber text-white'
                      : 'border-gnd-bronze/25 bg-white')
                  }
                >
                  {checked && <Check className="h-3.5 w-3.5" aria-hidden />}
                </span>
                <span
                  className={
                    'text-sm transition-colors ' +
                    (checked
                      ? 'text-gnd-bronze-soft line-through'
                      : 'text-gnd-bronze')
                  }
                >
                  {step}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
