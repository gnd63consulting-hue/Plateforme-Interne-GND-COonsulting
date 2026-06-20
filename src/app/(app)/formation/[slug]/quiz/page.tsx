import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, BadgeCheck } from 'lucide-react';
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
      <nav className="mb-8 flex items-center gap-2 font-inter text-sm text-muted-warm">
        <Link href="/formation" className="transition-colors hover:text-brand">
          Formation
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <Link
          href={`/formation/${slug}`}
          className="transition-colors hover:text-brand"
        >
          Module {orderLabel}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <span className="font-semibold text-choco">Quiz</span>
      </nav>

      {/* Quiz Header */}
      <header className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-marcellus text-[28px] font-medium tracking-tight text-choco">
            Quiz : {module_.title}
          </h1>
          <p className="mt-1 font-inter text-muted-warm">
            Module {orderLabel} — Valide tes connaissances
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-cream-deep px-4 py-2">
          <BadgeCheck className="h-4 w-4 text-brand-dark" aria-hidden />
          <span className="font-inter text-sm font-semibold text-choco">
            Seuil : {QUIZ_PASS_THRESHOLD}%
          </span>
        </div>
      </header>

      <Quiz moduleSlug={slug} />
    </div>
  );
}
