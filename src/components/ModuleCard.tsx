import Link from 'next/link';
import type { ModuleMeta } from '@/lib/modules-registry';

type ModuleCardProps = {
  module: ModuleMeta;
  state: 'validated' | 'available' | 'locked';
  /** Nombre de questions seedées dans Supabase pour ce module. */
  questionsCount?: number;
  /** Meilleur score (en %) si le module est validé. */
  bestPercentage?: number | null;
  /** Titre du module précédent à compléter — affiché sur les cartes verrouillées. */
  previousOrder?: number;
};

const BASE_CARD =
  'group relative flex flex-col rounded-xl border p-8 transition-all duration-300';

export default function ModuleCard({
  module,
  state,
  questionsCount,
  bestPercentage,
  previousOrder,
}: ModuleCardProps) {
  const numberLabel = String(module.order).padStart(2, '0');

  const content = (
    <>
      <div className="mb-8 flex items-start justify-between">
        <span
          className={
            state === 'locked'
              ? 'font-headline text-3xl font-bold text-outline'
              : 'font-headline text-3xl font-bold text-primary opacity-20 transition-opacity group-hover:opacity-100'
          }
        >
          {numberLabel}
        </span>
        <StatusBadge state={state} bestPercentage={bestPercentage} />
      </div>

      <h3
        className={
          state === 'locked'
            ? 'mb-4 font-headline text-xl font-bold leading-tight text-on-surface-variant'
            : 'mb-4 font-headline text-xl font-bold leading-tight text-on-surface'
        }
      >
        {module.title}
      </h3>

      <div className="mt-auto flex items-center gap-4 text-sm text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          <span>{module.duration} min</span>
        </div>
        {questionsCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">
              menu_book
            </span>
            <span>
              {questionsCount} question{questionsCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {state === 'available' && (
        <div className="mt-6 rounded-full bg-primary px-4 py-3 text-center font-label text-sm font-bold text-on-primary transition-opacity group-hover:opacity-90">
          Continuer le module →
        </div>
      )}

      {state === 'locked' && previousOrder !== undefined && (
        <p className="mt-6 flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          Complète le Module {String(previousOrder).padStart(2, '0')} pour
          déverrouiller.
        </p>
      )}

      {state === 'validated' && (
        <span
          className={
            bestPercentage !== undefined && bestPercentage !== null && bestPercentage >= 90
              ? 'absolute bottom-0 left-0 h-1 w-full rounded-b-xl bg-green-500'
              : bestPercentage !== undefined && bestPercentage !== null && bestPercentage < 80
              ? 'absolute bottom-0 left-0 h-1 w-full rounded-b-xl bg-amber-500'
              : 'absolute bottom-0 left-0 h-1 w-full rounded-b-xl bg-green-500'
          }
        />
      )}
    </>
  );

  if (state === 'locked') {
    return (
      <div
        aria-disabled
        className={`${BASE_CARD} cursor-not-allowed border-outline-variant/10 bg-surface-container-low/50 opacity-70 grayscale`}
      >
        {content}
      </div>
    );
  }

  const cardClass =
    state === 'validated'
      ? `${BASE_CARD} border-outline-variant/10 bg-surface-container-lowest hover:-translate-y-1 hover:shadow-2xl`
      : `${BASE_CARD} border-primary/20 border-2 bg-surface-container-lowest shadow-lg hover:-translate-y-1 hover:shadow-2xl`;

  return (
    <Link href={`/formation/${module.slug}`} className={cardClass}>
      {content}
    </Link>
  );
}

function StatusBadge({
  state,
  bestPercentage,
}: {
  state: ModuleCardProps['state'];
  bestPercentage?: number | null;
}) {
  if (state === 'validated') {
    const hasScore = bestPercentage !== undefined && bestPercentage !== null;
    const tone = !hasScore
      ? 'bg-green-100 text-green-700'
      : bestPercentage! >= 90
      ? 'bg-green-100 text-green-700'
      : bestPercentage! < 80
      ? 'bg-amber-100 text-amber-700'
      : 'bg-green-100 text-green-700';

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${tone}`}
      >
        {hasScore ? `Validé — ${bestPercentage}%` : 'Validé'}
      </span>
    );
  }
  if (state === 'available') {
    return (
      <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-primary-fixed-variant">
        À faire
      </span>
    );
  }
  return (
    <span className="flex items-center rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
      <span className="material-symbols-outlined mr-1 text-[14px]">lock</span>
      Verrouillé
    </span>
  );
}
