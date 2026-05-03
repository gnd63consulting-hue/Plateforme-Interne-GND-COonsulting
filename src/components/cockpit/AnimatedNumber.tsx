'use client';

import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';

type AnimatedNumberProps = {
  value: number;
  /** Format function for display (default: integer) */
  format?: (n: number) => string;
  /** Animation duration (default 1.5s) */
  duration?: number;
  /** Initial value to start from (default 0) */
  from?: number;
  className?: string;
};

/**
 * Counter numérique animé à la Vercel/Linear : ramp de 0 à value au mount.
 * Pattern extrait de 21st.dev MarketingDashboard.
 *
 * Usage : <AnimatedNumber value={181} format={(n) => Math.round(n)} />
 */
export default function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 1.5,
  from = 0,
  className,
}: AnimatedNumberProps) {
  const count = useMotionValue(from);
  const display = useTransform(count, (latest) => format(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [count, value, duration]);

  return (
    <motion.span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </motion.span>
  );
}
