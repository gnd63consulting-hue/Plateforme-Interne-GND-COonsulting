'use client';

import { motion } from 'framer-motion';
import { Rocket, Sparkles, Trophy } from 'lucide-react';

type Tier = {
  threshold: number; // contrats signés requis
  bonus: string;     // libellé du bonus (ex: "+200 €")
  label?: string;    // libellé du palier (ex: "Bronze")
};

type RocketProgressProps = {
  /** Nombre de contrats signés actuels */
  signed: number;
  /** Paliers à débloquer (sorted asc by threshold) */
  tiers?: Tier[];
};

const DEFAULT_TIERS: Tier[] = [
  { threshold: 5, bonus: '+200 €', label: 'Bronze' },
  { threshold: 10, bonus: '+500 €', label: 'Argent' },
  { threshold: 15, bonus: '+1 000 €', label: 'Or' },
  { threshold: 20, bonus: '+2 500 €', label: 'Platine' },
];

/**
 * Pipeline vertical avec fusée qui monte vers les paliers de bonus.
 *
 * Le « délire » demandé par Roodny : visualisation gamifiée de la
 * progression commerciale. La fusée remonte selon le ratio signed/maxTier,
 * les paliers atteints s'allument en amber-glow, le palier suivant est
 * highlighté avec compte à rebours « encore X contrats ».
 */
export default function RocketProgress({
  signed,
  tiers = DEFAULT_TIERS,
}: RocketProgressProps) {
  const maxThreshold = tiers[tiers.length - 1].threshold;
  // Position de la fusée en % (0 en bas, 100 en haut)
  const rocketProgress = Math.min(100, (signed / maxThreshold) * 100);

  // Trouver le palier suivant non encore atteint
  const nextTier = tiers.find((t) => signed < t.threshold);
  const remaining = nextTier ? nextTier.threshold - signed : 0;
  const allUnlocked = !nextTier;

  return (
    <div className="relative flex h-full gap-6">
      {/* ==================================================== */}
      {/* Pipeline vertical avec fusée                            */}
      {/* ==================================================== */}
      <div className="relative flex w-20 flex-col items-center justify-end">
        {/* Background pipeline (vertical bar) */}
        <div className="absolute left-1/2 top-2 h-[calc(100%-2.5rem)] w-1.5 -translate-x-1/2 rounded-full bg-gnd-bronze/8" />

        {/* Filled progress (amber gradient) */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `calc((100% - 2.5rem) * ${rocketProgress / 100})` }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="absolute bottom-10 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow shadow-[0_0_8px_rgba(232,133,61,0.4)]"
        />

        {/* Tier markers along the pipeline */}
        {tiers.map((tier) => {
          const reached = signed >= tier.threshold;
          const positionFromBottom = (tier.threshold / maxThreshold) * 100;
          return (
            <motion.div
              key={tier.threshold}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{
                scale: reached ? 1 : 0.85,
                opacity: reached ? 1 : 0.6,
              }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={`absolute left-1/2 -translate-x-1/2 ${
                reached
                  ? 'shadow-[0_0_12px_rgba(232,133,61,0.5)]'
                  : ''
              }`}
              style={{
                bottom: `calc(2.5rem + (100% - 2.5rem) * ${positionFromBottom / 100} - 0.625rem)`,
              }}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  reached
                    ? 'border-gnd-amber bg-gnd-amber'
                    : 'border-gnd-bronze/20 bg-gnd-paper'
                }`}
              >
                {reached && (
                  <Sparkles className="h-2.5 w-2.5 text-gnd-cream" aria-hidden />
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Rocket — animates from bottom to rocketProgress% */}
        <motion.div
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: `calc(-1 * (100% - 2.5rem) * ${rocketProgress / 100})`,
            opacity: 1,
          }}
          transition={{
            y: { duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 },
            opacity: { duration: 0.4, delay: 0.2 },
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
        >
          {/* Rocket trail (smoke fading down) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-full h-12 w-3 -translate-x-1/2 bg-gradient-to-b from-gnd-amber-glow/70 via-gnd-amber/30 to-transparent blur-sm"
          />
          {/* Rocket icon with bobbing motion */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gnd-bronze text-gnd-amber shadow-warm-lg"
          >
            <Rocket className="h-5 w-5" aria-hidden />
          </motion.div>
        </motion.div>
      </div>

      {/* ==================================================== */}
      {/* Tier labels on the right side                          */}
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
                reached ? 'text-gnd-bronze' : 'text-gnd-bronze-faded'
              }`}
            >
              <span
                className={`font-mono text-[9px] font-semibold uppercase tracking-[0.18em] ${
                  reached ? 'text-gnd-amber-dim' : 'text-gnd-bronze-faded'
                }`}
              >
                {tier.threshold} · {tier.label}
              </span>
              <span
                className={`font-display text-sm font-medium italic ${
                  reached ? 'text-gnd-amber' : 'text-gnd-bronze-faded'
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

      {/* ==================================================== */}
      {/* Status footer                                          */}
      {/* ==================================================== */}
      <div className="absolute -bottom-1 left-0 right-0 text-center">
        {allUnlocked ? (
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
            Tous paliers débloqués ✨
          </p>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gnd-bronze-soft">
            Encore{' '}
            <span className="font-semibold text-gnd-amber-dim">
              {remaining} contrat{remaining > 1 ? 's' : ''}
            </span>{' '}
            pour {nextTier!.bonus}
          </p>
        )}
      </div>
    </div>
  );
}
