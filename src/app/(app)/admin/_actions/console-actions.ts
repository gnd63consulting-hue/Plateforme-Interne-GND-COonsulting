'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { effectivePerms, allows } from '@/lib/permissions';

/**
 * Actions "console" partagees admins + assistant (RBAC section pipeline edit).
 *
 * consoleUpdateProspect : met a jour le statut et/ou la date de relance d'un
 * prospect de l'equipe, et loggue une activite. Garde : permission de section
 * `pipeline` = edit. Service-role (l'assistant n'a pas la RLS owner ; la garde
 * applicative fait foi). Aucune donnee financiere touchee.
 */
export async function consoleUpdateProspect(input: {
  prospectId: string;
  status?: string;
  nextActionAt?: string | null;
  note?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifie' };

  const { data: me } = await supabase
    .from('users')
    .select('role, permissions')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !allows(effectivePerms(me.role, me.permissions), 'pipeline', 'edit')) {
    return { error: 'Permissions insuffisantes' };
  }

  const admin = createAdminClient();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof input.status === 'string' && input.status) patch.status = input.status;
  if (input.nextActionAt !== undefined) patch.next_action_at = input.nextActionAt;

  if (Object.keys(patch).length > 1) {
    const { error } = await admin
      .from('prospects')
      .update(patch)
      .eq('id', input.prospectId);
    if (error) return { error: error.message };
  }

  const note = input.note?.trim();
  if (note) {
    await admin.from('activities').insert({
      prospect_id: input.prospectId,
      kind: 'note',
      body: note,
      owner_id: user.id,
    });
  }

  revalidatePath('/admin/relances');
  revalidatePath('/admin/suivi-equipe');
  return { error: null };
}
