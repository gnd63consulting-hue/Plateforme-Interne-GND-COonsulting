import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import ModuleCard from '@/components/ModuleCard';

export const dynamic = 'force-dynamic';

export default async function FormationPage() {
  const supabase = await createClient();

  const [{ data: progressions }, { data: user }, { data: questions }] =
    await Promise.all([
      supabase
        .from('progressions')
        .select('module_slug, completed, best_percentage'),
      supabase.auth.getUser(),
      supabase.from('quiz_questions').select('module_slug'),
    ]);

  const completedSet = new Set(
    (progressions ?? [])
      .filter((p) => p.completed)
      .map((p) => p.module_slug)
  );

  const bestByModule = new Map<string, number | null>();
  for (const p of progressions ?? []) {
    bestByModule.set(p.module_slug, p.best_percentage ?? null);
  }

  const questionCounts = new Map<string, number>();
  for (const row of questions ?? []) {
    questionCounts.set(
      row.module_slug,
      (questionCounts.get(row.module_slug) ?? 0) + 1
    );
  }

  function stateFor(index: number): 'validated' | 'available' | 'locked' {
    const mod = MODULES[index];
    if (completedSet.has(mod.slug)) return 'validated';
    if (index === 0) return 'available';
    const prev = MODULES[index - 1];
    return completedSet.has(prev.slug) ? 'available' : 'locked';
  }

  const completedCount = MODULES.filter((m) => completedSet.has(m.slug)).length;
  const progressPercent = Math.round((completedCount / MODULES.length) * 100);

  const profile = user?.user;
  const firstName =
    (profile?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    profile?.email?.split('@')[0] ??
    'commercial';

  const isComplete = completedCount === MODULES.length;

  return (
    <div className="space-y-16">
      {/* ====================================================== */}
      {/* Editorial hero                                           */}
      {/* ====================================================== */}
      <header className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-gnd-amber" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
              E-learning path
            </span>
          </div>
          <h1 className="font-display text-display-lg font-medium leading-[1.05] tracking-tight text-gnd-bronze">
            Bienvenue,{' '}
            <span className="italic text-gnd-amber">{firstName}</span>.
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-gnd-bronze-soft">
            Prêt à poursuivre ta montée en compétences ? Les modules se
            débloquent au fur et à mesure de tes validations.
          </p>
        </div>

        {/* Progression sidebar */}
        <div className="min-w-[280px] rounded-3xl border border-gnd-bronze/8 bg-white p-6 shadow-warm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze-soft">
              Progression
            </span>
            <span className="font-display text-3xl font-medium text-gnd-bronze">
              {progressPercent}
              <span className="text-lg text-gnd-bronze-soft">%</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gnd-bronze/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gnd-amber-dim to-gnd-amber transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-gnd-bronze-soft">
            <span className="font-semibold text-gnd-bronze">
              {completedCount} / {MODULES.length}
            </span>{' '}
            modules validés
          </p>
        </div>
      </header>

      {/* ====================================================== */}
      {/* Modules grid                                             */}
      {/* ====================================================== */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod, idx) => (
          <ModuleCard
            key={mod.slug}
            module={mod}
            state={stateFor(idx)}
            questionsCount={questionCounts.get(mod.slug)}
            bestPercentage={bestByModule.get(mod.slug) ?? null}
            previousOrder={idx > 0 ? MODULES[idx - 1].order : undefined}
            index={idx}
          />
        ))}
      </section>

      {/* ====================================================== */}
      {/* CTA final                                                 */}
      {/* ====================================================== */}
      {!isComplete ? (
        <section className="relative overflow-hidden rounded-3xl border border-gnd-bronze/8 bg-gradient-to-br from-gnd-cream to-white p-10 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gnd-amber/10 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
              Certification
            </p>
            <h2 className="font-display text-display-md font-medium leading-tight text-gnd-bronze">
              {MODULES.length} modules pour devenir certifié GND.
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-gnd-bronze-soft">
              Chaque module se valide avec un quiz à 70 % minimum. Tu peux
              retenter autant que nécessaire.
            </p>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border border-gnd-amber/30 bg-gradient-to-br from-gnd-amber-pale/40 to-white p-10 text-center md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gnd-amber/15 blur-3xl"
          />
          <div className="relative">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
              Formation complète
            </p>
            <h2 className="font-display text-display-md font-medium leading-tight text-gnd-bronze">
              Tu es certifié GND Consulting.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-gnd-bronze-soft">
              Tu peux revenir à tout moment sur les modules pour réviser.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
