'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function createInvitation(
  email: string,
  role: 'freelance' | 'admin' | 'admin_limited'
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'admin_limited'].includes(profile.role)) {
    return { error: 'Permissions insuffisantes' };
  }

  // Insert invitation (whitelist côté DB) — service role pour bypass RLS si nécessaire
  const admin = createAdminClient();
  const { error: insertError } = await admin.from('invitations').insert({
    email: email.toLowerCase().trim(),
    role,
    invited_by: user.id,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: 'Cet email a déjà une invitation en attente.' };
    }
    return { error: `Erreur DB: ${insertError.message}` };
  }

  // Envoie le mail magique via Supabase Auth Admin API
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });

  if (mailError) {
    return { error: `Erreur envoi mail: ${mailError.message}` };
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
  if (!user) return { error: 'Non authentifié' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ totp_enabled: true })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { error: null };
}
