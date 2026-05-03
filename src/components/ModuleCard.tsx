'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
} from 'lucide-react';
import type { ModuleMeta } from '@/lib/modules-registry';
import { cn } from '@/lib/utils';

type ModuleCardProps = {
  module: ModuleMeta;
  state: 'validated' | 'available' | 'locked';
  questionsCount?: number;
  bestPercentage?: number | null;
  previousOrder?: number;
  index?: number;
  variant?: 'hero' | 'default';
};

export default function ModuleCard({
  module,
  state,
  questionsCount,
  bestPercentage,
  previousOrder,
  index = 0,
  variant = 'default',
}: ModuleCardProps) {
  if (variant === 'hero') {
    return (
      <HeroVariant
        module={module}
        state={state}
        questionsCount={questionsCount}
        bestPercentage={bestPercentage}
        previousOrder={previousOrder}
        index={index}
      />
    );
  }

  return (
    <DefaultVariant
      module={module}
      state={state}
      questionsCount={questionsCount}
      bestPercentage={bestPercentage}
      previousOrder={previousOrder}
      index={index}
    />
  );
}

// =====================================================================
// HERO VARIANT — grosse card 2x2 pour le module en cours à faire
// =====================================================================
function HeroVariant({
  module,
  state,
  questionsCount,
  index = 0,
}: Omit<ModuleCardProps, 'variant'>) {
  const numberLabel = String(module.order).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        href={`/formation/${module.slug}`}
        className="group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border border-gnd-bronze/15 bg-gradient-to-br from-gnd-bronze via-gnd-bronze to-gnd-ink p-10 text-gnd-cream shadow-warm-lg transition-all duration-500 hover:shadow-warm-xl"
      >
        {/* Architectural corner brackets */}
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />

        {/* Warm glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-gnd-amber/15 blur-3xl transition-all duration-700 group-hover:bg-gnd-amber/25"
        />

        {/* Watermark number */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-12 right-2 select-none font-display text-[14rem] font-medium italic leading-none text-gnd-cream/[0.06]"
        >
          {numberLabel}
        </span>

        {/* Top: badge */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gnd-amber/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-glow">
            <Sparkles className="h-3 w-3" aria-hidden />
            Prochain module
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-gnd-cream/40">
            Module {numberLabel}
          </span>
        </div>

        {/* Center: title */}
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-display-md font-medium leading-tight tracking-tight text-gnd-cream">
            {module.title}
          </h2>
          <p className="mt-4 text-sm text-gnd-cream/60">
            Découvre les fondamentaux et valide tes acquis avec le quiz
            associé.
          </p>
        </div>

        {/* Bottom: meta + CTA */}
        <div className="relative z-10 flex items-end justify-between">
          <div className="flex items-center gap-4 text-xs text-gnd-cream/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {module.duration} min
            </span>
            {questionsCount !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                {questionsCount} questions
              </span>
            )}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gnd-amber px-5 py-2.5 text-xs font-semibold text-gnd-bronze transition-all group-hover:gap-3 group-hover:bg-gnd-amber-glow">
            Commencer
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// =====================================================================
// DEFAULT VARIANT — cards normales
// =====================================================================
function DefaultVariant({
  module,
  state,
  questionsCount,
  bestPercentage,
  previousOrder,
  index = 0,
}: Omit<ModuleCardProps, 'variant'>) {
  const numberLabel = String(module.order).padStart(2, '0');

  const baseClasses = cn(
    'group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border bg-white p-6 transition-all duration-500',
    state === 'locked'
      ? 'cursor-not-allowed border-gnd-bronze/8 opacity-60'
      : 'border-gnd-bronze/10 hover:-translate-y-1 hover:border-gnd-bronze/20 hover:shadow-warm-lg'
  );

  const inner = (
    <>
      {state !== 'locked' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gnd-amber/0 blur-3xl transition-all duration-700 group-hover:bg-gnd-amber/15"
        />
      )}

      {/* Top: number + status */}
      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            'font-display text-5xl font-medium italic leading-none tracking-tight',
            state === 'locked'
              ? 'text-gnd-bronze/15'
              : state === 'validated'
                ? 'text-gnd-amber'
                : 'text-gnd-bronze/30 transition-colors duration-500 group-hover:text-gnd-amber'
          )}
        >
          {numberLabel}
        </span>
        <StatusChip state={state} bestPercentage={bestPercentage} />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'mt-6 font-display text-lg font-medium leading-tight tracking-tight',
          state === 'locked' ? 'text-gnd-bronze-faded' : 'text-gnd-bronze'
        )}
      >
        {module.title}
      </h3>

      {/* Meta + CTA bottom */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] font-medium text-gnd-bronze-soft">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {module.duration}min
          </span>
          {questionsCount !== undefined && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" aria-hidden />
              {questionsCount}q
            </span>
          )}
        </div>

        {state === 'available' && (
          <ArrowUpRight
            className="h-4 w-4 text-gnd-amber transition-transform duration-500 group-hover:rotate-45"
            aria-hidden
          />
        )}
        {state === 'validated' && (
          <ArrowUpRight
            className="h-3.5 w-3.5 text-gnd-bronze-soft transition-transform duration-500 group-hover:rotate-45"
            aria-hidden
          />
        )}
      </div>

      {state === 'locked' && previousOrder !== undefined && (
        <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-gnd-bronze-faded">
          <Lock className="h-2.5 w-2.5" aria-hidden />
          Débloque le {String(previousOrder).padStart(2, '0')} d&apos;abord
        </p>
      )}

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
        transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        aria-disabled
        className={cn(baseClasses, 'h-full')}
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link href={`/formation/${module.slug}`} className={cn(baseClasses, 'h-full')}>
        {inner}
      </Link>
    </motion.div>
  );
}

// =====================================================================
// Sub-components
// =====================================================================
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
      <span className="inline-flex items-center gap-1 rounded-full bg-gnd-amber/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gnd-amber-dim">
        <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
        {hasScore ? `${bestPercentage}%` : 'Validé'}
      </span>
    );
  }
  if (state === 'available') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gnd-bronze/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gnd-bronze">
        <span
          aria-hidden
          className="h-1 w-1 animate-pulse rounded-full bg-gnd-amber"
        />
        À faire
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gnd-bronze/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gnd-bronze-faded">
      <Lock className="h-2 w-2" aria-hidden />
      Verrouillé
    </span>
  );
}

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positions = {
    tl: 'left-3 top-3 border-l border-t',
    tr: 'right-3 top-3 border-r border-t',
    bl: 'left-3 bottom-3 border-l border-b',
    br: 'right-3 bottom-3 border-r border-b',
  };
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute h-3 w-3 border-gnd-amber/40',
        positions[position]
      )}
    />
  );
}
