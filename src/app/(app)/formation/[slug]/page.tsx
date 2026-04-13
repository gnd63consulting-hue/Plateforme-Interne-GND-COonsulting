import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { loadModuleContent } from '@/lib/modules-registry';
import Quiz from '@/components/Quiz';

export const dynamic = 'force-dynamic';

// Composants exposés au scope MDX. Chaque fichier .mdx peut écrire
// `<Quiz moduleSlug="module-XX-..." />` en fin de page.
const mdxComponents = { Quiz };

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
        <MDXRemote source={loaded.body} components={mdxComponents} />
      </div>
    </article>
  );
}
