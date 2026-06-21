'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import ModuleCard from '@/components/ModuleCard';
import FormationHeroVisual from '@/components/FormationHeroVisual';

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
    <div className="relative">
      {/* ====================================================== */}
      {/* Hero — split in 2: text+dial left, 3D scene right        */}
      {/* ====================================================== */}
      <header
        ref={heroRef}
        className="surface-accent relative mb-20 grid min-h-[70vh] grid-cols-1 items-center gap-12 overflow-hidden rounded-[32px] px-6 py-12 shadow-soft-md hairline sm:px-10 sm:py-14 lg:grid-cols-[7fr_5fr] lg:gap-16 lg:px-14"
      >
        {/* Watermark FORMATION */}
        <motion.span
          aria-hidden
          style={{ y: watermarkY, opacity: watermarkOpacity }}
          className="watermark pointer-events-none absolute -bottom-10 -left-4 select-none whitespace-nowrap font-marcellus text-[20vw] font-medium leading-none tracking-tighter text-choco/[0.04] sm:-bottom-20 sm:text-[16rem]"
        >
          Formation.
        </motion.span>

        {/* Soft warm halos for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand-pale/40 blur-3xl"
        />

        {/* Left column — title + intro + dial */}
        <div className="relative z-10 flex flex-col gap-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="label-eyebrow mb-5 flex items-center gap-2">
              <span className="h-px w-8 bg-brand" />
              <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
                E-learning path
              </span>
            </div>
            <h1 className="font-marcellus text-display-xl font-medium leading-[0.95] tracking-tight text-choco">
              Bienvenue,
              <br />
              <span className="italic text-brand-dark">{firstName}.</span>
            </h1>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-[#6F5A50] sm:text-lg">
              {isComplete
                ? "Tu as terminé le parcours. Reviens à tout moment pour réviser."
                : `${totalCount - completedCount} module${totalCount - completedCount > 1 ? 's' : ''} à valider pour atteindre ta certification.`}
            </p>
          </motion.div>

          {/* Progression dial sits below title on mobile, beside on tablet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="surface-ceramic flex items-center gap-6 rounded-3xl p-6 shadow-soft hairline"
          >
            <ProgressionDial
              percent={progressPercent}
              completed={completedCount}
              total={totalCount}
            />
            <div className="flex flex-col gap-1">
              <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
                Avancement global
              </span>
              <span className="font-marcellus text-lg font-medium text-choco">
                {isComplete ? 'Parcours terminé' : 'En progression'}
              </span>
              <span className="mt-0.5 font-inter text-xs text-[#6F5A50]">
                {completedCount} / {totalCount} modules validés
              </span>
            </div>
          </motion.div>
        </div>

        {/* Right column — 3D scene */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <FormationHeroVisual
            percent={progressPercent}
            completed={completedCount}
            total={totalCount}
            nextModuleTitle={heroModule?.title ?? 'Tous les modules sont validés'}
            nextModuleOrder={heroModule?.order ?? totalCount}
          />
        </motion.div>
      </header>

      {/* ====================================================== */}
      {/* Bento grid — hero card + smaller cards                   */}
      {/* ====================================================== */}
      <section className="relative">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="label-eyebrow flex items-center gap-2">
              <span className="h-px w-8 bg-brand" />
              <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
                Parcours
              </span>
            </div>
            <h2 className="font-marcellus text-2xl font-medium tracking-tight text-choco sm:text-3xl">
              {totalCount} modules
            </h2>
          </div>
          <span className="surface-glass rounded-full px-4 py-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt shadow-glass">
            {completedCount} validé{completedCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]">
          {/* Hero card (next module to do) takes 4 cols + 2 rows */}
          {heroModule && (
            <div className="card-hover lg:col-span-4 lg:row-span-2">
              <ModuleCard
                module={{
                  slug: heroModule.slug,
                  title: heroModule.title,
                  order: heroModule.order,
                  duration: heroModule.duration,
                }}
                state={heroModule.state}
                questionsCount={heroModule.questionsCount}
                bestPercentage={heroModule.bestPercentage}
                previousOrder={heroModule.previousOrder}
                index={0}
                variant="hero"
              />
            </div>
          )}

          {/* Other cards take 2 cols each */}
          {otherModules.map((mod, idx) => (
            <div key={mod.slug} className="card-hover lg:col-span-2">
              <ModuleCard
                module={{
                  slug: mod.slug,
                  title: mod.title,
                  order: mod.order,
                  duration: mod.duration,
                }}
                state={mod.state}
                questionsCount={mod.questionsCount}
                bestPercentage={mod.bestPercentage}
                previousOrder={mod.previousOrder}
                index={idx + 1}
                variant="default"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================== */}
      {/* Certification CTA — carte CREME harmonisee (plus d'orange plein) */}
      {/* ====================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="surface-ceramic relative mt-20 overflow-hidden rounded-3xl p-10 text-ink-warm shadow-soft-md hairline md:p-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-brand/[0.07] blur-3xl"
        />
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-20 right-10 select-none font-marcellus text-[14rem] font-medium italic leading-none text-brand/[0.08] sm:text-[18rem]"
        >
          {totalCount}
        </span>

        <div className="relative max-w-2xl">
          <div className="label-eyebrow mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-brand" />
            <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
              {isComplete ? 'Formation complète' : 'Certification'}
            </span>
          </div>
          <h2 className="font-marcellus text-display-md font-medium leading-tight text-choco">
            {isComplete ? (
              <>
                Tu es{' '}
                <span className="italic text-brand-dark">certifié</span>
                {' '}GND Consulting.
              </>
            ) : (
              <>
                {totalCount} modules pour devenir{' '}
                <span className="italic text-brand-dark">certifié</span>
                .
              </>
            )}
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[#6F5A50]">
            {isComplete
              ? "Tu peux revenir à tout moment sur les modules pour réviser. Le savoir reste accessible."
              : "Chaque module se valide avec un quiz à 70 % minimum. Tu peux retenter autant de fois que nécessaire."}
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
    <div className="relative inline-flex h-32 w-32 items-center justify-center md:h-36 md:w-36">
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
          stroke="#532418"
          strokeOpacity="0.08"
          strokeWidth="3"
        />
        {/* Progress ring */}
        <motion.circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="url(#progress-gradient-inline)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        />
        <defs>
          <linearGradient id="progress-gradient-inline" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4732A" />
            <stop offset="100%" stopColor="#FFA060" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex flex-col items-center text-center">
        <span className="font-marcellus text-3xl font-medium leading-none text-choco md:text-4xl">
          {percent}
          <span className="text-lg text-muted-warm">%</span>
        </span>
        <span className="mt-1 font-inter text-[9px] uppercase tracking-[0.18em] text-muted-warm">
          {completed} / {total}
        </span>
      </div>
    </div>
  );
}
