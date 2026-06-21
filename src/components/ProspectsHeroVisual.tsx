'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Briefcase, Target, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ProspectsHeroVisualProps = {
  total: number;
  contacted: number;
  signed: number;
};

/**
 * Scène 3D hero pour la page Prospects — pile de 3 cards prospects en
 * perspective qui représente le pipeline (à contacter / contacté / signé).
 */
export default function ProspectsHeroVisual({
  total,
  contacted,
  signed,
}: ProspectsHeroVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative aspect-[4/5] w-full max-w-md mx-auto lg:max-w-none"
      style={{ perspective: '1400px' }}
    >
      {/* Pulsing amber orb backdrop */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.75, 0.55] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/30 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ scale: [1.05, 0.95, 1.05], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/40 blur-2xl"
      />

      {/* Floating particles */}
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
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-brand"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
          />
        ))}

      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative h-full w-full"
      >
        {/* Back card — à contacter */}
        <div
          className="absolute left-0 top-0 h-[58%] w-[68%]"
          style={{ transform: 'translateZ(-80px) translateY(-8%) translateX(-18%) rotate(-6deg)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.1 },
              y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 },
            }}
            className="relative h-full w-full rounded-3xl border border-[rgba(74,36,26,0.12)] bg-cream p-5 shadow-warm-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-warm">
                À contacter
              </span>
              <Target className="h-3.5 w-3.5 text-muted-warm" aria-hidden />
            </div>
            <p className="mt-4 font-display text-3xl font-medium leading-none text-[#6F5A50]">
              {Math.max(0, total - contacted)}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-warm">
              prospects
            </p>
          </motion.div>
        </div>

        {/* Middle card — contacté (HERO) */}
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
            className="relative h-full w-full overflow-hidden rounded-3xl border border-[rgba(74,36,26,0.12)] bg-gradient-to-br from-choco via-choco to-[#2A1510] p-6 text-cream shadow-warm-xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/30 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-brand" aria-hidden />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-brand">
                  Pipeline actif
                </span>
              </div>
              <span className="rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-brand">
                Live
              </span>
            </div>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-5xl font-medium leading-none text-cream">
                {total}
              </span>
              <span className="font-display text-xl text-brand">/</span>
              <span className="font-display text-2xl text-cream/60">
                tot.
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream/50">
              prospects en portefeuille
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cream/5 p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-cream/50">
                  Contactés
                </p>
                <p className="mt-0.5 font-display text-xl font-medium text-cream">
                  {contacted}
                </p>
              </div>
              <div className="rounded-xl bg-brand/15 p-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-brand">
                  Signés
                </p>
                <p className="mt-0.5 font-display text-xl font-medium text-brand">
                  {signed}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Front card — signés */}
        <div
          className="absolute right-0 top-0 h-[50%] w-[58%]"
          style={{ transform: 'translateZ(80px) translateY(60%) translateX(22%) rotate(7deg)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: [0, -4, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.4 },
              y: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
            }}
            className="relative h-full w-full rounded-3xl border border-[rgba(74,36,26,0.12)] bg-cream/95 p-5 backdrop-blur-sm shadow-warm-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
                Conversion
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-brand" aria-hidden />
            </div>
            <p className="mt-3 font-display text-3xl font-medium italic leading-none text-brand">
              {total > 0 ? Math.round((signed / total) * 100) : 0}%
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#6F5A50]">
              signés / total
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

const PARTICLE_POSITIONS = [
  { left: 18, top: 72, drift: 8, duration: 4.2, delay: 0 },
  { left: 38, top: 84, drift: -6, duration: 5.0, delay: 0.6 },
  { left: 62, top: 76, drift: 10, duration: 4.6, delay: 1.2 },
  { left: 78, top: 68, drift: -8, duration: 5.4, delay: 1.8 },
  { left: 28, top: 58, drift: 6, duration: 4.8, delay: 2.4 },
  { left: 70, top: 88, drift: -4, duration: 5.2, delay: 3.0 },
];
