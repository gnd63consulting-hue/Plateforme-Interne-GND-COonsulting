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
  /** Sous-jauge gauche (0-100) */
  subLeft?: { value: number; label: string };
  /** Sous-jauge droite (0-100) */
  subRight?: { value: number; label: string };
};

/**
 * Speedometer v2 — cockpit auto sportif (style Alfa Romeo / Audi).
 *
 * Compteur 270° (du sud-ouest au sud-est en passant par le nord) avec
 * anneau chrome métallique bronze, graduations major/minor, aiguille
 * fine bronze à dropshadow, digital readout central Fraunces, deux
 * sous-jauges en bas, indicateurs LED latéraux. Backplate radial dark
 * pour effet « profondeur ».
 */
export default function SpeedometerGauge({
  value,
  label = 'Performance',
  formatValue = (v) => `${Math.round(v)}`,
  subtitle,
  subLeft,
  subRight,
}: SpeedometerGaugeProps) {
  const animatedValue = useMotionValue(0);
  const springValue = useSpring(animatedValue, { stiffness: 60, damping: 14 });
  const displayValue = useTransform(springValue, (v) => formatValue(v));

  // Needle rotation : -135° (south-west) → +135° (south-east), 270° sweep
  const needleRotation = useTransform(springValue, [0, 100], [-135, 135]);

  useEffect(() => {
    animatedValue.set(value);
  }, [animatedValue, value]);

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const arcR = size * 0.4;
  const needleLen = arcR * 0.78;

  // 270° sweep : start at angle 225°, sweep to 315° (in math conv : SW → N → SE)
  // We use: angle 0 → -135° (SW), angle 100 → +135° (SE), going clockwise.
  const arcStart = polarToSvg(cx, cy, arcR, -135);
  const arcEnd = polarToSvg(cx, cy, arcR, 135);

  // Major ticks (every 10%) and minor (every 5%)
  const majorTicks = Array.from({ length: 11 }, (_, i) => i * 10);
  const minorTicks = Array.from({ length: 21 }, (_, i) => i * 5).filter(
    (t) => !majorTicks.includes(t)
  );

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
          className="drop-shadow-[0_8px_24px_rgba(232,133,61,0.15)]"
        >
          <defs>
            {/* Chrome bronze ring gradient */}
            <linearGradient id="chrome-bronze" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDF6EE" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#A0735C" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#3D1F1E" />
              <stop offset="70%" stopColor="#A0735C" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FDF6EE" stopOpacity="0.3" />
            </linearGradient>

            {/* Backplate radial dark */}
            <radialGradient id="backplate" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3D1F1E" />
              <stop offset="60%" stopColor="#1A0F0E" />
              <stop offset="100%" stopColor="#0a0605" />
            </radialGradient>

            {/* Progress arc gradient */}
            <linearGradient id="progress-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5C3A38" />
              <stop offset="50%" stopColor="#E8853D" />
              <stop offset="100%" stopColor="#FFA060" />
            </linearGradient>

            <filter id="needle-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>

            <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Backplate disc */}
          <circle cx={cx} cy={cy} r={size * 0.46} fill="url(#backplate)" />

          {/* Outer chrome ring */}
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.46}
            fill="none"
            stroke="url(#chrome-bronze)"
            strokeWidth="3"
          />
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.43}
            fill="none"
            stroke="#3D1F1E"
            strokeOpacity="0.6"
            strokeWidth="1"
          />

          {/* Background track (270°) */}
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke="#3D1F1E"
            strokeOpacity="0.6"
            strokeWidth="10"
            strokeLinecap="butt"
          />

          {/* Animated foreground arc */}
          <motion.path
            d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke="url(#progress-arc)"
            strokeWidth="10"
            strokeLinecap="butt"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: value / 100 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            style={{ filter: 'url(#glow-amber)' }}
          />

          {/* Minor ticks */}
          {minorTicks.map((t) => {
            const a = -135 + (t / 100) * 270;
            const inner = polarToSvg(cx, cy, arcR - 14, a);
            const outer = polarToSvg(cx, cy, arcR - 6, a);
            return (
              <line
                key={`m${t}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#A0735C"
                strokeOpacity="0.5"
                strokeWidth="1"
              />
            );
          })}

          {/* Major ticks + labels */}
          {majorTicks.map((t) => {
            const a = -135 + (t / 100) * 270;
            const inner = polarToSvg(cx, cy, arcR - 18, a);
            const outer = polarToSvg(cx, cy, arcR - 6, a);
            const labelPos = polarToSvg(cx, cy, arcR - 32, a);
            return (
              <g key={`M${t}`}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#FDF6EE"
                  strokeOpacity="0.7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-gnd-cream/70 font-mono"
                  fontSize="9"
                  fontWeight="500"
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
            {/* Counter-balance behind pivot */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + 14}
              stroke="#A0735C"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Main needle */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - needleLen}
              stroke="#FDF6EE"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Needle tip glow */}
            <circle cx={cx} cy={cy - needleLen} r="3" fill="#FFA060" />
          </motion.g>

          {/* Pivot multi-layer */}
          <circle cx={cx} cy={cy} r="14" fill="#3D1F1E" />
          <circle cx={cx} cy={cy} r="14" fill="none" stroke="url(#chrome-bronze)" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="5" fill="#E8853D" />
          <circle cx={cx} cy={cy} r="2" fill="#FFA060" />

          {/* Sub-gauges (2 mini-arcs en bas si fournis) */}
          {subLeft && (
            <SubGauge cx={cx - 50} cy={cy + 38} value={subLeft.value} label={subLeft.label} />
          )}
          {subRight && (
            <SubGauge cx={cx + 50} cy={cy + 38} value={subRight.value} label={subRight.label} />
          )}
        </svg>

        {/* Central digital readout */}
        <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
          <motion.span className="font-display text-4xl font-medium leading-none text-cream md:text-5xl">
            {displayValue}
          </motion.span>
          {subtitle && (
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
              {subtitle}
            </p>
          )}
        </div>

        {/* Lateral LED indicators (3 left + 3 right) */}
        <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <Led on={value >= 70} />
          <Led on={value >= 40} />
          <Led on={value >= 10} />
        </div>
        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <Led on={value >= 80} />
          <Led on={value >= 50} />
          <Led on={value >= 20} />
        </div>
      </div>

      <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
        · {label} ·
      </p>
    </div>
  );
}

function SubGauge({ cx, cy, value, label }: { cx: number; cy: number; value: number; label: string }) {
  const r = 18;
  const start = polarToSvg(cx, cy, r, -90);
  const end = polarToSvg(cx, cy, r, 90);
  const arcPath = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
  return (
    <g>
      <path d={arcPath} fill="none" stroke="#3D1F1E" strokeOpacity="0.5" strokeWidth="3" />
      <motion.path
        d={arcPath}
        fill="none"
        stroke="#E8853D"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: Math.max(0, Math.min(1, value / 100)) }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
      />
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-gnd-cream/50 font-mono"
        fontSize="7"
        fontWeight="600"
        letterSpacing="1"
      >
        {label}
      </text>
    </g>
  );
}

function Led({ on }: { on: boolean }) {
  return (
    <motion.span
      animate={{ opacity: on ? [0.7, 1, 0.7] : 0.2 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className={`block h-2 w-2 rounded-full ${
        on
          ? 'bg-brand shadow-[0_0_8px_rgba(232,133,61,0.8)]'
          : 'bg-choco/40'
      }`}
    />
  );
}

/** Convert polar coords (centered angles in deg, 0° = north, clockwise) to SVG xy. */
function polarToSvg(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
