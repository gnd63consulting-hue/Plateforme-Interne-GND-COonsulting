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

  const heroModuleIdx = modules.findIndex((m) => m.state === 'available');
  const heroModule = heroModuleIdx >= 0 ? modules[heroModuleIdx] : null;
  const otherModules = heroModule
    ? modules.filter((_, i) => i !== heroModuleIdx)
    : modules;

  return (
    <div className="relative">
      {/* ====================================================== */}
      {/* Hero with parallax watermark + 3D scene                  */}
      {/* ====================================================== */}
      <header
        ref={heroRef}
        className="relative mb-20 flex min-h-[70vh] flex-col justify-end overflow-hidden"
      >
        {/* Watermark FORMATION */}
        <motion.span
          aria-hidden
          style={{ y: watermarkY, opacity: watermarkOpacity }}
          className="pointer-events-none absolute -bottom-10 -left-4 select-none whitespace-nowrap font-display text-[20vw] font-medium leading-none tracking-tighter text-gnd-bronze/[0.04] sm:-bottom-20 sm:text-[16rem]"
        >
          Formation.
        </motion.span>

        <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Title + intro — left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-8 bg-gnd-amber" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
                E-learning path
              </span>
            </div>
            <h1 className="font-display text-display-xl font-medium leading-[0.95] tracking-tight text-gnd-bronze">
              Bienvenue,
              <br />
              <span className="italic text-gnd-amber">{firstName}.</span>
            </h1>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-gnd-bronze-soft sm:text-lg">
              {isComplete
                ? "Tu as terminé le parcours. Reviens à tout moment pour réviser."
                : `${totalCount - completedCount} module${totalCount - completedCount > 1 ? 's' : ''} à valider pour atteindre ta certification.`}
            </p>
          </motion.div>

          {/* 3D scene — right */}
          <div className="flex justify-center lg:justify-end">
            <FormationHeroVisual
              percent={progressPercent}
              completed={completedCount}
              total={totalCount}
              nextModuleTitle={heroModule?.title}
              nextModuleOrder={heroModule?.order}
            />
          </div>
        </div>
      </header>

      {/* ====================================================== */}
      {/* Bento grid                                                */}
      {/* ====================================================== */}
      <section className="relative">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-gnd-bronze/30" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-gnd-bronze-soft">
              {totalCount} modules
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-bronze-soft">
            {completedCount} validé{completedCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[minmax(220px,auto)]">
          {heroModule && (
            <div className="lg:col-span-4 lg:row-span-2">
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

          {otherModules.map((mod, idx) => (
            <div key={mod.slug} className="lg:col-span-2">
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
      {/* Certification CTA                                         */}
      {/* ====================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-20 overflow-hidden rounded-3xl border border-gnd-bronze/10 bg-gnd-bronze p-10 text-gnd-cream md:p-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gnd-amber/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-gnd-amber/10 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-10 select-none font-display text-[14rem] font-medium italic leading-none text-gnd-cream/[0.04] sm:text-[18rem]"
        >
          {totalCount}
        </span>

        <div className="relative max-w-2xl">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
            {isComplete ? 'Formation complète' : 'Certification'}
          </p>
          <h2 className="font-display text-display-md font-medium leading-tight text-gnd-cream">
            {isComplete ? (
              <>
                Tu es{' '}
                <span className="italic text-gnd-amber">certifié</span>
                {' '}GND Consulting.
              </>
            ) : (
              <>
                {totalCount} modules pour devenir{' '}
                <span className="italic text-gnd-amber">certifié</span>
                .
              </>
            )}
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-gnd-cream/70">
            {isComplete
              ? "Tu peux revenir à tout moment sur les modules pour réviser. Le savoir reste accessible."
              : "Chaque module se valide avec un quiz à 70 % minimum. Tu peux retenter autant de fois que nécessaire."}
          </p>
        </div>
      </motion.section>
    </div>
  );
}
