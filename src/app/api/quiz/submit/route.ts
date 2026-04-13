import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { QUIZ_PASS_THRESHOLD } from '@/lib/quiz/constants';

export const dynamic = 'force-dynamic';

// ---------- Validation ----------

const SubmitSchema = z.object({
  module_slug: z.string().min(1).max(128),
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        selected_ids: z.array(z.string().min(1).max(8)).min(0).max(8),
      })
    )
    .min(1)
    .max(64),
});

type AdminQuestion = {
  id: string;
  kind: 'single' | 'multiple';
  correct_ids: string[];
};

// ---------- Helpers ----------

function arraysEqualAsSets(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) {
    if (!sa.has(x)) return false;
  }
  return true;
}

// ---------- Route ----------

/**
 * POST /api/quiz/submit
 *
 * Recalcule le score côté serveur (le client n'envoie jamais de score).
 * Insère un quiz_attempts. Si percentage >= QUIZ_PASS_THRESHOLD,
 * upsert progressions sans jamais écraser un completed_at existant.
 *
 * Réponse :
 *   { score, total, percentage, passed, attempt_id,
 *     wrong_questions: [{ question_id, correct_ids, selected_ids }, ...] }
 */
export async function POST(req: Request) {
  // 1. Auth utilisateur
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validation du body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { module_slug, answers } = parsed.data;

  // 3. Lecture des questions via la service role key (bypass RLS pour correct_ids)
  const admin = createAdminClient();
  const { data: questions, error: questionsErr } = await admin
    .from('quiz_questions')
    .select('id, kind, correct_ids')
    .eq('module_slug', module_slug);

  if (questionsErr) {
    return NextResponse.json({ error: questionsErr.message }, { status: 500 });
  }

  if (!questions || questions.length === 0) {
    return NextResponse.json(
      { error: 'No questions found for this module' },
      { status: 404 }
    );
  }

  const questionMap = new Map<string, AdminQuestion>();
  for (const q of questions as AdminQuestion[]) {
    questionMap.set(q.id, q);
  }

  // 4. Scoring
  const total = questions.length;
  let score = 0;
  const wrong_questions: Array<{
    question_id: string;
    correct_ids: string[];
    selected_ids: string[];
  }> = [];

  // On parcourt les questions de la base (pas celles envoyées) pour éviter
  // qu'un client malicieux puisse tricher en n'envoyant que les bonnes.
  for (const q of questions as AdminQuestion[]) {
    const submitted = answers.find((a) => a.question_id === q.id);
    const selected_ids = submitted?.selected_ids ?? [];

    let correct = false;
    if (q.kind === 'single') {
      correct = selected_ids.length === 1 && q.correct_ids.includes(selected_ids[0]);
    } else {
      // multiple : ensemble strictement égal
      correct = arraysEqualAsSets(selected_ids, q.correct_ids);
    }

    if (correct) {
      score += 1;
    } else {
      wrong_questions.push({
        question_id: q.id,
        correct_ids: q.correct_ids,
        selected_ids,
      });
    }
  }

  const percentage = Math.floor((score * 100) / total);
  const passed = percentage >= QUIZ_PASS_THRESHOLD;

  // 5. Insertion de la tentative (service role)
  const { data: attempt, error: attemptErr } = await admin
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      module_slug,
      score,
      total,
      percentage,
      passed,
      answers,
    })
    .select('id')
    .single();

  if (attemptErr || !attempt) {
    return NextResponse.json(
      { error: attemptErr?.message ?? 'Failed to insert attempt' },
      { status: 500 }
    );
  }

  // 6. Mise à jour de progressions si passé
  if (passed) {
    const { data: existing } = await admin
      .from('progressions')
      .select('completed_at, best_percentage')
      .eq('user_id', user.id)
      .eq('module_slug', module_slug)
      .maybeSingle();

    if (!existing) {
      await admin.from('progressions').insert({
        user_id: user.id,
        module_slug,
        completed: true,
        completed_at: new Date().toISOString(),
        last_attempt_id: attempt.id,
        best_percentage: percentage,
      });
    } else {
      // Ne jamais écraser le completed_at existant.
      const newBest = Math.max(existing.best_percentage ?? 0, percentage);
      await admin
        .from('progressions')
        .update({
          completed: true,
          completed_at: existing.completed_at ?? new Date().toISOString(),
          last_attempt_id: attempt.id,
          best_percentage: newBest,
        })
        .eq('user_id', user.id)
        .eq('module_slug', module_slug);
    }
  }

  return NextResponse.json({
    score,
    total,
    percentage,
    passed,
    attempt_id: attempt.id,
    wrong_questions,
  });
}
