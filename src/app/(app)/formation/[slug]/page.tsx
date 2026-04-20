import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
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
      {/* Breadcrumb */}
      <nav className="mb-10 flex items-center gap-2 text-sm text-on-surface-variant">
        <Link href="/formation" className="transition-colors hover:text-primary">
          Formation
        </Link>
        <span className="material-symbols-outlined text-[16px]">
          chevron_right
        </span>
        <span className="font-semibold text-on-surface">
          Module {orderLabel}
        </span>
      </nav>

      {/* Editorial title */}
      <header className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-full bg-primary-fixed px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed-variant">
            E-Learning Path
          </span>
          <span className="text-xs font-medium text-on-surface-variant">
            Temps de lecture : {loaded.meta.duration} min
          </span>
          {isValidated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-700">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              Validé
            </span>
          )}
        </div>
        <h1 className="font-headline text-[36px] font-bold leading-tight tracking-tight text-on-surface md:text-[48px]">
          Module {orderLabel} : {loaded.meta.title}
        </h1>
        <div className="mt-6 h-1 w-24 rounded-full bg-primary" />
      </header>

      {/* Récap dernière tentative (si le module a déjà été tenté) */}
      {lastAttempt && (
        <section
          className={
            isValidated
              ? 'mb-12 flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50/50 p-6 sm:flex-row sm:items-center sm:justify-between'
              : 'mb-12 flex flex-col gap-3 rounded-2xl border border-tertiary-fixed/60 bg-tertiary-fixed/20 p-6 sm:flex-row sm:items-center sm:justify-between'
          }
        >
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Dernière tentative
            </p>
            <p className="font-headline text-xl font-bold text-on-surface">
              {lastAttempt.score}/{lastAttempt.total} ({lastAttempt.percentage}%)
              {isValidated && progression?.best_percentage != null && (
                <span className="ml-2 text-sm font-medium text-on-surface-variant">
                  · Meilleur : {progression.best_percentage}%
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/formation/${slug}/quiz`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              {isValidated ? 'Refaire le quiz' : 'Retenter le quiz'}
            </Link>
          </div>
        </section>
      )}

      {/* Video player (if available for this module) */}
      {videoFileId && (
        <DriveVideoPlayer
          fileId={videoFileId}
          title={`Module ${orderLabel} : ${loaded.meta.title}`}
        />
      )}

      {/* Reading canvas */}
      <section className="prose-academic">
        <MDXRemote source={loaded.body} options={mdxOptions} />
      </section>

      {/* Quiz CTA */}
      <section className="relative mt-20 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h3 className="mb-2 font-headline text-[24px] font-bold text-on-surface">
              {isValidated
                ? 'Module déjà validé ✅'
                : 'Prêt à valider tes acquis ?'}
            </h3>
            <p className="text-on-surface-variant">
              {isValidated
                ? `Meilleur score : ${progression?.best_percentage ?? 0}%. Tu peux retenter le quiz, ça ne remplacera pas la date de validation initiale.`
                : `Teste tes connaissances sur le Module ${orderLabel} avant de passer à la suite. Seuil : 70%.`}
            </p>
          </div>
          <Link
            href={`/formation/${slug}/quiz`}
            className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-gradient-to-r from-primary to-primary-container px-8 py-4 font-headline font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>
              {isValidated ? 'Refaire le quiz' : 'Passer au quiz'}
            </span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </article>
  );
}
