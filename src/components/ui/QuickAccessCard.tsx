'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AvatarStack } from './Avatar';

/**
 * QuickAccessCard — carte « Accès rapide » du Design System Sprint 10
 * (réf Google Drive « partagé avec / raccourcis »).
 *
 * Petit label majuscule (contexte) + pile d'avatars qui se chevauchent +
 * titre du raccourci, et un compteur optionnel. Une carte peut être mise en
 * avant (`featured`) avec un fond orange doux. Cliquable si `href` fourni.
 *
 * a11y : l'orange n'est jamais en texte courant ; la carte featured garde un
 * titre chocolat. Focus ring visible. Hover lift discret.
 */
export interface QuickAccessCardProps {
  /** Label de contexte en majuscules (ex. « À RELANCER »). */
  context: string;
  /** Titre du raccourci (ex. « Mes relances du jour »). */
  title: string;
  /** Icône posée en pastille (carré arrondi teinté). */
  icon?: React.ReactNode;
  /** Personnes à empiler (avatars). */
  people?: Array<{ name?: string | null; src?: string | null }>;
  /** Métrique courte à droite (ex. « 7 »). */
  count?: React.ReactNode;
  /** Mise en avant (fond orange doux). */
  featured?: boolean;
  href?: string;
  className?: string;
}

export function QuickAccessCard({
  context,
  title,
  icon,
  people,
  count,
  featured = false,
  href,
  className,
}: QuickAccessCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <span
            aria-hidden
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              featured ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark'
            )}
          >
            {icon}
          </span>
        )}
        {count != null && (
          <span
            className={cn(
              'font-marcellus text-2xl leading-none tabular-nums',
              featured ? 'text-brand-dark' : 'text-choco'
            )}
          >
            {count}
          </span>
        )}
      </div>

      <p className="mt-4 font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-warm">
        {context}
      </p>
      <p className="mt-0.5 truncate font-marcellus text-base text-choco">
        {title}
      </p>

      {people && people.length > 0 && (
        <div className="mt-3">
          <AvatarStack people={people} size="xs" max={4} />
        </div>
      )}
    </>
  );

  const base = cn(
    'block rounded-2xl border p-4 shadow-soft transition-all duration-200',
    featured
      ? 'border-brand/25 bg-gradient-brand-soft'
      : 'border-border-soft bg-surface-soft',
    href &&
      'hover:-translate-y-0.5 hover:shadow-soft-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
    className
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default QuickAccessCard;
