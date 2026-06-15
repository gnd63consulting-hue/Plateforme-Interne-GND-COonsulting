import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * SectionHeader — en-tête de section du Design System Sprint 10.
 *
 * Petit eyebrow (filet orange + label mono) + titre Marcellus + sous-titre
 * optionnel, avec un slot d'action à droite. Utilisé en tête de page et de
 * carte pour un rythme visuel cohérent.
 */
export interface SectionHeaderProps {
  /** Sur-titre court (eyebrow). */
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Icône optionnelle posée devant le titre. */
  icon?: React.ReactNode;
  /** Action(s) alignée(s) à droite (boutons, liens). */
  action?: React.ReactNode;
  /** Niveau de titre rendu (défaut h2). */
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  action,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  const titleSize =
    Heading === 'h1'
      ? 'text-2xl sm:text-3xl'
      : Heading === 'h2'
        ? 'text-lg sm:text-xl'
        : 'text-base';

  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="h-px w-6 bg-brand" />
            <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
              {eyebrow}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {icon && (
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"
            >
              {icon}
            </span>
          )}
          <Heading
            className={cn(
              'font-marcellus font-normal tracking-tight text-choco',
              titleSize
            )}
          >
            {title}
          </Heading>
        </div>
        {subtitle && (
          <p className="mt-1.5 max-w-prose text-sm text-muted-warm">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export default SectionHeader;
