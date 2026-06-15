'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * GaugeSVG — jauge circulaire faite main (aucune lib de charts).
 *
 * Deux rendus (réf Dropify) :
 *  - `variant="dashed"` (défaut) : ANNEAU EN ARC POINTILLÉ — une couronne de
 *    petits segments ; ceux atteints passent en orange, les autres restent
 *    crème. Valeur au centre.
 *  - `variant="solid"` : anneau plein dégradé orange sur piste crème.
 *
 * Anime le tracé/segments au montage, sauf prefers-reduced-motion.
 * a11y : role progressbar + aria-*.
 */
export interface GaugeSVGProps {
  /** Valeur de progression 0..100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'dashed' | 'solid';
  /** Nombre de segments pour la variante pointillée. */
  segments?: number;
  /** Contenu central (ex. « 64% » + label). */
  children?: React.ReactNode;
  label?: string;
  className?: string;
}

export function GaugeSVG({
  value,
  size = 168,
  strokeWidth = 14,
  variant = 'dashed',
  segments = 40,
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
  const uid = `gauge-${variant}-${size}-${strokeWidth}`;

  const wrapper = (content: React.ReactNode) => (
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
        {content}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );

  /* ---------- Variante pointillée (arc de segments) ---------- */
  if (variant === 'dashed') {
    const reached = Math.round((clamped / 100) * segments);
    const dotR = Math.max(1.5, strokeWidth / 4.5);
    const ringR = r;
    return wrapper(
      <>
        {Array.from({ length: segments }).map((_, i) => {
          // Départ en haut (-90°), sens horaire.
          const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
          const x = cx + ringR * Math.cos(angle);
          const y = cy + ringR * Math.sin(angle);
          const isOn = i < reached;
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r={dotR}
              fill={isOn ? `url(#${uid})` : '#F0E4D4'}
              initial={reduce ? false : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: reduce ? 0 : Math.min(i * 0.012, 0.6),
                ease: 'easeOut',
              }}
            />
          );
        })}
      </>
    );
  }

  /* ---------- Variante pleine (anneau dégradé) ---------- */
  const dash = (clamped / 100) * circumference;
  return wrapper(
    <>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#F7EFE4"
        strokeWidth={strokeWidth}
      />
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
    </>
  );
}

export default GaugeSVG;
