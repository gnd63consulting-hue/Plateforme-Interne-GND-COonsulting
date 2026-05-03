'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, CheckCircle2, Clock, Lock } from 'lucide-react';
import type { ModuleMeta } from '@/lib/modules-registry';
import { cn } from '@/lib/utils';

type ModuleCardProps = {
  module: ModuleMeta;
  state: 'validated' | 'available' | 'locked';
  questionsCount?: number;
  bestPercentage?: number | null;
  previousOrder?: number;
  index?: number;
};

export default function ModuleCard({
  module,
  state,
  questionsCount,
  bestPercentage,
  previousOrder,
  index = 0,
}: ModuleCardProps) {
  const numberLabel = String(module.order).padStart(2, '0');

  const baseClasses = cn(
    'group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white p-7 transition-all duration-500 will-change-transform',
    state === 'locked'
      ? 'cursor-not-allowed border-gnd-bronze/8 opacity-60'
      : 'border-gnd-bronze/10 shadow-warm hover:-translate-y-1 hover:border-gnd-bronze/20 hover:shadow-warm-xl'
  );

  const inner = (
    <>
      {/* Subtle warm glow on hover (available + validated) */}
      {state !== 'locked' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gnd-amber/0 blur-3xl transition-all duration-700 group-hover:bg-gnd-amber/15"
        />
      )}

      {/* Top row — number + status */}
      <div className="relative mb-10 flex items-start justify-between">
        <span
          className={cn(
            'font-display text-6xl font-medium leading-none tracking-tight',
            state === 'locked'
              ? 'text-gnd-bronze/15'
              : state === 'validated'
                ? 'italic text-gnd-amber'
                : 'italic text-gnd-bronze/30 transition-all duration-500 group-hover:text-gnd-amber'
          )}
        >
          {numberLabel}
        </span>
        <StatusChip state={state} bestPercentage={bestPercentage} />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'mb-6 font-display text-xl font-medium leading-tight tracking-tight',
          state === 'locked' ? 'text-gnd-bronze-faded' : 'text-gnd-bronze'
        )}
      >
        {module.title}
      </h3>

      {/* Meta row */}
      <div className="mt-auto flex items-center gap-4 text-xs font-medium text-gnd-bronze-soft">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {module.duration} min
        </span>
        {questionsCount !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {questionsCount} question{questionsCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* CTA — hover-revealed for available, always-on for validated */}
      {state === 'available' && (
        <div className="relative mt-6 overflow-hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-gnd-amber transition-all duration-300 group-hover:gap-3">
            <span>Continuer le module</span>
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45"
              aria-hidden
            />
          </div>
        </div>
      )}

      {state === 'validated' && (
        <div className="mt-6 flex items-center gap-2 text-sm text-gnd-bronze-soft">
          <span>Revoir le module</span>
          <ArrowUpRight
            className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-45"
            aria-hidden
          />
        </div>
      )}

      {state === 'locked' && previousOrder !== undefined && (
        <p className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-gnd-bronze-faded">
          <Lock className="h-3 w-3" aria-hidden />
          Complète le Module {String(previousOrder).padStart(2, '0')} pour
          déverrouiller
        </p>
      )}

      {/* Validated bottom hairline accent */}
      {state === 'validated' && (
        <div
          aria-hidden
          className={cn(
            'absolute bottom-0 left-0 h-[2px] w-full',
            bestPercentage !== undefined &&
              bestPercentage !== null &&
              bestPercentage < 80
              ? 'bg-gradient-to-r from-transparent via-gnd-amber-dim to-transparent'
              : 'bg-gradient-to-r from-transparent via-gnd-amber to-transparent'
          )}
        />
      )}
    </>
  );

  if (state === 'locked') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: index * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        aria-disabled
        className={baseClasses}
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={`/formation/${module.slug}`} className={baseClasses}>
        {inner}
      </Link>
    </motion.div>
  );
}

function StatusChip({
  state,
  bestPercentage,
}: {
  state: ModuleCardProps['state'];
  bestPercentage?: number | null;
}) {
  if (state === 'validated') {
    const hasScore = bestPercentage !== undefined && bestPercentage !== null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gnd-amber/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gnd-amber-dim">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        {hasScore ? `${bestPercentage}%` : 'Validé'}
      </span>
    );
  }
  if (state === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gnd-bronze">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-gnd-amber animate-pulse"
        />
        À faire
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gnd-bronze-faded">
      <Lock className="h-2.5 w-2.5" aria-hidden />
      Verrouillé
    </span>
  );
}
