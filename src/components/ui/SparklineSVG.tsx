import * as React from 'react';

/**
 * SparklineSVG — mini-graphe inline fait main (aucune lib de charts).
 *
 * Rend soit une courbe lissée + aire dégradée (`variant="area"`), soit des
 * micro-barres (`variant="bars"`). Couleurs on-brand (orange). Purement
 * décoratif : `aria-hidden` par défaut. Déterministe (SSR-safe) — l'id de
 * gradient dérive des données, pas d'un random.
 */
export interface SparklineSVGProps {
  data: number[];
  width?: number;
  height?: number;
  variant?: 'area' | 'bars';
  /** Couleur du trait/barres (défaut orange de marque). */
  stroke?: string;
  className?: string;
}

function buildSmoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function SparklineSVG({
  data,
  width = 96,
  height = 32,
  variant = 'area',
  stroke = '#F39253',
  className,
}: SparklineSVGProps) {
  const series = data.length > 0 ? data : [0, 0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pad = 2;
  const innerH = height - pad * 2;

  const uid = `spark-${series.length}-${Math.round(min)}-${Math.round(max)}`;

  if (variant === 'bars') {
    const gap = 2;
    const barW = Math.max(2, (width - gap * (series.length - 1)) / series.length);
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden
        focusable="false"
      >
        {series.map((v, i) => {
          const h = Math.max(2, ((v - min) / span) * innerH);
          const x = i * (barW + gap);
          const y = height - pad - h;
          const isLast = i === series.length - 1;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={1.5}
              fill={stroke}
              opacity={isLast ? 1 : 0.4}
            />
          );
        })}
      </svg>
    );
  }

  const points: Array<[number, number]> = series.map((v, i) => {
    const x =
      series.length === 1
        ? width / 2
        : (i / (series.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * innerH;
    return [x, y];
  });

  const linePath = buildSmoothPath(points);
  const areaPath =
    linePath +
    ` L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.25} fill={stroke} />
    </svg>
  );
}

export default SparklineSVG;
