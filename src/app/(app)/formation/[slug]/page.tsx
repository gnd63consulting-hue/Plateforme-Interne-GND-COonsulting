import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { loadModuleContent } from '@/lib/modules-registry';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

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
  const { data: progression } = await supabase
    .from('progressions')
    .select('completed, best_percentage')
    .eq('module_slug', slug)
    .maybeSingle();

  const isValidated = Boolean(progression?.completed);

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
          <span className="text-xs text-gnd-muted">
            • {loaded.meta.duration} min
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gnd-primary">
          {loaded.meta.title}
        </h1>
      </header>

      <div className="prose-module">
        <MDXRemote source={loaded.body} options={mdxOptions} />
      </div>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        {isValidated ? (
          <>
            <h2 className="text-xl font-semibold text-gnd-primary">
              Module déjà validé ✅
            </h2>
            <p className="mt-2 text-sm text-gnd-muted">
              Meilleur score : {progression?.best_percentage ?? 0}%. Tu peux
              retenter le quiz pour t&apos;entraîner, ça ne remplacera pas la date
              de validation initiale.
            </p>
            <Link
              href={`/formation/${slug}/quiz`}
              className="btn-secondary mt-6 inline-block"
            >
              Refaire le quiz
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gnd-primary">
              Prêt à valider ce module&nbsp;?
            </h2>
            <p className="mt-2 text-sm text-gnd-muted">
              Teste tes connaissances avec le quiz de validation. Seuil
              requis&nbsp;: 70%. Tu peux retenter autant que nécessaire.
            </p>
            <Link
              href={`/formation/${slug}/quiz`}
              className="btn-primary mt-6 inline-block"
            >
              Passer le quiz →
            </Link>
          </>
        )}
      </section>
    </article>
  );
}
