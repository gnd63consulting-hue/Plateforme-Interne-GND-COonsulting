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

type Status = 'loading' | 'idle' | 'submitting' | 'submitted' | 'error';

// ---------- Composant ----------

export default function Quiz({ moduleSlug }: QuizProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
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
        setResult(null);
        setStatus('idle');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [moduleSlug]);

  function toggleAnswer(question: Question, optionId: string) {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.kind === 'single') {
        return { ...prev, [question.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [question.id]: current.filter((id) => id !== optionId) };
      }
      return { ...prev, [question.id]: [...current, optionId] };
    });
  }

  const answeredCount = questions.filter(
    (q) => (answers[q.id]?.length ?? 0) > 0
  ).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  async function handleSubmit() {
    if (!allAnswered || status === 'submitting') return;
    setStatus('submitting');
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
      setStatus('submitted');
      if (data.passed) {
        router.refresh();
        setTimeout(() => {
          router.push('/formation');
        }, 2500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStatus('error');
    }
  }

  function handleRetry() {
    setAnswers({});
    setResult(null);
    setStatus('idle');
    setError(null);
  }

  // ---------- Rendu ----------

  if (status === 'loading') {
    return (
      <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">
          Chargement du quiz…
        </p>
      </section>
    );
  }

  if (status === 'error' && questions.length === 0) {
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

  // ---------- État résultat ----------

  if (result) {
    const wrongMap = new Map<string, WrongQuestion>();
    for (const w of result.wrong_questions) wrongMap.set(w.question_id, w);

    return (
      <section className="space-y-8">
        <ResultBanner result={result} />

        {/* Review : questions avec feedback */}
        <ol className="space-y-4">
          {questions.map((q, idx) => {
            const wrong = wrongMap.get(q.id);
            const ok = !wrong;
            const selected = answers[q.id] ?? [];

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
                  <span className="material-symbols-outlined filled text-2xl shrink-0">
                    {ok ? (
                      <span className="text-green-600">check_circle</span>
                    ) : (
                      <span className="text-red-600">cancel</span>
                    )}
                  </span>
                </div>

                <div className="mt-4 space-y-2 pl-8">
                  {q.options.map((opt) => {
                    const isSelected = selected.includes(opt.id);
                    const isCorrect = wrong?.correct_ids.includes(opt.id);
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
              </li>
            );
          })}
        </ol>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {result.passed ? (
            <Link
              href="/formation"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-label font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
            >
              <span>Retour à la formation</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          ) : (
            <>
              <Link
                href={`/formation/${moduleSlug}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-8 py-4 font-label font-bold text-on-surface transition-all hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                <span>Relire le module</span>
              </Link>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-label font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
              >
                <span className="material-symbols-outlined">refresh</span>
                <span>Retenter le quiz</span>
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  // ---------- État saisie ----------

  const percentProgress = Math.round(
    (answeredCount / questions.length) * 100
  );

  return (
    <section className="space-y-8">
      {/* Progress */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-label font-medium text-on-surface-variant">
            {answeredCount} / {questions.length} questions répondues
          </span>
          <span className="font-label text-sm font-bold text-primary">
            {percentProgress}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percentProgress}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <ol className="space-y-6">
        {questions.map((q, idx) => (
          <li
            key={q.id}
            className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 md:p-8"
          >
            <div className="mb-6 flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-primary-fixed px-2 font-mono text-sm font-bold text-on-primary-fixed-variant">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <p className="text-lg font-medium leading-relaxed text-on-surface">
                  {q.question}
                </p>
                {q.kind === 'multiple' && (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Plusieurs réponses possibles
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {q.options.map((opt) => {
                const selected = (answers[q.id] ?? []).includes(opt.id);
                const inputId = `${q.id}-${opt.id}`;
                return (
                  <label
                    key={opt.id}
                    htmlFor={inputId}
                    className={
                      selected
                        ? 'flex cursor-pointer items-start gap-4 rounded-xl border border-primary bg-primary-fixed p-4 transition-all'
                        : 'flex cursor-pointer items-start gap-4 rounded-xl border border-transparent bg-surface-container-low p-4 transition-all hover:bg-primary-fixed/30'
                    }
                  >
                    <div className="mt-0.5">
                      <input
                        id={inputId}
                        type={q.kind === 'single' ? 'radio' : 'checkbox'}
                        name={q.id}
                        value={opt.id}
                        checked={selected}
                        disabled={status === 'submitting'}
                        onChange={() => toggleAnswer(q, opt.id)}
                        className="h-5 w-5 cursor-pointer text-primary focus:ring-primary focus:ring-offset-0"
                      />
                    </div>
                    <span className="font-body leading-snug text-on-surface">
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || status === 'submitting'}
          className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary to-primary-container px-10 py-4 font-headline font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <span>
            {status === 'submitting'
              ? 'Envoi…'
              : allAnswered
              ? 'Soumettre mes réponses'
              : `Réponds aux ${questions.length - answeredCount} questions restantes`}
          </span>
          {allAnswered && status !== 'submitting' && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
      </div>
    </section>
  );
}

// ---------- Bannière résultat ----------

function ResultBanner({ result }: { result: SubmitResponse }) {
  const { passed, score, total, percentage } = result;

  if (passed) {
    return (
      <div className="rounded-2xl bg-surface-container p-10 text-center md:p-12">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <span className="material-symbols-outlined filled text-5xl">
            check_circle
          </span>
        </div>
        <h3 className="mb-2 font-headline text-3xl font-bold text-on-surface">
          Félicitations !
        </h3>
        <p className="mx-auto mb-2 max-w-md text-on-surface-variant">
          Tu as validé ce module avec un score de <strong>{percentage}%</strong>{' '}
          ({score}/{total}).
        </p>
        <p className="text-xs text-on-surface-variant">
          Retour automatique à la formation dans un instant…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-container p-10 text-center md:p-12">
      <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <span className="material-symbols-outlined filled text-5xl">
          cancel
        </span>
      </div>
      <h3 className="mb-2 font-headline text-3xl font-bold text-on-surface">
        Presque !
      </h3>
      <p className="mx-auto max-w-md text-on-surface-variant">
        Ton score est de <strong>{percentage}%</strong> ({score}/{total}). Il
        faut au moins {QUIZ_PASS_THRESHOLD}% pour valider ce module. Relis la
        leçon et retente le quiz quand tu es prêt.
      </p>
    </div>
  );
}
