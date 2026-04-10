import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import ModuleCard from '@/components/ModuleCard';

export const dynamic = 'force-dynamic';

export default async function FormationPage() {
  const supabase = await createClient();

  const { data: progressions } = await supabase
    .from('progressions')
    .select('module_slug, completed');

  const completedSet = new Set(
    (progressions ?? [])
      .filter((p) => p.completed)
      .map((p) => p.module_slug)
  );

  // A module is available if module 1 or if previous module is completed.
  function stateFor(index: number): 'validated' | 'available' | 'locked' {
    const mod = MODULES[index];
    if (completedSet.has(mod.slug)) return 'validated';
    if (index === 0) return 'available';
    const prev = MODULES[index - 1];
    return completedSet.has(prev.slug) ? 'available' : 'locked';
  }

  const completedCount = MODULES.filter((m) => completedSet.has(m.slug)).length;
  const progressPercent = Math.round((completedCount / MODULES.length) * 100);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gnd-primary">Ma formation</h1>
        <p className="mt-1 text-gnd-muted">
          Suis les 6 modules dans l'ordre. Chaque module se termine par un court quiz sur Tally.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gnd-accent transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gnd-primary">
            {completedCount} / {MODULES.length}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod, idx) => (
          <ModuleCard key={mod.slug} module={mod} state={stateFor(idx)} />
        ))}
      </section>
    </div>
  );
}
