import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModuleBySlug } from '@/lib/modules-registry';
import Quiz from '@/components/Quiz';
import { QUIZ_PASS_THRESHOLD } from '@/lib/quiz/constants';

export const dynamic = 'force-dynamic';

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const module_ = getModuleBySlug(slug);

  if (!module_) {
    notFound();
  }

  const orderLabel = String(module_.order).padStart(2, '0');

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-on-surface-variant">
        <Link href="/formation" className="transition-colors hover:text-primary">
          Formation
        </Link>
        <span className="material-symbols-outlined text-[16px]">
          chevron_right
        </span>
        <Link
          href={`/formation/${slug}`}
          className="transition-colors hover:text-primary"
        >
          Module {orderLabel}
        </Link>
        <span className="material-symbols-outlined text-[16px]">
          chevron_right
        </span>
        <span className="font-semibold text-on-surface">Quiz</span>
      </nav>

      {/* Quiz Header */}
      <header className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline text-[28px] font-bold tracking-tight text-on-surface">
            Quiz : {module_.title}
          </h1>
          <p className="mt-1 font-label text-on-surface-variant">
            Module {orderLabel} — Valide tes connaissances
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-surface-container-high px-4 py-2">
          <span className="material-symbols-outlined text-primary">verified</span>
          <span className="font-label text-sm font-semibold text-on-surface">
            Seuil : {QUIZ_PASS_THRESHOLD}%
          </span>
        </div>
      </header>

      <Quiz moduleSlug={slug} />
    </div>
  );
}
