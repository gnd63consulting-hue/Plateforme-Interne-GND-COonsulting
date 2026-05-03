'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { Sparkles, Play, CheckCircle2 } from 'lucide-react';

type FormationHeroVisualProps = {
  percent: number;
  completed: number;
  total: number;
  nextModuleTitle?: string;
  nextModuleOrder?: number;
};

export default function FormationHeroVisual({
  percent,
  completed,
  total,
  nextModuleTitle,
  nextModuleOrder,
}: FormationHeroVisualProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setTilt({ x: -y, y: x });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={sceneRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative aspect-[5/4] w-full max-w-lg"
      style={{ perspective: '1200px' }}
    >
      {/* ====================================================== */}
      {/* Background orb — pulsing amber                            */}
      {/* ====================================================== */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-8 rounded-full bg-gnd-amber/20 blur-[80px]"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute inset-12 rounded-full bg-gnd-amber-glow/20 blur-[60px]"
      />

      {/* ====================================================== */}
      {/* Floating particles                                        */}
      {/* ====================================================== */}
      {[
        { x: '15%', y: '20%', delay: 0, duration: 6 },
        { x: '85%', y: '30%', delay: 1, duration: 8 },
        { x: '20%', y: '75%', delay: 2, duration: 7 },
        { x: '80%', y: '70%', delay: 0.5, duration: 9 },
        { x: '50%', y: '10%', delay: 1.5, duration: 6.5 },
      ].map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          animate={{
            y: [0, -16, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
          className="absolute h-1.5 w-1.5 rounded-full bg-gnd-amber"
          style={{ left: p.x, top: p.y }}
        />
      ))}

      {/* ====================================================== */}
      {/* 3D card stack — with mouse parallax                       */}
      {/* ====================================================== */}
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Back card — module past */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateZ: -3 }}
          animate={{
            opacity: 1,
            y: [0, -6, 0],
            rotateZ: -3,
          }}
          transition={{
            opacity: { duration: 0.8, delay: 0.3 },
            rotateZ: { duration: 0.8, delay: 0.3 },
            y: {
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            },
          }}
          style={{ transform: 'translateZ(-40px)' }}
          className="absolute right-4 top-6 w-56 rounded-2xl border border-gnd-bronze/10 bg-white/90 p-4 shadow-warm backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gnd-amber/15">
              <CheckCircle2 className="h-3 w-3 text-gnd-amber-dim" />
            </span>
            <p className="font-mono text-[8px] uppercase tracking-wider text-gnd-bronze-soft">
              Module 02 — Validé
            </p>
          </div>
          <p className="font-display text-sm font-medium text-gnd-bronze">
            L&apos;offre Sites Vitrines
          </p>
          <div className="mt-3 h-0.5 w-full rounded-full bg-gnd-amber" />
        </motion.div>

        {/* Middle card — module active (the hero card) */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -10, 0],
          }}
          transition={{
            opacity: { duration: 0.9, delay: 0.5 },
            scale: { duration: 0.9, delay: 0.5 },
            y: {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          style={{ transform: 'translateZ(40px)' }}
          className="absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-gnd-amber/30 bg-gradient-to-br from-gnd-bronze via-gnd-bronze to-gnd-ink p-5 text-gnd-cream shadow-warm-xl"
        >
          {/* Glow effect */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gnd-amber/30 blur-3xl"
          />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-gnd-amber/20 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-gnd-amber-glow">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                En cours
              </span>
              {nextModuleOrder !== undefined && (
                <span className="font-mono text-[8px] uppercase tracking-wider text-gnd-cream/40">
                  Module {String(nextModuleOrder).padStart(2, '0')}
                </span>
              )}
            </div>
            <h4 className="font-display text-lg font-medium leading-tight text-gnd-cream">
              {nextModuleTitle ?? 'Le process de vente'}
            </h4>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Play
                  className="h-3 w-3 fill-gnd-amber text-gnd-amber"
                  aria-hidden
                />
                <span className="text-[10px] text-gnd-cream/60">
                  17 min de lecture
                </span>
              </div>
              <span className="text-[10px] font-medium text-gnd-amber-glow">
                Continuer →
              </span>
            </div>
            {/* Progress bar shimmer */}
            <div className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-gnd-cream/10">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-gnd-amber to-transparent"
              />
            </div>
          </div>
        </motion.div>

        {/* Front card — module locked (preview) */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateZ: 4 }}
          animate={{
            opacity: 1,
            y: [0, -8, 0],
            rotateZ: 4,
          }}
          transition={{
            opacity: { duration: 0.8, delay: 0.7 },
            rotateZ: { duration: 0.8, delay: 0.7 },
            y: {
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            },
          }}
          style={{ transform: 'translateZ(20px)' }}
          className="absolute -left-2 bottom-8 w-52 rounded-2xl border border-gnd-bronze/10 bg-white/90 p-4 shadow-warm backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-2xl font-medium italic leading-none text-gnd-bronze/30">
              04
            </span>
          </div>
          <p className="font-display text-sm font-medium text-gnd-bronze">
            Techniques de vente
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-gnd-bronze-faded">
            À venir · 17 min
          </p>
        </motion.div>

        {/* Progression dial — floating top-right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          style={{ transform: 'translateZ(60px)' }}
          className="absolute -right-2 -top-2 z-10"
        >
          <ProgressionDial percent={percent} completed={completed} total={total} />
        </motion.div>
      </motion.div>
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
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex h-24 w-24 items-center justify-center rounded-full border border-gnd-bronze/10 bg-white/90 shadow-warm backdrop-blur-md">
      <svg
        className="absolute inset-2 -rotate-90"
        viewBox="0 0 80 80"
        aria-hidden
      >
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#3D1F1E"
          strokeOpacity="0.08"
          strokeWidth="2.5"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="url(#dial-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 1 }}
        />
        <defs>
          <linearGradient id="dial-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4732A" />
            <stop offset="100%" stopColor="#FFA060" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex flex-col items-center">
        <span className="font-display text-xl font-medium leading-none text-gnd-bronze">
          {percent}
          <span className="text-xs text-gnd-bronze-soft">%</span>
        </span>
        <span className="mt-0.5 font-mono text-[7px] uppercase tracking-wider text-gnd-bronze-soft">
          {completed}/{total}
        </span>
      </div>
    </div>
  );
}
