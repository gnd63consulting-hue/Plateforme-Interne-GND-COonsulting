'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';

type ModuleWithState = {
  slug: string;
  title: string;
  order: number;
  duration: number;
  state: 'validated' | 'available' | 'locked';
  questionsCount?: number;
  bestPercentage?: number | null;
  previousOrder?: number;
};

type FormationClientProps = {
  modules: ModuleWithState[];
  completedCount: number;
  totalCount: number;
  firstName: string;
};

export default function FormationClient({
  modules,
  completedCount,
  totalCount,
  firstName,
}: FormationClientProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const watermarkY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const watermarkOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  // Find next module to do (first available)
  const heroModuleIdx = modules.findIndex((m) => m.state === 'available');
  const heroModule = heroModuleIdx >= 0 ? modules[heroModuleIdx] : null;
  const otherModules = heroModule
    ? modules.filter((_, i) => i !== heroModuleIdx)
    : modules;

  return (
    <div className="relative flex flex-col gap-8">
      {/* ====================================================== */}
      {/* HERO — bandeau chocolat cockpit : eyebrow + titre + progression */}
      {/* ====================================================== */}
      <header
        ref={heroRef}
        className="surface-chocolate relative overflow-hidden rounded-[16px] p-5 sm:p-6"
      >
        {/* Filigrane */}
        <motion.span
          aria-hidden
          style={{ y: watermarkY, opacity: watermarkOpacity }}
          className="pointer-events-none absolute -bottom-10 right-2 select-none whitespace-nowrap font-marcellus text-[110px] leading-none tracking-tight text-cream/[0.08] sm:text-[130px]"
        >
          Formation
        </motion.span>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Identité gauche */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-[#E0A572]">
                E-learning · parcours
              </span>
            </span>
            <h1 className="mt-3 font-marcellus text-3xl leading-tight text-cream">
              Bienvenue, <span className="italic text-[#E0A572]">{firstName}</span>.
            </h1>
            <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-cream/55">
              {isComplete
                ? 'Tu as terminé le parcours. Reviens à tout moment pour réviser.'
                : `${totalCount - completedCount} module${totalCount - completedCount > 1 ? 's' : ''} à valider pour atteindre ta certification.`}
            </p>
          </motion.div>

          {/* Progression droite */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-5"
          >
            <ProgressionDial
              percent={progressPercent}
              completed={completedCount}
              total={totalCount}
            />
            <div className="flex flex-col gap-1">
              <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.13em] text-[#E0A572]">
                Avancement global
              </span>
              <span className="font-marcellus text-lg text-cream">
                {isComplete ? 'Parcours terminé' : 'En progression'}
              </span>
              <span className="font-num tabular-nums text-xs text-cream/55">
                {completedCount} / {totalCount} modules validés
              </span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ====================================================== */}
      {/* PARCOURS — liste dense de modules en cartes matière       */}
      {/* ====================================================== */}
      <section className="relative">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
                Parcours
              </span>
            </span>
            <h2 className="font-marcellus text-2xl tracking-tight text-choco">
              <span className="font-num tabular-nums">{totalCount}</span> modules
            </h2>
          </div>
          <span className="surface-ceramic rounded-full px-3.5 py-1.5 font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            <span className="font-num tabular-nums">{completedCount}</span> validé
            {completedCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {/* Module en cours — carte accent mise en avant */}
          {heroModule && (
            <Link
              href={`/formation/${heroModule.slug}`}
              className="panel-accent card-hover group relative flex flex-col justify-between gap-4 overflow-hidden rounded-[14px] p-4 md:col-span-2 xl:col-span-3"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-8 right-2 select-none font-num tabular-nums text-[110px] font-semibold leading-none text-[#3A2017]/[0.07]"
              >
                {String(heroModule.order).padStart(2, '0')}
              </span>
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-num tabular-nums text-3xl font-semibold leading-none text-[#3A2017]">
                    {String(heroModule.order).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.13em] text-[#3A2017]/70">
                      Prochain module
                    </span>
                    <h3 className="font-marcellus text-xl leading-tight text-[#2A1810]">
                      {heroModule.title}
                    </h3>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2A1810] px-4 py-2 font-grotesk text-[11px] font-semibold uppercase tracking-[0.1em] text-cream transition-all group-hover:gap-2.5">
                  Commencer
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[#3A2017]/75">
                <span className="inline-flex items-center gap-1.5 font-num tabular-nums text-xs">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {heroModule.duration} min
                </span>
                {heroModule.questionsCount !== undefined && (
                  <span className="inline-flex items-center gap-1.5 border-l border-[rgba(58,32,23,0.18)] pl-4 font-num tabular-nums text-xs">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    {heroModule.questionsCount} questions
                  </span>
                )}
              </div>
            </Link>
          )}

          {/* Autres modules — cartes matière denses */}
          {otherModules.map((mod) => {
            const numberLabel = String(mod.order).padStart(2, '0');
            const isLocked = mod.state === 'locked';
            const isValidated = mod.state === 'validated';
            const hasScore =
              mod.bestPercentage !== undefined && mod.bestPercentage !== null;

            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        'font-num tabular-nums text-2xl font-semibold leading-none ' +
                        (isLocked
                          ? 'text-choco/20'
                          : isValidated
                            ? 'text-brand-burnt'
                            : 'text-choco/40 transition-colors group-hover:text-brand-burnt')
                      }
                    >
                      {numberLabel}
                    </span>
                    <h3
                      className={
                        'font-marcellus text-base leading-tight ' +
                        (isLocked ? 'text-muted-warm' : 'text-choco')
                      }
                    >
                      {mod.title}
                    </h3>
                  </div>
                  {isValidated ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 font-grotesk text-[9px] font-semibold uppercase tracking-wider text-ok-fg">
                      <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
                      {hasScore ? (
                        <span className="font-num tabular-nums">
                          {mod.bestPercentage}%
                        </span>
                      ) : (
                        'Validé'
                      )}
                    </span>
                  ) : mod.state === 'available' ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 font-grotesk text-[9px] font-semibold uppercase tracking-wider text-info-fg">
                      <span
                        aria-hidden
                        className="h-1 w-1 animate-pulse rounded-full bg-brand"
                      />
                      À faire
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cream-deep px-2 py-0.5 font-grotesk text-[9px] font-semibold uppercase tracking-wider text-muted-warm">
                      <Lock className="h-2 w-2" aria-hidden />
                      Verrouillé
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-warm">
                    <span className="inline-flex items-center gap-1 font-num tabular-nums text-[11px]">
                      <Clock className="h-3 w-3" aria-hidden />
                      {mod.duration} min
                    </span>
                    {mod.questionsCount !== undefined && (
                      <span className="inline-flex items-center gap-1 border-l border-[rgba(74,36,26,0.07)] pl-3 font-num tabular-nums text-[11px]">
                        <BookOpen className="h-3 w-3" aria-hidden />
                        {mod.questionsCount}q
                      </span>
                    )}
                  </div>
                  {!isLocked && (
                    <ArrowUpRight
                      className={
                        'h-4 w-4 transition-transform duration-300 group-hover:rotate-45 ' +
                        (isValidated ? 'text-muted-warm' : 'text-brand-burnt')
                      }
                      aria-hidden
                    />
                  )}
                </div>

                {isLocked && mod.previousOrder !== undefined && (
                  <p className="mt-2 inline-flex items-center gap-1 font-grotesk text-[10px] text-muted-warm">
                    <Lock className="h-2.5 w-2.5" aria-hidden />
                    Débloque le{' '}
                    <span className="font-num tabular-nums">
                      {String(mod.previousOrder).padStart(2, '0')}
                    </span>{' '}
                    d&apos;abord
                  </p>
                )}
              </>
            );

            if (isLocked) {
              return (
                <div
                  key={mod.slug}
                  aria-disabled
                  className="panel relative flex cursor-not-allowed flex-col justify-between overflow-hidden rounded-[14px] p-4 opacity-60"
                >
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={mod.slug}
                href={`/formation/${mod.slug}`}
                className="panel card-hover group relative flex flex-col justify-between overflow-hidden rounded-[14px] p-4"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ====================================================== */}
      {/* CERTIFICATION — carte matière harmonisée                  */}
      {/* ====================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="surface-ceramic relative overflow-hidden rounded-[16px] p-5 sm:p-6"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 right-6 select-none font-num tabular-nums text-[120px] font-semibold leading-none text-brand/[0.08]"
        >
          {totalCount}
        </span>

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              {isComplete ? 'Formation complète' : 'Certification'}
            </span>
          </span>
          <h2 className="mt-3 font-marcellus text-2xl leading-tight text-choco sm:text-3xl">
            {isComplete ? (
              <>
                Tu es <span className="italic text-brand-dark">certifié</span> GND
                Consulting.
              </>
            ) : (
              <>
                <span className="font-num tabular-nums">{totalCount}</span> modules
                pour devenir{' '}
                <span className="italic text-brand-dark">certifié</span>.
              </>
            )}
          </h2>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-[#6F5A50]">
            {isComplete
              ? 'Tu peux revenir à tout moment sur les modules pour réviser. Le savoir reste accessible.'
              : 'Chaque module se valide avec un quiz à 70 % minimum. Tu peux retenter autant de fois que nécessaire.'}
          </p>
        </div>
      </motion.section>
    </div>
  );
}

function ProgressionDial({
  percent,
  completed,
  total,
}: {
  percent: number;
  completed: number;
  total: number;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 130 130"
        aria-hidden
      >
        {/* Background ring */}
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="#FBF1E8"
          strokeOpacity="0.18"
          strokeWidth="4"
        />
        {/* Progress ring */}
        <motion.circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="url(#progress-gradient-inline)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        />
        <defs>
          <linearGradient id="progress-gradient-inline" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C96A2B" />
            <stop offset="100%" stopColor="#F39253" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex flex-col items-center text-center">
        <span className="font-num tabular-nums text-2xl font-semibold leading-none text-cream sm:text-3xl">
          {percent}
          <span className="text-base text-cream/55">%</span>
        </span>
        <span className="mt-1 font-num tabular-nums text-[9px] uppercase tracking-[0.18em] text-cream/55">
          {completed} / {total}
        </span>
      </div>
    </div>
  );
}
