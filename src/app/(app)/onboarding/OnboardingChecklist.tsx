'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, PartyPopper } from 'lucide-react';

const STEPS = [
  "Lire les scripts d'appel (Appel 1, 2, 3)",
  'Consulter le site démo à montrer aux prospects',
  'Découvrir ta liste de prospects',
  'Lancer ta prospection',
  'Suivre la formation (7 modules · quiz)',
];

function Ring({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="rgba(74,45,40,0.10)"
        strokeWidth="4"
      />
      <motion.circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="#E8853D"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        animate={{ strokeDashoffset: c - (pct / 100) * c }}
        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        transform="rotate(-90 22 22)"
      />
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gnd-bronze font-display"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {pct}%
      </text>
    </svg>
  );
}

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
  const allDone = completed === STEPS.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Ring pct={pct} />
        <div>
          <p className="font-display text-base font-medium text-gnd-bronze">
            {allDone ? 'Tout est prêt 🎉' : 'Ta checklist de démarrage'}
          </p>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-gnd-amber">
            {completed}/{STEPS.length} terminé{completed > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const checked = done[i];
          return (
            <li key={i}>
              <motion.button
                type="button"
                onClick={() => toggle(i)}
                whileTap={{ scale: 0.99 }}
                className={
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ' +
                  (checked
                    ? 'border-gnd-amber/30 bg-gnd-amber/[0.06]'
                    : 'border-gnd-bronze/10 bg-white/60 hover:border-gnd-bronze/25 hover:shadow-warm')
                }
              >
                <span
                  className={
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ' +
                    (checked
                      ? 'border-gnd-amber bg-gnd-amber text-white'
                      : 'border-gnd-bronze/25 bg-white')
                  }
                >
                  <AnimatePresence>
                    {checked && (
                      <motion.span
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
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
              </motion.button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-gnd-amber/25 bg-gradient-to-r from-gnd-amber/10 to-gnd-cream/40 px-4 py-3"
          >
            <PartyPopper className="h-5 w-5 shrink-0 text-gnd-amber" aria-hidden />
            <p className="text-sm font-medium text-gnd-bronze">
              Bravo, tu es prêt à closer. Lance ta prospection !
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
