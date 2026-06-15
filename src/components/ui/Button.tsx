'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Button — primitive d'action du Design System Sprint 10.
 *
 * Pill arrondie (réf Google Drive « + Nouveau »). Variantes :
 *  - primary : orange de marque plein, texte crème (CTA principal)
 *  - soft    : surface orange translucide, texte chocolat (action secondaire)
 *  - ghost   : transparent, texte charbon (action tertiaire / nav)
 *  - outline : bordure beige, fond blanc (action neutre)
 *
 * a11y : le texte du variant primary reste en crème sur orange #F39253
 * (contraste suffisant pour du gras) ; le texte de marque sur clair reste en
 * chocolat. Focus ring visible. Rend un <button>, <a> (href externe) ou
 * <Link> next (href interne) selon les props.
 */
export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-brand-glow hover:bg-brand-dark active:scale-[0.98]',
  soft: 'bg-brand-soft text-choco hover:bg-brand-pale active:scale-[0.98]',
  ghost: 'bg-transparent text-ink-warm hover:bg-cream-deep active:scale-[0.98]',
  outline:
    'border border-border-soft bg-surface-soft text-ink-warm hover:border-brand/40 hover:shadow-soft active:scale-[0.98]',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

const BASE =
  'inline-flex items-center justify-center rounded-full font-semibold font-inter transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream ' +
  'disabled:pointer-events-none disabled:opacity-50';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type AsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    href?: undefined;
  };

type AsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
    href: string;
  };

export function Button(props: AsButton | AsLink) {
  const { variant = 'primary', size = 'md', className, children } = props;
  const classes = cn(BASE, VARIANT[variant], SIZE[size], className);

  if ('href' in props && props.href !== undefined) {
    const { href, ...rest } = props;
    // On retire les props de style de la liste passée au DOM.
    const anchorProps = stripStyleProps(rest);
    const isExternal = /^https?:\/\//.test(href) || href.startsWith('mailto:');
    if (isExternal) {
      return (
        <a href={href} className={classes} {...anchorProps}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = stripStyleProps(props);
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

/** Retire les props purement « design system » avant le spread sur le DOM. */
function stripStyleProps<
  T extends { variant?: unknown; size?: unknown; className?: unknown; children?: unknown },
>(props: T): Omit<T, 'variant' | 'size' | 'className' | 'children'> {
  const { variant, size, className, children, ...rest } = props;
  void variant;
  void size;
  void className;
  void children;
  return rest;
}

export default Button;
