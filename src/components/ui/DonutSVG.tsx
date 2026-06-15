import * as React from 'react';

/**
 * DonutSVG — mini-anneau de progression fait main (aucune lib de charts).
 *
 * Petit donut orange sur piste crème, avec un label central optionnel (ex.
 * « 20% »). Déterministe, SSR-safe, purement décoratif par défaut
 * (`aria-hidden`) — l'info chiffrée est toujours portée en texte à côté dans
 * la KPI card. Utilisé dans la rangée de KPI du tableau de bord (réf mockup :
 * mini-donut « Relances » + donut « Ma commission 20% »).
 */
export interface DonutSVGProps {
  /** Progression 0..100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Couleur de l'arc (défaut orange de marque). */
  stroke?: string;
  /** Couleur de la piste (défaut crème profond). */
  track?: string;
  /** Texte central court (ex. « 20% »). */
  center?: React.ReactNode;
  className?: string;
}

export function DonutSVG({
  value,
  size = 56,
  strokeWidth = 7,
  stroke = '#F39253',
  track = '#F2E8DD',
  center,
  className,
}: DonutSVGProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const uid = `donut-${size}-${Math.round(clamped)}`;

  return (
    <span
      className={className}
      style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false">
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stroke} />
            <stop offset="100%" stopColor="#E07E3C" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      {center != null && (
        <span className="absolute inset-0 flex items-center justify-center text-center text-[10px] font-semibold tabular-nums text-choco">
          {center}
        </span>
      )}
    </span>
  );
}

export default DonutSVG;
