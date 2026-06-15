'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import type { SequenceStepKind } from '@/lib/sequences';

/* ====================================================================== */
/* Garde admin                                                            */
/* ====================================================================== */

/**
 * Vérifie que l'appelant est admin OU admin_limited (même périmètre que la
 * fonction SQL is_admin_or_limited() utilisée par les RLS de 0014).
 *
 * On lit la session via le client serveur (cookies), puis le rôle dans
 * public.users. Les mutations elles-mêmes passent par le client service-role
 * (bypass RLS) UNIQUEMENT après cette garde — jamais exposé au client.
 */
async function assertAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Non authentifié.' };

    const { data: me } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (me?.role === 'admin' || me?.role === 'admin_limited') {
      return { ok: true };
    }
    return { ok: false, error: 'Action réservée aux administrateurs.' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur de vérification.',
    };
  }
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_KINDS: SequenceStepKind[] = [
  'call',
  'email',
  'linkedin',
  'task',
  'note',
];

/* ====================================================================== */
/* Séquences                                                              */
/* ====================================================================== */

/** Crée une séquence (vide). Le created_by est posé via service-role. */
export async function createSequence(
  name: string,
  description: string | null,
  createdBy: string | null
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return guard;

  const trimmed = (name ?? '').trim();
  if (!trimmed) return { ok: false, error: 'Le nom est obligatoire.' };

  const admin = createAdminClient();
  const { error } = await admin.from('sequences').insert({
    name: trimmed,
    description: description?.trim() || null,
    created_by: createdBy ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/sequences');
  return { ok: true };
}

/** Active / désactive une séquence (toggle visible côté inscription). */
export async function toggleSequenceActive(
  sequenceId: string,
  active: boolean
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from('sequences')
    .update({ active })
    .eq('id', sequenceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/sequences');
  return { ok: true };
}

/** Supprime une séquence (CASCADE supprime ses étapes). */
export async function deleteSequence(
  sequenceId: string
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from('sequences')
    .delete()
    .eq('id', sequenceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/sequences');
  return { ok: true };
}

/* ====================================================================== */
/* Étapes                                                                 */
/* ====================================================================== */

export type StepInput = {
  /** id présent = update, absent = insert. */
  id?: string;
  position: number;
  kind: string;
  delay_days: number;
  title: string;
  template_body: string | null;
};

/**
 * Crée ou met à jour une étape. La `position` est gérée par le client
 * (longueur de la liste à l'ajout). Pour réordonner, voir reorderSteps.
 */
export async function upsertStep(
  sequenceId: string,
  step: StepInput
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return guard;

  const title = (step.title ?? '').trim();
  if (!title) return { ok: false, error: "L'intitulé de l'étape est obligatoire." };

  const kind = VALID_KINDS.includes(step.kind as SequenceStepKind)
    ? step.kind
    : 'task';
  const delay = Number.isFinite(step.delay_days)
    ? Math.max(0, Math.trunc(step.delay_days))
    : 0;
  const position = Number.isFinite(step.position)
    ? Math.max(0, Math.trunc(step.position))
    : 0;

  const admin = createAdminClient();

  const payload = {
    sequence_id: sequenceId,
    position,
    kind,
    delay_days: delay,
    title,
    template_body: step.template_body?.trim() || null,
  };

  const { error } = step.id
    ? await admin.from('sequence_steps').update(payload).eq('id', step.id)
    : await admin.from('sequence_steps').insert(payload);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/sequences');
  return { ok: true };
}

/** Supprime une étape. (Le client se chargera de re-compacter les positions
 *  via reorderSteps s'il le souhaite.) */
export async function deleteStep(stepId: string): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from('sequence_steps')
    .delete()
    .eq('id', stepId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/sequences');
  return { ok: true };
}

/**
 * Réordonne les étapes : on reçoit la liste ordonnée d'ids et on réécrit la
 * colonne `position` (0-based) pour chacune. Séquentiel pour rester simple
 * (volumes faibles : quelques étapes par séquence).
 */
export async function reorderSteps(
  sequenceId: string,
  orderedStepIds: string[]
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  for (let i = 0; i < orderedStepIds.length; i++) {
    const { error } = await admin
      .from('sequence_steps')
      .update({ position: i })
      .eq('id', orderedStepIds[i])
      .eq('sequence_id', sequenceId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/sequences');
  return { ok: true };
}
