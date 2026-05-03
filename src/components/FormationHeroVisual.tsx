'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type FormationHeroVisualProps = {
  percent: number;
  completed: number;
  total: number;
  nextModuleTitle?: string;
  nextModuleOrder?: number;
};

/**
 * Scène 3D éditoriale qui occupe la moitié droite du hero Formation.
 *
 * Architecture des cards : chaque carte = OUTER static div (perspective
 * placement via style.transform) > INNER motion.div (float anim + opacity
 * reveal). Cette séparation empêche framer-motion de wiper le transform
 * 3D static quand il anime y/opacity.
 */
export default function FormationHeroVisual({
  percent,
  completed,
  total,
  nextModuleTitle = 'Module en cours',
  nextModuleOrder = 1,
}: FormationHeroVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Motion values for mouse-tilt parallax
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(rawX, { stiffness: 80, damping: 20 });
  const tiltY = useSpring(rawY, { stiffness: 80, damping: 20 });
  const rotateY = useTransform(tiltX, [-1, 1], [-12, 12]);
  const rotateX = useTransform(tiltY, [-1, 1], [8, -8]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    rawX.set(x);
    rawY.set(y);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  const orderLabel = String(nextModuleOrder).padStart(2, '0');
  const prevOrderLabel = String(Math.max(1, nextModuleOrder - 1)).padStart(2, '0');
  const nextOrderLabel = String(Math.min(total, nextModuleOrder + 1)).padStart(2, '0');

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative aspect-[4/5] w-full max-w-md mx-auto lg:max-w-none"
      style={{ perspective: '1400px' }}
    >
      {/* ============================================== */}
      {/* Pulsing amber orb backdrop                       */}
      {/* ============================================== */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.75, 0.55] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gnd-amber/30 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ scale: [1.05, 0.95, 1.05], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gnd-amber-glow/40 blur-2xl"
      />

      {/* ============================================== */}
      {/* Floating particles                               */}
      {/* ============================================== */}
      {mounted &&
        PARTICLE_POSITIONS.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -30, -60],
              x: [0, p.drift, p.drift * 1.3],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeOut',
            }}
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-gnd-amber"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
          />
        ))}

      {/* ============================================== */}
      {/* 3D stacked cards                                 */}
      {/* ============================================== */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative h-full w-full"
      >
        {/* ----- Back card — previous validated module ----- */}
        <div
          className="absolute left-0 top-0 h-[60%] w-[68%]"
          style={{ transform: 'translateZ(-80px) translateY(-12%) translateX(-18%) rotate(-6deg)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.1 },
              y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 },
            }}
            className="relative h-full w-full rounded-3xl border border-gnd-bronze/10 bg-gnd-paper p-5 shadow-warm-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze-faded">
                Module {prevOrderLabel}
              </span>
              <CheckCircle2 className="h-3.5 w-3.5 text-gnd-bronze-faded" aria-hidden />
            </div>
            <p className="mt-4 font-display text-base font-medium leading-tight text-gnd-bronze-soft">
              Validé
            </p>
            <span
              aria-hidden
              className="absolute -bottom-2 right-3 font-display text-7xl font-medium italic leading-none text-gnd-bronze/[0.06]"
            >
              {prevOrderLabel}
            </span>
          </motion.div>
        </div>

        {/* ----- Middle card — current active module (HERO) ----- */}
        <div
          className="absolute left-1/2 top-1/2 h-[58%] w-[78%]"
          style={{ transform: 'translate(-50%, -50%) translateZ(0px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
            transition={{
              opacity: { duration: 0.9, delay: 0.25 },
              scale: { duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
            }}
            className="relative h-full w-full overflow-hidden rounded-3xl border border-gnd-bronze/15 bg-gradient-to-br from-gnd-bronze via-gnd-bronze to-gnd-ink p-6 text-gnd-cream shadow-warm-xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gnd-amber/30 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-gnd-amber" aria-hidden />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
                  Module {orderLabel}
                </span>
              </div>
              <span className="rounded-full bg-gnd-amber/15 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
                En cours
              </span>
            </div>

            <p className="mt-5 font-display text-lg font-medium leading-tight text-gnd-cream sm:text-xl">
              {nextModuleTitle}
            </p>

            {/* Shimmer progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-gnd-cream/60">
                <span>Progression</span>
                <span className="text-gnd-amber">{percent}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gnd-cream/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative h-full rounded-full bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%]"
                  />
                </motion.div>
              </div>
            </div>

            <span
              aria-hidden
              className="absolute -bottom-3 right-4 font-display text-8xl font-medium italic leading-none text-gnd-amber/15"
            >
              {orderLabel}
            </span>
          </motion.div>
        </div>

        {/* ----- Front card — upcoming module ----- */}
        <div
          className="absolute right-0 top-0 h-[52%] w-[60%]"
          style={{ transform: 'translateZ(80px) translateY(38%) translateX(22%) rotate(7deg)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: [0, -4, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.4 },
              y: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
            }}
            className="relative h-full w-full rounded-3xl border border-gnd-bronze/10 bg-gnd-cream/95 p-5 backdrop-blur-sm shadow-warm-lg"
          >
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze-faded">
              Module {nextOrderLabel}
            </span>
            <p className="mt-3 font-display text-sm font-medium leading-tight text-gnd-bronze-soft">
              À venir
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-gnd-bronze/20" />
              <span className="h-1 w-1 rounded-full bg-gnd-bronze/20" />
              <span className="h-1 w-1 rounded-full bg-gnd-bronze/20" />
            </div>
            <span
              aria-hidden
              className="absolute -bottom-2 right-3 font-display text-6xl font-medium italic leading-none text-gnd-bronze/[0.05]"
            >
              {nextOrderLabel}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ============================================== */}
      {/* Floating progression dial — top right            */}
      {/* ============================================== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -right-2 -top-2 z-10 flex flex-col items-center justify-center rounded-2xl border border-gnd-bronze/10 bg-white/85 px-4 py-3 shadow-warm-lg backdrop-blur-md"
      >
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-gnd-bronze-soft">
          Avancement
        </span>
        <span className="mt-0.5 font-display text-3xl font-medium leading-none text-gnd-bronze">
          {percent}
          <span className="text-base text-gnd-bronze-soft">%</span>
        </span>
        <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-gnd-bronze-faded">
          {completed}/{total}
        </span>
      </motion.div>
    </div>
  );
}

// Stable particle positions (avoids hydration mismatch from Math.random)
const PARTICLE_POSITIONS = [
  { left: 18, top: 72, drift: 8, duration: 4.2, delay: 0 },
  { left: 38, top: 84, drift: -6, duration: 5.0, delay: 0.6 },
  { left: 62, top: 76, drift: 10, duration: 4.6, delay: 1.2 },
  { left: 78, top: 68, drift: -8, duration: 5.4, delay: 1.8 },
  { left: 28, top: 58, drift: 6, duration: 4.8, delay: 2.4 },
  { left: 70, top: 88, drift: -4, duration: 5.2, delay: 3.0 },
];
