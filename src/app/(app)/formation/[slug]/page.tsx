import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { DriveVideoPlayer } from '@/components/DriveVideoPlayer';
import { loadModuleContent } from '@/lib/modules-registry';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

const VIDEO_MAP: Record<string, string> = {
  'module-01': '1UN2vudbmgUlmF1bEf8MBa5vSbOFL84Gc',
  'module-02': '12uAdpFr-IVwPE5-Xm678R6CYjqNjmyBy',
  'module-03': '1Vh7OBgZUQU9D7XPTqO-ypyjXPjnj4HW1',
  'module-04': '1vSBl6HQJDYkp3NUVVPkT5vK5_sFuiZiA',
  'module-05': '1XLujU9JeBMsBQSfaTOiGGExOkB-35H70',
  'module-06': '1KupM7Mi4sfYgatxlHlH6D1lXA23pSbhw',
  'module-07': '1wdN4Ff52GAekhLzsrSvPX2985ZqYGVdZ',
};

function getVideoFileId(slug: string): string | undefined {
  const prefix = slug.split('-').slice(0, 2).join('-');
  return VIDEO_MAP[prefix];
}

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
  const [{ data: progression }, { data: lastAttempt }] = await Promise.all([
    supabase
      .from('progressions')
      .select('completed, best_percentage')
      .eq('module_slug', slug)
      .maybeSingle(),
    supabase
      .from('quiz_attempts')
      .select('score, total, percentage, passed, created_at')
      .eq('module_slug', slug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const isValidated = Boolean(progression?.completed);
  const orderLabel = String(loaded.meta.order).padStart(2, '0');
  const videoFileId = getVideoFileId(slug);

  return (
    <article className="mx-auto max-w-3xl">
      {/* ====================================================== */}
      {/* Breadcrumb — minimal mono                                 */}
      {/* ====================================================== */}
      <nav className="mb-12 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-gnd-bronze-soft">
        <Link
          href="/formation"
          className="transition-colors hover:text-gnd-amber"
        >
          Formation
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-gnd-bronze">Module {orderLabel}</span>
      </nav>

      {/* ====================================================== */}
      {/* Editorial header                                          */}
      {/* ====================================================== */}
      <header className="mb-14">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gnd-amber/12 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-dim">
            E-learning path
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-bronze-soft">
            Lecture — {loaded.meta.duration} min
          </span>
          {isValidated && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-bronze">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Validé
            </span>
          )}
        </div>

        <p className="mb-3 font-display text-2xl italic font-medium text-gnd-amber">
          Module {orderLabel}
        </p>
        <h1 className="font-display text-display-lg font-medium leading-[1.05] tracking-tight text-gnd-bronze">
          {loaded.meta.title}
        </h1>
        <div className="mt-6 h-px w-16 bg-gnd-amber" />
      </header>

      {/* ====================================================== */}
      {/* Last attempt card                                          */}
      {/* ====================================================== */}
      {lastAttempt && (
        <section className="mb-12 flex flex-col gap-4 rounded-3xl border border-gnd-bronze/8 bg-white p-6 shadow-warm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze-soft">
              Dernière tentative
            </p>
            <p className="mt-1 font-display text-2xl font-medium text-gnd-bronze">
              {lastAttempt.score}
              <span className="text-gnd-bronze-soft">/{lastAttempt.total}</span>
              <span className="ml-3 text-base text-gnd-bronze-soft">
                {lastAttempt.percentage}%
              </span>
              {isValidated && progression?.best_percentage != null && (
                <span className="ml-3 text-xs font-medium text-gnd-bronze-soft">
                  · Meilleur : {progression.best_percentage}%
                </span>
              )}
            </p>
          </div>
          <Link
            href={`/formation/${slug}/quiz`}
            className="inline-flex items-center gap-2 rounded-full bg-gnd-bronze px-5 py-2.5 text-xs font-semibold text-gnd-cream transition-all hover:bg-gnd-ink hover:gap-3"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {isValidated ? 'Refaire le quiz' : 'Retenter le quiz'}
          </Link>
        </section>
      )}

      {/* ====================================================== */}
      {/* Video player                                              */}
      {/* ====================================================== */}
      {videoFileId && (
        <div className="mb-14 overflow-hidden rounded-3xl border border-gnd-bronze/8 bg-white shadow-warm">
          <DriveVideoPlayer
            fileId={videoFileId}
            title={`Module ${orderLabel} : ${loaded.meta.title}`}
          />
        </div>
      )}

      {/* ====================================================== */}
      {/* MDX content — styled via prose-gnd                        */}
      {/* ====================================================== */}
      <section className="prose prose-gnd prose-lg max-w-none">
        <MDXRemote source={loaded.body} options={mdxOptions} />
      </section>

      {/* ====================================================== */}
      {/* Quiz CTA                                                  */}
      {/* ====================================================== */}
      <section className="relative mt-20 overflow-hidden rounded-3xl border border-gnd-bronze/8 bg-gradient-to-br from-gnd-cream via-white to-gnd-cream-dim p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gnd-amber/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-gnd-bronze/8 blur-3xl"
        />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-md">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
              Quiz Module {orderLabel}
            </p>
            <h3 className="font-display text-2xl font-medium leading-tight text-gnd-bronze">
              {isValidated
                ? 'Module déjà validé.'
                : 'Prêt à valider tes acquis ?'}
            </h3>
            <p className="mt-2 text-sm text-gnd-bronze-soft">
              {isValidated
                ? `Meilleur score : ${progression?.best_percentage ?? 0}%. Tu peux retenter le quiz à tout moment.`
                : `Teste tes connaissances avant de passer à la suite. Seuil de validation : 70 %.`}
            </p>
          </div>
          <Link
            href={`/formation/${slug}/quiz`}
            className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-gnd-bronze px-7 py-4 text-sm font-semibold text-gnd-cream shadow-warm-lg transition-all hover:bg-gnd-ink hover:shadow-warm-xl"
          >
            <span>{isValidated ? 'Refaire le quiz' : 'Passer au quiz'}</span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>
      </section>
    </article>
  );
}
