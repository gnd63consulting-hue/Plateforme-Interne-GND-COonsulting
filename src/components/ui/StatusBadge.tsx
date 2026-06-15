import * as React from 'react';
import { cn } from '@/lib/utils';
import { labelForStatus } from '@/lib/prospects';
import { pastelClassesForStatus } from '@/lib/status-tone';

/**
 * StatusBadge — pastille de statut PASTEL cohérente du Design System Sprint 10
 * (réf mockup : « badge statut pastel » sur les cartes prospect).
 *
 * Un seul point de vérité visuel pour les 16 statuts : la couleur dérive de
 * `pastelClassesForStatus` (charte pastel verrouillée). Le label est résolu via
 * `labelForStatus` (ou surchargé par `label`). Réutilisé partout (kanban,
 * relances, snapshot, fiches…) pour une cohérence parfaite.
 *
 * a11y : contraste texte foncé sur pastel clair (≥ AA) ; pas de couleur seule
 * porteuse de sens — le LABEL textuel accompagne toujours la couleur.
 */
export interface StatusBadgeProps {
  status: string | null | undefined;
  /** Surcharge le label (sinon `labelForStatus(status)`). */
  label?: React.ReactNode;
  /** Petit point coloré devant le label. */
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
};

export function StatusBadge({
  status,
  label,
  dot = false,
  size = 'md',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold leading-none',
        SIZE[size],
        pastelClassesForStatus(status),
        className
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
        />
      )}
      {label ?? labelForStatus(status)}
    </span>
  );
}

export default StatusBadge;
