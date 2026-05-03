'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

type Tier = {
  threshold: number;
  bonus: string;
  label?: string;
};

type RocketProgressProps = {
  signed: number;
  tiers?: Tier[];
};

const DEFAULT_TIERS: Tier[] = [
  { threshold: 5, bonus: '+200 €', label: 'Bronze' },
  { threshold: 10, bonus: '+500 €', label: 'Argent' },
  { threshold: 15, bonus: '+1 000 €', label: 'Or' },
  { threshold: 20, bonus: '+2 500 €', label: 'Platine' },
];

export default function RocketProgress({
  signed,
  tiers = DEFAULT_TIERS,
}: RocketProgressProps) {
  const maxThreshold = tiers[tiers.length - 1].threshold;
  const rocketProgress = Math.min(100, (signed / maxThreshold) * 100);

  return (
    <div className="relative flex h-full gap-6">
      {/* ==================================================== */}
      {/* Pipeline HUD vertical                                   */}
      {/* ==================================================== */}
      <div className="relative flex w-24 flex-col items-center justify-end">
        {/* HUD corner brackets (top) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden>
            <path
              d="M 2 14 L 2 2 L 12 2 M 28 2 L 38 2 L 38 14"
              fill="none"
              stroke="#E8853D"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
            <text
              x="20"
              y="11"
              textAnchor="middle"
              className="fill-gnd-amber font-mono"
              fontSize="8"
              fontWeight="700"
              letterSpacing="1"
            >
              MAX
            </text>
          </svg>
        </div>

        {/* Background pipeline (vertical bar) */}
        <div className="absolute left-1/2 top-7 h-[calc(100%-3.5rem)] w-2 -translate-x-1/2 rounded-full bg-gnd-bronze/30 ring-1 ring-gnd-bronze/40" />

        {/* Filled progress (amber gradient) */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `calc((100% - 3.5rem) * ${rocketProgress / 100})` }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="absolute bottom-12 left-1/2 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow shadow-[0_0_12px_rgba(232,133,61,0.6)]"
        />

        {/* Tier hex markers */}
        {tiers.map((tier) => {
          const reached = signed >= tier.threshold;
          const positionFromBottom = (tier.threshold / maxThreshold) * 100;
          return (
            <div
              key={tier.threshold}
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: `calc(3.5rem + (100% - 3.5rem) * ${positionFromBottom / 100} - 0.75rem)`,
              }}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0.5 }}
                animate={{ scale: reached ? 1 : 0.85, opacity: reached ? 1 : 0.5 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className={`relative flex h-6 w-6 items-center justify-center ${
                  reached ? 'animate-pulse-slow' : ''
                }`}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  background: reached
                    ? 'linear-gradient(135deg, #E8853D, #FFA060)'
                    : 'rgba(61, 31, 30, 0.6)',
                  boxShadow: reached ? '0 0 16px rgba(232, 133, 61, 0.6)' : 'none',
                }}
              >
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color: reached ? '#3D1F1E' : '#A0735C' }}
                >
                  {tier.threshold}
                </span>
              </motion.div>
            </div>
          );
        })}

        {/* HUD corner brackets (bottom) */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden>
            <path
              d="M 2 2 L 2 14 L 12 14 M 28 14 L 38 14 L 38 2"
              fill="none"
              stroke="#A0735C"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            <text
              x="20"
              y="12"
              textAnchor="middle"
              className="fill-gnd-bronze-faded font-mono"
              fontSize="8"
              fontWeight="700"
              letterSpacing="1"
            >
              000
            </text>
          </svg>
        </div>

        {/* Rocket — detailed SVG */}
        <motion.div
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: `calc(-1 * (100% - 3.5rem) * ${rocketProgress / 100})`,
            opacity: 1,
          }}
          transition={{
            y: { duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 },
            opacity: { duration: 0.4, delay: 0.2 },
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-full h-16 w-4 -translate-x-1/2 bg-gradient-to-b from-gnd-amber/60 via-gnd-amber-glow/30 to-transparent blur-md"
          />
          <DetailedRocket />
        </motion.div>
      </div>

      {/* ==================================================== */}
      {/* Tier labels on the right                                */}
      {/* ==================================================== */}
      <div className="flex flex-1 flex-col-reverse justify-between py-2">
        {tiers.map((tier) => {
          const reached = signed >= tier.threshold;
          return (
            <motion.div
              key={tier.threshold}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.5 + tiers.indexOf(tier) * 0.1,
              }}
              className={`flex items-center gap-2 ${
                reached ? 'text-gnd-cream' : 'text-gnd-bronze-faded'
              }`}
            >
              <span
                className={`font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${
                  reached ? 'text-gnd-amber' : 'text-gnd-bronze-faded'
                }`}
              >
                {tier.threshold} · {tier.label}
              </span>
              <span
                className={`font-display text-sm font-medium italic ${
                  reached ? 'text-gnd-amber-glow' : 'text-gnd-bronze-faded'
                }`}
              >
                {tier.bonus}
              </span>
              {reached && (
                <Trophy className="h-3 w-3 text-gnd-amber" aria-hidden />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Vraie fusée SVG détaillée (corps + hublot + ailerons + 3 flammes animées) */
function DetailedRocket() {
  return (
    <div className="relative">
      <svg width="44" height="56" viewBox="0 0 44 56" aria-hidden>
        <defs>
          <linearGradient id="nose-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFA060" />
            <stop offset="100%" stopColor="#D4732A" />
          </linearGradient>
          <linearGradient id="body-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F5EBD9" />
            <stop offset="50%" stopColor="#FDF6EE" />
            <stop offset="100%" stopColor="#E8DCC4" />
          </linearGradient>
          <linearGradient id="fin-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8853D" />
            <stop offset="100%" stopColor="#5C3A38" />
          </linearGradient>
          <radialGradient id="window-grad" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#FFA060" />
            <stop offset="100%" stopColor="#3D1F1E" />
          </radialGradient>
        </defs>

        <path d="M 14 32 L 6 44 L 14 42 Z" fill="url(#fin-grad)" stroke="#3D1F1E" strokeWidth="0.5" />
        <path d="M 30 32 L 38 44 L 30 42 Z" fill="url(#fin-grad)" stroke="#3D1F1E" strokeWidth="0.5" />
        <path d="M 22 4 L 30 16 L 30 40 L 14 40 L 14 16 Z" fill="url(#body-grad)" stroke="#3D1F1E" strokeWidth="0.7" />
        <path d="M 22 4 L 14 16 L 30 16 Z" fill="url(#nose-grad)" stroke="#3D1F1E" strokeWidth="0.7" />
        <line x1="14" y1="22" x2="30" y2="22" stroke="#3D1F1E" strokeWidth="0.4" opacity="0.5" />
        <line x1="14" y1="36" x2="30" y2="36" stroke="#3D1F1E" strokeWidth="0.4" opacity="0.5" />
        <circle cx="22" cy="28" r="4" fill="url(#window-grad)" stroke="#3D1F1E" strokeWidth="0.7" />
        <circle cx="21" cy="27" r="1" fill="#FDF6EE" opacity="0.5" />
        <rect x="17" y="40" width="10" height="3" fill="#3D1F1E" />
        <rect x="18" y="43" width="8" height="1.5" fill="#5C3A38" />
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-[44px] -translate-x-1/2">
        <motion.div
          animate={{ scaleY: [1, 1.3, 0.9, 1.2, 1], opacity: [0.9, 1, 0.85, 1, 0.9] }}
          transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originY: 0 }}
          className="absolute left-1/2 top-0 h-3 w-2.5 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-gnd-amber-glow via-gnd-amber to-gnd-amber-dim"
        />
        <motion.div
          animate={{ scaleY: [0.8, 1.1, 1.3, 0.9, 0.8], opacity: [0.7, 0.9, 0.75, 1, 0.7] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
          style={{ originY: 0 }}
          className="absolute left-1/2 top-0.5 h-4 w-1.5 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-yellow-100 via-gnd-amber-glow to-transparent"
        />
        <motion.div
          animate={{ scaleY: [1, 0.85, 1.4, 0.95, 1], opacity: [0.6, 0.8, 1, 0.7, 0.6] }}
          transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          style={{ originY: 0 }}
          className="absolute left-1/2 top-1 h-5 w-1 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-white via-gnd-amber-glow to-transparent"
        />
      </div>
    </div>
  );
}
