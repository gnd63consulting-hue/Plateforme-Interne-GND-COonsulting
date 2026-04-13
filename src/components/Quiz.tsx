'use client';

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

  // Fetch des questions au mount (et au reset)
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

  // Gestion sélection d'une réponse
  function toggleAnswer(question: Question, optionId: string) {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.kind === 'single') {
        return { ...prev, [question.id]: [optionId] };
      }
      // multiple
      if (current.includes(optionId)) {
        return { ...prev, [question.id]: current.filter((id) => id !== optionId) };
      }
      return { ...prev, [question.id]: [...current, optionId] };
    });
  }

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

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
      // Si validé : on laisse la bannière verte s'afficher 2 secondes puis
      // on renvoie le commercial vers la liste des modules (le module qu'il
      // vient de valider est maintenant ✅ et le suivant est déverrouillé).
      if (data.passed) {
        router.refresh();
        setTimeout(() => {
          router.push('/formation');
        }, 2000);
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
      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-gnd-muted">Chargement du quiz…</p>
      </section>
    );
  }

  if (status === 'error' && questions.length === 0) {
    return (
      <section className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Impossible de charger le quiz : {error}
        </p>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <section className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm text-amber-800">
          Aucune question n&apos;est encore enregistrée pour ce module. Reviens
          plus tard.
        </p>
      </section>
    );
  }

  const wrongMap = new Map<string, WrongQuestion>();
  if (result) {
    for (const w of result.wrong_questions) {
      wrongMap.set(w.question_id, w);
    }
  }

  return (
    <section className="mt-12 space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Quiz de validation
        </h2>
        <p className="mt-1 text-sm text-gnd-muted">
          Seuil de validation : {QUIZ_PASS_THRESHOLD}%. Tu peux retenter autant
          que nécessaire.
        </p>

        {result && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              result.passed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <p className="text-base font-semibold">
              {result.passed ? 'Module validé.' : 'Pas encore.'}
            </p>
            <p className="mt-1 text-sm">
              Score : {result.score} / {result.total} ({result.percentage}%)
              {!result.passed && (
                <>
                  {' '}— Il faut au moins {QUIZ_PASS_THRESHOLD}% pour valider.
                  Relis le module et réessaye.
                </>
              )}
            </p>
          </div>
        )}
      </header>

      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const selected = answers[q.id] ?? [];
          const wrong = wrongMap.get(q.id);
          const isAnsweredOk = result && !wrong;
          const isAnsweredKo = result && wrong;

          return (
            <li
              key={q.id}
              className={`rounded-2xl border p-6 ${
                isAnsweredOk
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : isAnsweredKo
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-sm text-gnd-muted">
                  {String(idx + 1).padStart(2, '0')}.
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gnd-primary">{q.question}</p>
                  {q.kind === 'multiple' && !result && (
                    <p className="mt-1 text-xs text-gnd-muted">
                      Plusieurs réponses possibles
                    </p>
                  )}
                </div>
                {result && (
                  <span className="text-lg" aria-hidden>
                    {isAnsweredOk ? '✅' : '❌'}
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {q.options.map((opt) => {
                  const isSelected = selected.includes(opt.id);
                  const isCorrect = wrong?.correct_ids.includes(opt.id);
                  const showCorrectHighlight = result && isCorrect;
                  const showWrongHighlight =
                    result && isSelected && wrong && !isCorrect;

                  const inputId = `${q.id}-${opt.id}`;

                  return (
                    <label
                      key={opt.id}
                      htmlFor={inputId}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                        showCorrectHighlight
                          ? 'border-emerald-300 bg-emerald-50'
                          : showWrongHighlight
                          ? 'border-red-300 bg-red-50'
                          : isSelected
                          ? 'border-gnd-accent bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${result ? 'cursor-default' : ''}`}
                    >
                      <input
                        id={inputId}
                        type={q.kind === 'single' ? 'radio' : 'checkbox'}
                        name={q.id}
                        value={opt.id}
                        checked={isSelected}
                        disabled={status === 'submitting' || status === 'submitted'}
                        onChange={() => toggleAnswer(q, opt.id)}
                        className="mt-1 shrink-0"
                      />
                      <span className="text-slate-700">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {!result && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || status === 'submitting'}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'submitting' ? 'Envoi…' : 'Soumettre mes réponses'}
          </button>
        )}

        {result && (
          <button type="button" onClick={handleRetry} className="btn-secondary">
            Retenter le quiz
          </button>
        )}
      </div>
    </section>
  );
}
