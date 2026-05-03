'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

type SpeedometerGaugeProps = {
  /** Value 0-100 */
  value: number;
  /** Label sous le compteur */
  label?: string;
  /** Format custom de la valeur centrale (default: "X%") */
  formatValue?: (v: number) => string;
  /** Sous-titre sous la valeur centrale */
  subtitle?: string;
};

/**
 * Compteur de voiture SVG — demi-cercle 180° avec needle animée.
 *
 * Inspiration tableau de bord automobile, charte warm GND :
 * gradient amber→bronze sur l'arc, needle bronze qui pivote selon
 * la valeur, valeur centrale en Fraunces.
 */
export default function SpeedometerGauge({
  value,
  label = 'Performance',
  formatValue = (v) => `${Math.round(v)}%`,
  subtitle,
}: SpeedometerGaugeProps) {
  // Animated value — spring it from 0 to value on mount
  const animatedValue = useMotionValue(0);
  const springValue = useSpring(animatedValue, {
    stiffness: 60,
    damping: 14,
  });
  const displayValue = useTransform(springValue, (v) => formatValue(v));

  // Needle rotation : -90° (left) → +90° (right), so value 0 = -90, value 100 = +90
  const needleRotation = useTransform(springValue, [0, 100], [-90, 90]);

  useEffect(() => {
    animatedValue.set(value);
  }, [animatedValue, value]);

  // SVG dimensions
  const size = 220;
  const cx = size / 2;
  const cy = size * 0.78;
  const arcR = size * 0.38;
  const needleLen = arcR * 0.85;

  // Build the gauge arc path (semicircle from 180° to 0°)
  const arcStart = polarToCartesian(cx, cy, arcR, 180);
  const arcEnd = polarToCartesian(cx, cy, arcR, 0);
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  // Tick marks at 0, 25, 50, 75, 100
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size * 0.85}
          viewBox={`0 0 ${size} ${size * 0.85}`}
          aria-hidden
        >
          <defs>
            <linearGradient id="speedo-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5C3A38" />
              <stop offset="50%" stopColor="#E8853D" />
              <stop offset="100%" stopColor="#FFA060" />
            </linearGradient>
            <filter id="needle-shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#3D1F1E" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#3D1F1E"
            strokeOpacity="0.08"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Animated foreground arc — reveal as needle progresses */}
          <motion.path
            d={arcPath}
            fill="none"
            stroke="url(#speedo-gradient)"
            strokeWidth="14"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: value / 100 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />

          {/* Tick marks */}
          {ticks.map((t) => {
            const angle = 180 - (t / 100) * 180;
            const inner = polarToCartesian(cx, cy, arcR - 18, angle);
            const outer = polarToCartesian(cx, cy, arcR - 6, angle);
            const labelPos = polarToCartesian(cx, cy, arcR - 30, angle);
            return (
              <g key={t}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#5C3A38"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-gnd-bronze-soft font-mono"
                  fontSize="9"
                  fontWeight="600"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Needle (rotates around pivot) */}
          <motion.g
            style={{ rotate: needleRotation, originX: cx, originY: cy }}
            filter="url(#needle-shadow)"
          >
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - needleLen}
              stroke="#3D1F1E"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy - needleLen} r="4" fill="#E8853D" />
          </motion.g>

          {/* Pivot disc */}
          <circle
            cx={cx}
            cy={cy}
            r="10"
            fill="#3D1F1E"
          />
          <circle
            cx={cx}
            cy={cy}
            r="4"
            fill="#E8853D"
          />
        </svg>

        {/* Central value */}
        <div className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
          <motion.span className="font-display text-3xl font-medium text-gnd-bronze md:text-4xl">
            {displayValue}
          </motion.span>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gnd-bronze-soft">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gnd-bronze-soft">
        {label}
      </p>
    </div>
  );
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const angleRad = ((angleDeg - 0) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(Math.PI - angleRad),
    y: cy - r * Math.sin(Math.PI - angleRad),
  };
}
