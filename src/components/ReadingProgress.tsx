'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Sticky reading progress bar at the top of the viewport.
 * Smooths the scroll progress with a spring for buttery feel.
 */
export default function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow"
      aria-hidden
    />
  );
}
