import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Avatar / AvatarStack — primitives d'identité du Design System Sprint 10.
 *
 * Avatar : pastille ronde avec image (next/image) ou initiales dérivées du nom.
 * AvatarStack : avatars empilés/chevauchés (réf Google Drive « partagé avec »).
 */
export function getInitials(name?: string | null): string {
  if (!name) return 'U';
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U'
  );
}

const SIZE_PX: Record<string, number> = { xs: 24, sm: 28, md: 36, lg: 44 };
const SIZE_CLS: Record<string, string> = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
};

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Variante chromatique du fond (par défaut chocolat). */
  tone?: 'choco' | 'brand';
  className?: string;
  title?: string;
}

export function Avatar({
  name,
  src,
  size = 'md',
  tone = 'choco',
  className,
  title,
}: AvatarProps) {
  const px = SIZE_PX[size];
  const toneCls =
    tone === 'brand' ? 'bg-brand text-white' : 'bg-choco text-cream';
  return (
    <span
      title={title ?? name ?? undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-surface-soft',
        SIZE_CLS[size],
        toneCls,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  );
}

export interface AvatarStackProps {
  people: Array<{ name?: string | null; src?: string | null }>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Au-delà de cette limite, affiche un « +N ». */
  max?: number;
  className?: string;
}

export function AvatarStack({
  people,
  size = 'sm',
  max = 4,
  className,
}: AvatarStackProps) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} size={size} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-cream-deep font-semibold text-muted-warm ring-2 ring-surface-soft',
            SIZE_CLS[size]
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export default Avatar;
