import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type QuestionRow = {
  id: string;
  position: number;
  question: string;
  kind: 'single' | 'multiple';
  options: Array<{ id: string; label: string }>;
};

/**
 * GET /api/quiz/[module_slug]/questions
 *
 * Renvoie les questions d'un module pour affichage par le composant Quiz.
 * NE JAMAIS inclure correct_ids dans la réponse — c'est le scoring serveur
 * qui les utilise via la service role key.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ module_slug: string }> }
) {
  const { module_slug } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, position, question, kind, options')
    .eq('module_slug', module_slug)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const questions = (data ?? []) as QuestionRow[];

  return NextResponse.json({ questions });
}
