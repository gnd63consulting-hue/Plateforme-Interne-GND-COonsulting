'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Server actions du module /admin/pipelines (multi-pipeline Phase 1).
 *
 * CRUD des lignes de metier (boards) : create, rename, reorder, set default,
 * delete. Garde : ADMIN STRICT (role admin / admin_limited), comme
 * /admin/commissions et /admin/doublons (adminOnly). On NE reutilise PAS la
 * permission de section `pipeline` (qui est l'edition des PROSPECTS du board,
 * accordee aux assistants) : gerer les BOARDS eux-memes reste une prerogative
 * fondateur/co-admin.
 *
 * Toutes les ecritures passent par le client service-role apres la garde
 * applicative (memes garanties que la RLS pipelines_admin_write de 0024, qui
 * sert de defense en profondeur cote base).
 */

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type ActionResult = { error: string | null };

/** Garde commune : exige un user admin/admin_limited. Renvoie l'admin client. */
async function requireAdmin(): Promise<
  | { ok: true; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non authentifie' };

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // On verrouille sur le ROLE (admin strict), comme /admin/commissions et
  // /admin/doublons : gerer les BOARDS eux-memes reste une prerogative
  // fondateur/co-admin (distincte de la permission de section `pipeline` qui
  // n'autorise QUE l'edition des prospects d'un board, accordee aux assistants).
  if (!me || !ADMIN_ROLES.has(me.role)) {
    return { ok: false, error: 'Permissions insuffisantes' };
  }
  return { ok: true, admin: createAdminClient() };
}

function revalidate() {
  revalidatePath('/admin/pipelines');
  revalidatePath('/prospects');
}

/** Cree un pipeline (jamais is_default a la creation — usage dedie setDefault). */
export async function createPipeline(input: {
  name: string;
  color?: string | null;
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const name = input.name.trim();
  if (!name) return { error: 'Le nom est obligatoire.' };
  const color = input.color?.trim() || null;

  // Position = max(position) + 1 → ajout en fin de selecteur.
  const { data: last } = await gate.admin
    .from('pipelines')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((last?.position as number | undefined) ?? -1) + 1;

  const { error } = await gate.admin.from('pipelines').insert({
    name,
    color,
    position: nextPosition,
    is_default: false,
  });
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}

/** Renomme un pipeline (et met a jour sa couleur si fournie). */
export async function renamePipeline(input: {
  id: string;
  name: string;
  color?: string | null;
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const name = input.name.trim();
  if (!name) return { error: 'Le nom est obligatoire.' };

  const patch: Record<string, unknown> = { name };
  if (input.color !== undefined) patch.color = input.color?.trim() || null;

  const { error } = await gate.admin
    .from('pipelines')
    .update(patch)
    .eq('id', input.id);
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}

/**
 * Reordonne : echange la `position` de deux pipelines (move up/down). On lit
 * les deux lignes, on permute leurs positions. Simple et suffisant pour la
 * Phase 1 (peu de pipelines).
 */
export async function reorderPipeline(input: {
  id: string;
  direction: 'up' | 'down';
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const { data: all, error: readErr } = await gate.admin
    .from('pipelines')
    .select('id, position')
    .order('position', { ascending: true });
  if (readErr) return { error: readErr.message };

  const list = (all ?? []) as { id: string; position: number }[];
  const idx = list.findIndex((p) => p.id === input.id);
  if (idx === -1) return { error: 'Pipeline introuvable.' };

  const swapIdx = input.direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return { error: null }; // borne

  const a = list[idx];
  const b = list[swapIdx];

  // Permutation des positions. Deux UPDATE (pas de contrainte unique sur
  // position → pas de collision transitoire a gerer).
  const u1 = await gate.admin
    .from('pipelines')
    .update({ position: b.position })
    .eq('id', a.id);
  if (u1.error) return { error: u1.error.message };
  const u2 = await gate.admin
    .from('pipelines')
    .update({ position: a.position })
    .eq('id', b.id);
  if (u2.error) return { error: u2.error.message };

  revalidate();
  return { error: null };
}

/**
 * Definit le pipeline par defaut : on retire is_default de l'ancien defaut
 * AVANT de poser le nouveau (l'index unique partiel pipelines_one_default_idx
 * interdit deux defauts simultanes → on demote d'abord).
 */
export async function setDefaultPipeline(input: {
  id: string;
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  // 1. Demote tout defaut existant autre que la cible.
  const demote = await gate.admin
    .from('pipelines')
    .update({ is_default: false })
    .eq('is_default', true)
    .neq('id', input.id);
  if (demote.error) return { error: demote.error.message };

  // 2. Promote la cible.
  const promote = await gate.admin
    .from('pipelines')
    .update({ is_default: true })
    .eq('id', input.id);
  if (promote.error) return { error: promote.error.message };

  revalidate();
  return { error: null };
}

/**
 * Supprime un pipeline. OPTION SURE :
 *   - Interdit de supprimer le pipeline PAR DEFAUT (toujours).
 *   - Interdit de supprimer un pipeline encore REFERENCE par des prospects
 *     (message clair invitant a reassigner d'abord). On ne reassigne pas en
 *     masse automatiquement → on protege la donnee.
 */
export async function deletePipeline(input: {
  id: string;
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const { data: target, error: readErr } = await gate.admin
    .from('pipelines')
    .select('id, is_default')
    .eq('id', input.id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!target) return { error: 'Pipeline introuvable.' };
  if (target.is_default) {
    return { error: 'Impossible de supprimer le pipeline par defaut.' };
  }

  // Bloque si des prospects y sont encore rattaches.
  const { count, error: countErr } = await gate.admin
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('pipeline_id', input.id);
  if (countErr) return { error: countErr.message };
  if ((count ?? 0) > 0) {
    return {
      error: `Ce pipeline contient ${count} prospect${
        (count ?? 0) > 1 ? 's' : ''
      }. Reassignez-les a un autre pipeline avant suppression.`,
    };
  }

  const { error } = await gate.admin
    .from('pipelines')
    .delete()
    .eq('id', input.id);
  if (error) return { error: error.message };

  revalidate();
  return { error: null };
}
