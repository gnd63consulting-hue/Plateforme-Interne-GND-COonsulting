'use client';

import { motion } from 'framer-motion';

/**
 * Overlay phosphore CRT — ligne amber qui drift verticalement en boucle.
 *
 * À placer dans un parent en `position: relative; overflow: hidden`.
 * Sera positionné absolute en haut, et glissera vers le bas en 4s.
 *
 * Pattern identifié par le subagent comme le "détail wow" qui sépare
 * un Tailwind dashboard d'un cockpit Alfa Romeo.
 */
export default function ScanLine({
  duration = 4,
  delay = 0,
}: {
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-0 h-[3px]"
      style={{
        background:
          'linear-gradient(180deg, transparent, rgba(255,160,96,0.55), transparent)',
        filter: 'blur(1px)',
        mixBlendMode: 'screen',
      }}
      initial={{ top: '0%' }}
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    />
  );
}
