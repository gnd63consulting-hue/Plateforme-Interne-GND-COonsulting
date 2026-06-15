'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * GaugeSVG — jauge circulaire faite main (aucune lib de charts).
 *
 * Anneau de progression (réf Dropify). Dégradé orange de marque sur piste
 * crème. Centre libre (slot `children`) pour la valeur. Anime le tracé au
 * montage, sauf prefers-reduced-motion. a11y : role progressbar + aria-*.
 */
export interface GaugeSVGProps {
  /** Valeur de progression 0..100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Contenu central (ex. « 64% » + label). */
  children?: React.ReactNode;
  label?: string;
  className?: string;
}

export function GaugeSVG({
  value,
  size = 168,
  strokeWidth = 14,
  children,
  label,
  className,
}: GaugeSVGProps) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (clamped / 100) * circumference;
  const uid = `gauge-${size}-${strokeWidth}`;

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: 'relative' }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        focusable="false"
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F39253" />
            <stop offset="100%" stopColor="#E07E3C" />
          </linearGradient>
        </defs>
        {/* Piste */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#F7EFE4"
          strokeWidth={strokeWidth}
        />
        {/* Progression — départ en haut (-90°) */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${cx} ${cy})`}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

export default GaugeSVG;
