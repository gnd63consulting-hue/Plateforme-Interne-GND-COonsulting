import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import FormationClient from './FormationClient';

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

  const bestByModule: Record<string, number | null> = {};
  for (const p of progressions ?? []) {
    bestByModule[p.module_slug] = p.best_percentage ?? null;
  }

  const questionCounts: Record<string, number> = {};
  for (const row of questions ?? []) {
    questionCounts[row.module_slug] = (questionCounts[row.module_slug] ?? 0) + 1;
  }

  const modulesWithState = MODULES.map((mod, idx) => {
    let state: 'validated' | 'available' | 'locked';
    if (completedSet.has(mod.slug)) {
      state = 'validated';
    } else if (idx === 0) {
      state = 'available';
    } else {
      const prev = MODULES[idx - 1];
      state = completedSet.has(prev.slug) ? 'available' : 'locked';
    }

    return {
      slug: mod.slug,
      title: mod.title,
      order: mod.order,
      duration: mod.duration,
      state,
      questionsCount: questionCounts[mod.slug],
      bestPercentage: bestByModule[mod.slug] ?? null,
      previousOrder: idx > 0 ? MODULES[idx - 1].order : undefined,
    };
  });

  const completedCount = MODULES.filter((m) => completedSet.has(m.slug)).length;
  const profile = user?.user;
  const firstName =
    (profile?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    profile?.email?.split('@')[0] ??
    'commercial';

  return (
    <FormationClient
      modules={modulesWithState}
      completedCount={completedCount}
      totalCount={MODULES.length}
      firstName={firstName}
    />
  );
}
