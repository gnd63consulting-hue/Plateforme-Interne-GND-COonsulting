'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Sticky reading progress bar at the top of the viewport.
 *
 * Mounts once at the article level. Uses useScroll(document) to track
 * page scroll, then springs the value for that buttery feel à la Vercel
 * blog or Linear changelog.
 */
export default function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-brand-dark via-brand to-brand shadow-[0_0_8px_rgba(232,133,61,0.4)]"
    />
  );
}
