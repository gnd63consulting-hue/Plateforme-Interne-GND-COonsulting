import * as React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { SparklineSVG } from './SparklineSVG';

/**
 * StatCard — carte KPI du Design System Sprint 10 (réf Dropify).
 *
 * Pastille icône colorée + label + grand nombre + delta % + mini-sparkline.
 * Variante `accent` (orange de marque) pour la carte la plus importante de la
 * rangée. a11y : le nombre reste en charbon (sauf accent → orange foncé) pour
 * le contraste ; delta a une couleur sémantique + une icône (pas couleur seule).
 */
export type DeltaDirection = 'up' | 'down' | 'flat';

export interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** Texte du delta (ex. « +12% », « 3 cette semaine »). */
  delta?: string;
  deltaDirection?: DeltaDirection;
  /** Données pour la mini-sparkline (optionnelle). */
  sparkline?: number[];
  sparklineVariant?: 'area' | 'bars';
  sub?: React.ReactNode;
  accent?: boolean;
  className?: string;
}

const DELTA_STYLE: Record<DeltaDirection, { cls: string; Icon: typeof Minus }> =
  {
    up: { cls: 'text-emerald-700 bg-emerald-50', Icon: ArrowUpRight },
    down: { cls: 'text-rose-700 bg-rose-50', Icon: ArrowDownRight },
    flat: { cls: 'text-muted-warm bg-cream-deep', Icon: Minus },
  };

export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaDirection = 'flat',
  sparkline,
  sparklineVariant = 'area',
  sub,
  accent = false,
  className,
}: StatCardProps) {
  const d = DELTA_STYLE[deltaDirection];
  const DeltaIcon = d.Icon;

  return (
    <Card
      tone={accent ? 'brand' : 'surface'}
      className={cn('p-5', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            accent ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark'
          )}
        >
          {icon}
        </span>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              d.cls
            )}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden />
            {delta}
          </span>
        )}
      </div>

      <p className="mt-4 font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-warm">
        {label}
      </p>

      <div className="mt-1 flex items-end justify-between gap-3">
        <p
          className={cn(
            'font-marcellus text-3xl font-normal leading-none tabular-nums',
            accent ? 'text-brand-dark' : 'text-choco'
          )}
        >
          {value}
        </p>
        {sparkline && sparkline.length > 0 && (
          <SparklineSVG
            data={sparkline}
            variant={sparklineVariant}
            className="mb-0.5 shrink-0"
          />
        )}
      </div>

      {sub && <div className="mt-2.5 text-xs text-muted-warm">{sub}</div>}
    </Card>
  );
}

export default StatCard;
