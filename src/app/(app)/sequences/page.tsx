import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  SEQUENCE_SELECT_COLUMNS,
  SEQUENCE_STEP_SELECT_COLUMNS,
  sortSteps,
  type Sequence,
  type SequenceStep,
  type SequenceWithSteps,
} from '@/lib/sequences';
import SequencesClient from './SequencesClient';

export const dynamic = 'force-dynamic';

/**
 * Bibliothèque des séquences de relance (Sprint 7) — route serveur.
 *
 * Charge en SSR toutes les séquences + leurs étapes (lecture autorisée à tout
 * authenticated via la RLS de 0014). On calcule un flag `canEdit` aligné sur
 * is_admin_or_limited() (role admin OU admin_limited) : les commerciaux voient
 * la bibliothèque en lecture, seuls les admins ont le builder. La garde réelle
 * reste côté server actions (assertAdmin), ce flag ne pilote que l'UI.
 *
 * Note : la jointure étapes ↔ séquences se fait applicativement (deux selects)
 * pour rester robuste si l'embed PostgREST n'est pas configuré.
 */
export default async function SequencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // Aligné sur is_admin_or_limited() côté SQL (RLS écriture).
  const canEdit = me?.role === 'admin' || me?.role === 'admin_limited';

  const [sequencesRes, stepsRes] = await Promise.all([
    supabase
      .from('sequences')
      .select(SEQUENCE_SELECT_COLUMNS)
      .order('created_at', { ascending: false }),
    supabase
      .from('sequence_steps')
      .select(SEQUENCE_STEP_SELECT_COLUMNS)
      .order('position', { ascending: true }),
  ]);

  const sequences = (sequencesRes.data ?? []) as unknown as Sequence[];
  const steps = (stepsRes.data ?? []) as unknown as SequenceStep[];

  // Regroupe les étapes par séquence.
  const stepsBySeq = new Map<string, SequenceStep[]>();
  for (const s of steps) {
    const list = stepsBySeq.get(s.sequence_id) ?? [];
    list.push(s);
    stepsBySeq.set(s.sequence_id, list);
  }

  const initialSequences: SequenceWithSteps[] = sequences.map((seq) => ({
    ...seq,
    steps: sortSteps(stepsBySeq.get(seq.id) ?? []),
  }));

  return (
    <SequencesClient
      initialSequences={initialSequences}
      canEdit={canEdit}
      userId={user.id}
    />
  );
}
