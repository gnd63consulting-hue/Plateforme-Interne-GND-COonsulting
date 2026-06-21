import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { DriveVideoPlayer } from '@/components/DriveVideoPlayer';
import ReadingProgress from '@/components/ReadingProgress';
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
    <>
      {/* Sticky reading progress at viewport top */}
      <ReadingProgress />

      {/* Decorative side watermark — large screens only, fixed position */}
      <div
        aria-hidden
        className="pointer-events-none fixed right-[-2rem] top-[15vh] z-0 hidden select-none font-marcellus text-[16rem] font-medium italic leading-none text-choco/[0.045] xl:block xl:text-[20rem] print:hidden"
      >
        {orderLabel}
      </div>

      <article className="relative mx-auto max-w-3xl">
        {/* ====================================================== */}
        {/* Breadcrumb — minimal mono                                 */}
        {/* ====================================================== */}
        <nav
          className="mb-12 flex animate-fade-in items-center gap-2 font-inter text-[11px] font-medium uppercase tracking-[0.15em] text-muted-warm opacity-0"
          style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
        >
          <Link
            href="/formation"
            className="transition-colors hover:text-brand"
          >
            Formation
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-choco">Module {orderLabel}</span>
        </nav>

        {/* ====================================================== */}
        {/* Editorial header                                          */}
        {/* ====================================================== */}
        <header
          className="mb-14 animate-fade-in-up opacity-0"
          style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="label-eyebrow inline-flex items-center gap-1.5 rounded-full bg-brand-pale px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-brand-burnt">
              E-learning path
            </span>
            <span className="inline-flex items-center rounded-full bg-cream-deep px-3 py-1 font-inter text-[10px] uppercase tracking-[0.15em] text-muted-warm">
              Lecture — {loaded.meta.duration} min
            </span>
            {isValidated && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ok-fg">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Validé
              </span>
            )}
          </div>

          <p className="mb-3 font-marcellus text-2xl italic font-medium text-brand-dark">
            Module {orderLabel}
          </p>
          <h1 className="font-marcellus text-display-lg font-medium leading-[1.05] tracking-tight text-choco">
            {loaded.meta.title}
          </h1>
          <div className="mt-6 h-px w-16 bg-brand" />
        </header>

        {/* ====================================================== */}
        {/* Last attempt card                                          */}
        {/* ====================================================== */}
        {lastAttempt && (
          <section
            className="surface-ceramic mb-12 flex animate-fade-in-up flex-col gap-4 rounded-3xl p-6 opacity-0 sm:flex-row sm:items-center sm:justify-between"
            style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}
          >
            <div>
              <p className="label-eyebrow text-[10px] font-semibold tracking-[0.18em] text-brand-burnt">
                Dernière tentative
              </p>
              <p className="mt-1 font-marcellus text-2xl font-medium tabular-nums text-choco">
                {lastAttempt.score}
                <span className="text-muted-warm">/{lastAttempt.total}</span>
                <span className="ml-3 text-base text-muted-warm">
                  {lastAttempt.percentage}%
                </span>
                {isValidated && progression?.best_percentage != null && (
                  <span className="ml-3 text-xs font-medium text-muted-warm">
                    · Meilleur : {progression.best_percentage}%
                  </span>
                )}
              </p>
            </div>
            <Link
              href={`/formation/${slug}/quiz`}
              className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white px-5 py-2.5 text-xs font-semibold text-choco transition-all hover:gap-3 hover:bg-cream-deep"
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
          <div
            className="surface-ceramic mb-14 animate-fade-in-up overflow-hidden rounded-3xl p-1.5 opacity-0"
            style={{ animationDelay: '320ms', animationFillMode: 'forwards' }}
          >
            <div className="overflow-hidden rounded-[1.35rem]">
              <DriveVideoPlayer
                fileId={videoFileId}
                title={`Module ${orderLabel} : ${loaded.meta.title}`}
              />
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* MDX content — styled via prose-gnd                        */}
        {/* ====================================================== */}
        <section
          className="prose prose-gnd prose-lg max-w-none animate-fade-in-up font-inter opacity-0"
          style={{ animationDelay: '420ms', animationFillMode: 'forwards' }}
        >
          <MDXRemote source={loaded.body} options={mdxOptions} />
        </section>

        {/* ====================================================== */}
        {/* Quiz CTA                                                  */}
        {/* ====================================================== */}
        <section className="surface-chocolate orange-glow relative mt-20 overflow-hidden rounded-3xl p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-brand/10 blur-3xl"
          />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-md">
              <p className="label-eyebrow mb-3 text-[10px] font-semibold tracking-[0.2em] text-brand">
                Quiz Module {orderLabel}
              </p>
              <h3 className="font-marcellus text-2xl font-medium leading-tight text-cream">
                {isValidated
                  ? 'Module déjà validé.'
                  : 'Prêt à valider tes acquis ?'}
              </h3>
              <p className="mt-2 text-sm text-cream/75">
                {isValidated
                  ? `Meilleur score : ${progression?.best_percentage ?? 0}%. Tu peux retenter le quiz à tout moment.`
                  : `Teste tes connaissances avant de passer à la suite. Seuil de validation : 70 %.`}
              </p>
            </div>
            <Link
              href={`/formation/${slug}/quiz`}
              className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-[#2A1810] shadow-glow-brand-lg transition-all hover:bg-brand-dark"
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
    </>
  );
}
