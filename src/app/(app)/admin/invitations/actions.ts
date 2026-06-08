'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Cree une invitation = ajoute l'email a la whitelist `invitations`.
 *
 * IMPORTANT : la plateforme se connecte UNIQUEMENT via Google OAuth. Le
 * trigger Postgres `handle_new_user` provisionne automatiquement le compte
 * (table `users`) au premier login Google, a condition que l'email soit
 * present dans `invitations`. On n'envoie donc AUCUN email ici : l'admin
 * transmet lui-meme la consigne de connexion (cf. InviteForm).
 *
 * Historique : on envoyait avant un magic-link via inviteUserByEmail(), ce
 * qui entrait en conflit avec le login Google (email confus, identites
 * dupliquees, invites bloques). Retire le 2026-06-08.
 */
export async function createInvitation(
  email: string,
  role: 'freelance' | 'admin' | 'admin_limited' | 'stagiaire'
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifie' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'admin_limited'].includes(profile.role)) {
    return { error: 'Permissions insuffisantes' };
  }

  // Insert invitation (whitelist cote DB) — service role pour bypass RLS si necessaire
  const admin = createAdminClient();
  const { error: insertError } = await admin.from('invitations').insert({
    email: email.toLowerCase().trim(),
    role,
    invited_by: user.id,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: 'Cet email a deja une invitation en attente.' };
    }
    return { error: `Erreur DB: ${insertError.message}` };
  }

  revalidatePath('/admin/invitations');
  return { error: null };
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const id = formData.get('id');
  if (typeof id !== 'string') return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'admin_limited'].includes(profile.role)) {
    return;
  }

  const admin = createAdminClient();
  await admin.from('invitations').update({ consumed_at: new Date().toISOString() }).eq('id', id);

  revalidatePath('/admin/invitations');
}

export async function markTotpEnabled(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifie' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ totp_enabled: true })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { error: null };
}
