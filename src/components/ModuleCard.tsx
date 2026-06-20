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
        className="group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border border-choco/15 bg-gradient-to-br from-choco via-choco to-ink-warm p-10 text-cream shadow-soft-lg transition-all duration-500 hover:shadow-soft-lg"
      >
        {/* Architectural corner brackets */}
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />

        {/* Warm glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand/15 blur-3xl transition-all duration-700 group-hover:bg-brand/25"
        />

        {/* Watermark number */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-12 right-2 select-none font-marcellus text-[14rem] font-medium italic leading-none text-cream/[0.06]"
        >
          {numberLabel}
        </span>

        {/* Top: badge */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            <Sparkles className="h-3 w-3" aria-hidden />
            Prochain module
          </span>
          <span className="font-inter text-[10px] font-medium uppercase tracking-[0.18em] text-cream/40">
            Module {numberLabel}
          </span>
        </div>

        {/* Center: title */}
        <div className="relative z-10 max-w-md">
          <h2 className="font-marcellus text-display-md font-medium leading-tight tracking-tight text-cream">
            {module.title}
          </h2>
          <p className="mt-4 text-sm text-cream/60">
            Découvre les fondamentaux et valide tes acquis avec le quiz
            associé.
          </p>
        </div>

        {/* Bottom: meta + CTA */}
        <div className="relative z-10 flex items-end justify-between">
          <div className="flex items-center gap-4 text-xs text-cream/60">
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
          <div className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-xs font-semibold text-choco transition-all group-hover:gap-3 group-hover:bg-brand-dark">
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
      ? 'cursor-not-allowed border-border-soft opacity-60'
      : 'border-border-soft hover:-translate-y-1 hover:border-choco/20 hover:shadow-soft-lg'
  );

  const inner = (
    <>
      {state !== 'locked' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-brand/0 blur-3xl transition-all duration-700 group-hover:bg-brand/15"
        />
      )}

      {/* Top: number + status */}
      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            'font-marcellus text-5xl font-medium italic leading-none tracking-tight',
            state === 'locked'
              ? 'text-choco/15'
              : state === 'validated'
                ? 'text-brand'
                : 'text-choco/30 transition-colors duration-500 group-hover:text-brand'
          )}
        >
          {numberLabel}
        </span>
        <StatusChip state={state} bestPercentage={bestPercentage} />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'mt-6 font-marcellus text-lg font-medium leading-tight tracking-tight',
          state === 'locked' ? 'text-muted-warm' : 'text-choco'
        )}
      >
        {module.title}
      </h3>

      {/* Meta + CTA bottom */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-warm">
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
            className="h-4 w-4 text-brand transition-transform duration-500 group-hover:rotate-45"
            aria-hidden
          />
        )}
        {state === 'validated' && (
          <ArrowUpRight
            className="h-3.5 w-3.5 text-muted-warm transition-transform duration-500 group-hover:rotate-45"
            aria-hidden
          />
        )}
      </div>

      {state === 'locked' && previousOrder !== undefined && (
        <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-muted-warm">
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
              ? 'bg-gradient-to-r from-transparent via-brand-dark to-transparent'
              : 'bg-gradient-to-r from-transparent via-brand to-transparent'
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
      <span className="inline-flex items-center gap-1 rounded-full bg-brand/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-dark">
        <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
        {hasScore ? `${bestPercentage}%` : 'Validé'}
      </span>
    );
  }
  if (state === 'available') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-choco/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-choco">
        <span
          aria-hidden
          className="h-1 w-1 animate-pulse rounded-full bg-brand"
        />
        À faire
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-choco/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-warm">
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
        'pointer-events-none absolute h-3 w-3 border-brand/40',
        positions[position]
      )}
    />
  );
}
