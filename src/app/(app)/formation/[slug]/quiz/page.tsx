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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <Link
          href={`/formation/${slug}`}
          className="text-sm text-gnd-muted hover:text-gnd-primary"
        >
          ← Retour au module
        </Link>

        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm uppercase tracking-wider text-gnd-muted">
            Quiz — Module {String(module_.order).padStart(2, '0')}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gnd-primary">{module_.title}</h1>
        <p className="text-sm text-gnd-muted">
          Seuil de validation : {QUIZ_PASS_THRESHOLD}%. Tu peux retenter autant
          que nécessaire.
        </p>
      </header>

      <Quiz moduleSlug={slug} />
    </div>
  );
}
