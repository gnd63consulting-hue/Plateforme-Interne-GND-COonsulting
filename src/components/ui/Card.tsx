import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — primitive de surface du Design System Sprint 10.
 *
 * Carte blanche arrondie, bordure beige douce, ombre soft. Brique de base
 * du nouveau shell SaaS (réf Google Drive / Dropify). `tone="cream"` pour les
 * panneaux posés sur fond blanc, `tone="brand"` pour la carte mise en avant.
 */
type CardTone = 'surface' | 'cream' | 'brand';

const TONE: Record<CardTone, string> = {
  surface: 'bg-surface-soft border-border-soft/70',
  cream: 'bg-cream border-border-soft/60',
  brand: 'bg-gradient-brand-soft border-brand/25',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** Surépaisseur d'ombre + lift au survol (cartes cliquables). */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function Card({
  tone = 'surface',
  interactive = false,
  as: Tag = 'div',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-3xl border shadow-soft',
        TONE[tone],
        interactive &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md focus-within:shadow-soft-md',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Card;
