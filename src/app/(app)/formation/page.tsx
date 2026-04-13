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

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <header className="mb-4 space-y-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              Bienvenue, {firstName}
            </h1>
            <p className="text-lg text-on-surface-variant">
              Prêt à poursuivre ta montée en compétences ?
            </p>
          </div>
          <div className="min-w-[280px] rounded-xl bg-surface-container-low p-6">
            <div className="mb-3 flex items-end justify-between">
              <span className="font-label text-sm font-semibold text-primary">
                Progression
              </span>
              <span className="font-headline text-2xl font-bold">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-on-surface-variant">
              Tu as validé{' '}
              <span className="font-bold text-on-surface">
                {completedCount} / {MODULES.length}
              </span>{' '}
              modules
            </p>
          </div>
        </div>
      </header>

      {/* Academic Atelier Bento Grid */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod, idx) => (
          <ModuleCard
            key={mod.slug}
            module={mod}
            state={stateFor(idx)}
            questionsCount={questionCounts.get(mod.slug)}
            bestPercentage={bestByModule.get(mod.slug) ?? null}
            previousOrder={idx > 0 ? MODULES[idx - 1].order : undefined}
          />
        ))}
      </section>

      {/* CTA final : certification */}
      {completedCount < MODULES.length ? (
        <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8 text-center md:p-12">
          <h2 className="font-headline text-2xl font-bold text-on-surface">
            Complète les {MODULES.length} modules pour obtenir ta certification GND.
          </h2>
          <p className="mt-3 text-on-surface-variant">
            Chaque module se valide avec un quiz à 70% minimum. Tu peux retenter autant que nécessaire.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center md:p-12">
          <h2 className="font-headline text-2xl font-bold text-green-800">
            🎉 Formation complète. Tu es certifié GND Consulting.
          </h2>
          <p className="mt-3 text-green-700">
            Tu peux revenir à tout moment sur les modules pour réviser.
          </p>
        </section>
      )}
    </div>
  );
}
