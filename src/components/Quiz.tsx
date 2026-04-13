'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QUIZ_PASS_THRESHOLD } from '@/lib/quiz/constants';

// ---------- Types ----------

type QuizOption = { id: string; label: string };

type Question = {
  id: string;
  position: number;
  question: string;
  kind: 'single' | 'multiple';
  options: QuizOption[];
  explanation: string | null;
};

type WrongQuestion = {
  question_id: string;
  correct_ids: string[];
  selected_ids: string[];
};

type SubmitResponse = {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  attempt_id: string;
  wrong_questions: WrongQuestion[];
};

type QuizProps = {
  moduleSlug: string;
};

type Phase = 'loading' | 'answering' | 'submitting' | 'result' | 'review' | 'error';

// ---------- Composant principal ----------

export default function Quiz({ moduleSlug }: QuizProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  // ---------- Chargement des questions ----------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setPhase('loading');
      setError(null);
      try {
        const res = await fetch(`/api/quiz/${moduleSlug}/questions`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Erreur ${res.status} au chargement du quiz`);
        }
        const json = (await res.json()) as { questions: Question[] };
        if (cancelled) return;
        setQuestions(json.questions);
        setAnswers({});
        setCurrent(0);
        setResult(null);
        setPhase('answering');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setPhase('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [moduleSlug]);

  function toggleAnswer(question: Question, optionId: string) {
    setAnswers((prev) => {
      const currentSel = prev[question.id] ?? [];
      if (question.kind === 'single') {
        return { ...prev, [question.id]: [optionId] };
      }
      if (currentSel.includes(optionId)) {
        return { ...prev, [question.id]: currentSel.filter((id) => id !== optionId) };
      }
      return { ...prev, [question.id]: [...currentSel, optionId] };
    });
  }

  async function handleSubmit() {
    if (phase === 'submitting') return;
    setPhase('submitting');
    setError(null);
    try {
      const payload = {
        module_slug: moduleSlug,
        answers: questions.map((q) => ({
          question_id: q.id,
          selected_ids: answers[q.id] ?? [],
        })),
      };
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `Erreur ${res.status}`);
      }
      const data = (await res.json()) as SubmitResponse;
      setResult(data);
      setPhase('result');
      if (data.passed) {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setPhase('error');
    }
  }

  function handleRetry() {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setError(null);
    setPhase('answering');
  }

  // ---------- Rendus ----------

  if (phase === 'loading') {
    return (
      <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">Chargement du quiz…</p>
      </section>
    );
  }

  if (phase === 'error' && questions.length === 0) {
    return (
      <section className="rounded-xl border border-error/20 bg-error-container p-10">
        <p className="text-sm text-on-error-container">
          Impossible de charger le quiz : {error}
        </p>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <section className="rounded-xl border border-tertiary-fixed/40 bg-tertiary-fixed/20 p-10">
        <p className="text-sm text-on-tertiary-fixed">
          Aucune question n&apos;est encore enregistrée pour ce module.
        </p>
      </section>
    );
  }

  // --- Écran résultat ---
  if (phase === 'result' && result) {
    return (
      <ResultScreen
        result={result}
        moduleSlug={moduleSlug}
        onShowReview={() => setPhase('review')}
        onRetry={handleRetry}
      />
    );
  }

  // --- Écran review (détail des réponses) ---
  if (phase === 'review' && result) {
    return (
      <ReviewScreen
        questions={questions}
        answers={answers}
        result={result}
        moduleSlug={moduleSlug}
        onRetry={handleRetry}
      />
    );
  }

  // --- Mode saisie question par question ---
  const question = questions[current];
  const selected = answers[question.id] ?? [];
  const hasAnswered = selected.length > 0;
  const answeredCount = questions.filter(
    (q) => (answers[q.id]?.length ?? 0) > 0
  ).length;
  const percentProgress = Math.round(
    ((current + 1) / questions.length) * 100
  );
  const isLast = current === questions.length - 1;
  const submitting = phase === 'submitting';

  return (
    <section className="space-y-8">
      {/* Progress */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-label font-medium text-on-surface-variant">
            Question {current + 1} / {questions.length}
          </span>
          <span className="font-label text-sm font-bold text-primary">
            {answeredCount} réponse{answeredCount > 1 ? 's' : ''} sur{' '}
            {questions.length}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percentProgress}%` }}
          />
        </div>
      </div>

      {/* Question courante */}
      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 md:p-10">
        <div className="mb-6 flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 min-w-[32px] items-center justify-center rounded-full bg-primary-fixed px-2.5 font-mono text-sm font-bold text-on-primary-fixed-variant">
            {String(current + 1).padStart(2, '0')}
          </span>
          <div className="flex-1">
            <p className="text-lg font-medium leading-relaxed text-on-surface md:text-xl">
              {question.question}
            </p>
            {question.kind === 'multiple' && (
              <p className="mt-1 text-xs text-on-surface-variant">
                Plusieurs réponses possibles
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            const inputId = `${question.id}-${opt.id}`;
            return (
              <label
                key={opt.id}
                htmlFor={inputId}
                className={
                  isSelected
                    ? 'flex cursor-pointer items-start gap-4 rounded-xl border border-primary bg-primary-fixed p-4 transition-all'
                    : 'flex cursor-pointer items-start gap-4 rounded-xl border border-transparent bg-surface-container-low p-4 transition-all hover:bg-primary-fixed/30'
                }
              >
                <input
                  id={inputId}
                  type={question.kind === 'single' ? 'radio' : 'checkbox'}
                  name={question.id}
                  value={opt.id}
                  checked={isSelected}
                  disabled={submitting}
                  onChange={() => toggleAnswer(question, opt.id)}
                  className="mt-0.5 h-5 w-5 cursor-pointer text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="font-body leading-snug text-on-surface">
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setCurrent((v) => Math.max(0, v - 1))}
          disabled={current === 0 || submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-3 font-label text-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Précédente
        </button>

        {/* Mini nav (pastilles) */}
        <div className="hidden items-center justify-center gap-1.5 md:flex">
          {questions.map((q, i) => {
            const answered = (answers[q.id]?.length ?? 0) > 0;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Aller à la question ${i + 1}`}
                className={
                  i === current
                    ? 'h-2.5 w-6 rounded-full bg-primary transition-all'
                    : answered
                    ? 'h-2.5 w-2.5 rounded-full bg-primary/50 transition-all hover:bg-primary/80'
                    : 'h-2.5 w-2.5 rounded-full bg-surface-container-highest transition-all hover:bg-outline-variant'
                }
              />
            );
          })}
        </div>

        {!isLast ? (
          <button
            type="button"
            onClick={() => setCurrent((v) => Math.min(questions.length - 1, v + 1))}
            disabled={!hasAnswered || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
          >
            Suivante
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={answeredCount < questions.length || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-8 py-3.5 font-headline text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {submitting
              ? 'Envoi…'
              : answeredCount < questions.length
              ? `Il reste ${questions.length - answeredCount} question${
                  questions.length - answeredCount > 1 ? 's' : ''
                }`
              : 'Soumettre mes réponses'}
            {answeredCount === questions.length && !submitting && (
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
            )}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------- Écran résultat (succès / échec) ----------

function ResultScreen({
  result,
  moduleSlug,
  onShowReview,
  onRetry,
}: {
  result: SubmitResponse;
  moduleSlug: string;
  onShowReview: () => void;
  onRetry: () => void;
}) {
  const { passed, score, total, percentage } = result;

  if (passed) {
    return (
      <section className="space-y-10">
        <div className="rounded-2xl bg-surface-container p-10 text-center md:p-16">
          <div className="mb-6 inline-flex h-24 w-24 animate-[pulse_2s_ease-in-out_infinite] items-center justify-center rounded-full bg-green-100 text-green-600">
            <span className="material-symbols-outlined filled text-6xl">
              check_circle
            </span>
          </div>
          <h3 className="mb-3 font-headline text-3xl font-bold text-on-surface md:text-4xl">
            Félicitations ! Module validé.
          </h3>
          <p className="mx-auto max-w-md text-lg text-on-surface-variant">
            Tu as obtenu <strong>{score}/{total}</strong> (
            <strong>{percentage}%</strong>).
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onShowReview}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-label font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined">visibility</span>
            Voir le détail des réponses
          </button>
          <Link
            href="/formation"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-8 py-4 font-label font-bold text-on-surface transition-all hover:bg-surface-container-low"
          >
            Retour à la formation
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="rounded-2xl bg-surface-container p-10 text-center md:p-16">
        <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant">
          <span className="material-symbols-outlined text-6xl">refresh</span>
        </div>
        <h3 className="mb-3 font-headline text-3xl font-bold text-on-surface md:text-4xl">
          Pas tout à fait…
        </h3>
        <p className="mx-auto mb-2 max-w-md text-lg text-on-surface-variant">
          Tu as obtenu <strong>{score}/{total}</strong> ({percentage}%) — seuil
          requis : {QUIZ_PASS_THRESHOLD}%.
        </p>
        <p className="mx-auto max-w-md text-sm text-on-surface-variant">
          Pas de panique, relis le module et retente. Tu peux essayer autant
          de fois que nécessaire.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href={`/formation/${moduleSlug}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-label font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined">menu_book</span>
          Relire le module
        </Link>
        <button
          type="button"
          onClick={onShowReview}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-4 font-label font-bold text-on-surface transition-all hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">visibility</span>
          Voir mes erreurs
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-4 font-label font-bold text-on-surface transition-all hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">refresh</span>
          Retenter
        </button>
      </div>
    </section>
  );
}

// ---------- Écran review (détail par question) ----------

function ReviewScreen({
  questions,
  answers,
  result,
  moduleSlug,
  onRetry,
}: {
  questions: Question[];
  answers: Record<string, string[]>;
  result: SubmitResponse;
  moduleSlug: string;
  onRetry: () => void;
}) {
  const wrongMap = new Map<string, WrongQuestion>();
  for (const w of result.wrong_questions) wrongMap.set(w.question_id, w);

  return (
    <section className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Récapitulatif
          </p>
          <p className="font-headline text-2xl font-bold text-on-surface">
            {result.score}/{result.total} · {result.percentage}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/formation"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            Formation
          </Link>
          {!result.passed && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              Retenter
            </button>
          )}
          {result.passed && (
            <Link
              href={`/formation/${moduleSlug}/quiz`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">
                refresh
              </span>
              Refaire le quiz
            </Link>
          )}
        </div>
      </div>

      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const wrong = wrongMap.get(q.id);
          const ok = !wrong;
          const selected = answers[q.id] ?? [];
          const correctIds = wrong?.correct_ids;

          return (
            <li
              key={q.id}
              className={
                ok
                  ? 'rounded-xl border border-green-200 bg-green-50/40 p-6 md:p-8'
                  : 'rounded-xl border border-red-200 bg-red-50/40 p-6 md:p-8'
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-sm text-on-surface-variant">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <p className="font-medium leading-relaxed text-on-surface">
                    {q.question}
                  </p>
                </div>
                <span
                  className={
                    ok
                      ? 'material-symbols-outlined shrink-0 text-2xl text-green-600'
                      : 'material-symbols-outlined shrink-0 text-2xl text-red-600'
                  }
                >
                  {ok ? 'check_circle' : 'cancel'}
                </span>
              </div>

              <div className="mt-4 space-y-2 pl-8">
                {q.options.map((opt) => {
                  const isSelected = selected.includes(opt.id);
                  const isCorrect = correctIds?.includes(opt.id);
                  const hlCorrect = !ok && isCorrect;
                  const hlWrong = !ok && isSelected && !isCorrect;

                  return (
                    <div
                      key={opt.id}
                      className={
                        hlCorrect
                          ? 'rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm'
                          : hlWrong
                          ? 'rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm line-through'
                          : isSelected
                          ? 'rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm'
                          : 'rounded-lg border border-transparent px-4 py-2.5 text-sm text-on-surface-variant'
                      }
                    >
                      {opt.label}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div
                  className={
                    ok
                      ? 'mt-5 rounded-lg border-l-4 border-green-400 bg-green-100/40 px-4 py-3 pl-5 text-sm italic text-green-900'
                      : 'mt-5 rounded-lg border-l-4 border-red-400 bg-red-100/40 px-4 py-3 pl-5 text-sm italic text-red-900'
                  }
                >
                  <span className="mr-1 font-semibold not-italic">
                    Pourquoi :
                  </span>
                  {q.explanation}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/formation"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-8 py-4 font-label font-bold text-on-surface transition-all hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Retour à la formation
        </Link>
        {!result.passed && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-label font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
          >
            <span className="material-symbols-outlined">refresh</span>
            Retenter le quiz
          </button>
        )}
      </div>
    </section>
  );
}
