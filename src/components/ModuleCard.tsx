import Link from 'next/link';
import type { ModuleMeta } from '@/lib/modules-registry';

type ModuleCardProps = {
  module: ModuleMeta;
  state: 'validated' | 'available' | 'locked';
};

const STATE_LABEL: Record<ModuleCardProps['state'], string> = {
  validated: 'Validé',
  available: 'À faire',
  locked: 'Verrouillé',
};

const STATE_ICON: Record<ModuleCardProps['state'], string> = {
  validated: '✅',
  available: '▶️',
  locked: '🔒',
};

const STATE_CLASS: Record<ModuleCardProps['state'], string> = {
  validated: 'border-emerald-200 bg-emerald-50/40',
  available: 'border-slate-200 bg-white hover:border-gnd-accent hover:shadow-md',
  locked: 'border-slate-200 bg-slate-50 opacity-70',
};

export default function ModuleCard({ module, state }: ModuleCardProps) {
  const content = (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl border p-6 transition ${STATE_CLASS[state]}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-gnd-muted">
            Module {String(module.order).padStart(2, '0')}
          </span>
          <span className="text-xs text-gnd-muted">{module.duration} min</span>
        </div>

        <h3 className="mt-3 text-lg font-semibold text-gnd-primary">
          {module.title}
        </h3>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm">
        <span>{STATE_ICON[state]}</span>
        <span
          className={
            state === 'validated'
              ? 'text-emerald-700'
              : state === 'locked'
              ? 'text-gnd-muted'
              : 'text-gnd-primary'
          }
        >
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  );

  if (state === 'locked') {
    return <div aria-disabled>{content}</div>;
  }

  return (
    <Link href={`/formation/${module.slug}`} className="block h-full">
      {content}
    </Link>
  );
}
