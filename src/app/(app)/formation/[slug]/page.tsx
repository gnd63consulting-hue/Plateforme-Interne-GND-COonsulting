import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { createClient } from '@/lib/supabase-server';
import { loadModuleContent } from '@/lib/modules-registry';
import QuizSection from '@/components/QuizSection';

export const dynamic = 'force-dynamic';

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loaded = loadModuleContent(slug);

  if (!loaded) {
    notFound();
  }

  const supabase = await createClient();
  const { data: progressions } = await supabase
    .from('progressions')
    .select('module_slug, completed');

  const completedSet = new Set(
    (progressions ?? [])
      .filter((p) => p.completed)
      .map((p) => p.module_slug)
  );

  const alreadyCompleted = completedSet.has(slug);

  return (
    <article className="space-y-8">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <Link
          href="/formation"
          className="text-sm text-gnd-muted hover:text-gnd-primary"
        >
          ← Retour à la formation
        </Link>

        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm uppercase tracking-wider text-gnd-muted">
            Module {String(loaded.meta.order).padStart(2, '0')}
          </span>
          <span className="text-xs text-gnd-muted">• {loaded.meta.duration} min</span>
        </div>

        <h1 className="text-3xl font-bold text-gnd-primary">{loaded.meta.title}</h1>
      </header>

      <div className="prose-module">
        <MDXRemote source={loaded.body} />
      </div>

      <QuizSection
        moduleSlug={slug}
        tallyUrl={loaded.meta.tally_url}
        alreadyCompleted={alreadyCompleted}
      />
    </article>
  );
}
