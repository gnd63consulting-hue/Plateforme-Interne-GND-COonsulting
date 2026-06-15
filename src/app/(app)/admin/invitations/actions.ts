'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import type { PermMap } from '@/lib/permissions';

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
  role: 'freelance' | 'assistant' | 'admin' | 'admin_limited' | 'stagiaire'
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

const MGMT_ADMIN_ROLES = ['admin', 'admin_limited'];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !MGMT_ADMIN_ROLES.includes(profile.role)) return null;
  return user;
}

/** Definit le taux de commission d'un membre (0 a 1, ex. 0.20). */
export async function setCommissionRate(
  userId: string,
  rate: number
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes' };
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    return { error: 'Taux invalide (entre 0 et 1, ex. 0.20).' };
  }
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('users')
    .update({ commission_rate: rate, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { error: error.message };
  revalidatePath('/admin/invitations');
  return { error: null };
}

/**
 * Assigne `count` prospects FRAIS (status='a_contacter') du pool admin
 * vers le commercial `userId`. Ne touche jamais a un prospect deja assigne
 * a un autre commercial. Retourne le nombre reellement assigne.
 */
export async function assignFreshProspects(
  userId: string,
  count: number
): Promise<{ error: string | null; assigned: number }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes', assigned: 0 };
  const n = Math.max(1, Math.min(500, Math.floor(count)));

  const adminClient = createAdminClient();

  const { data: target } = await adminClient
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (!target) {
    return {
      error: "Ce membre n'existe pas encore (il doit s'etre connecte au moins une fois).",
      assigned: 0,
    };
  }

  const { data: adminUsers } = await adminClient
    .from('users')
    .select('id')
    .in('role', MGMT_ADMIN_ROLES);
  const adminIds = (adminUsers ?? []).map((u) => u.id);
  if (adminIds.length === 0) {
    return { error: 'Aucun pool admin trouve.', assigned: 0 };
  }

  const { data: pool, error: poolErr } = await adminClient
    .from('prospects')
    .select('id')
    .eq('status', 'a_contacter')
    .in('assigned_to', adminIds)
    .order('created_at', { ascending: true })
    .limit(n);
  if (poolErr) return { error: poolErr.message, assigned: 0 };

  const ids = (pool ?? []).map((p) => p.id);
  if (ids.length === 0) {
    return { error: 'Aucun prospect frais disponible dans le pool.', assigned: 0 };
  }

  const { error: updErr } = await adminClient
    .from('prospects')
    .update({ assigned_to: userId, updated_at: new Date().toISOString() })
    .in('id', ids);
  if (updErr) return { error: updErr.message, assigned: 0 };

  revalidatePath('/admin/invitations');
  return { error: null, assigned: ids.length };
}


/**
 * Archive un membre (ex-commercial) : le marque inactif (active=false) -> il
 * disparait partout (Suivi equipe, digest, listes, cockpit) sans rien supprimer
 * (commissions/audit preserves). Reassigne ses prospects + ses taches ouvertes a
 * l'admin qui declenche. Reversible via reactivateMemberAction.
 */
export async function archiveMember(
  userId: string
): Promise<{ error: string | null; reassigned: number }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes', reassigned: 0 };
  if (userId === admin.id) {
    return { error: "Tu ne peux pas t'archiver toi-meme.", reassigned: 0 };
  }
  const adminClient = createAdminClient();

  // Reassigne ses prospects a l'admin.
  const { data: owned } = await adminClient
    .from('prospects')
    .select('id')
    .eq('assigned_to', userId);
  const ids = (owned ?? []).map((p) => p.id);
  if (ids.length > 0) {
    const { error: rErr } = await adminClient
      .from('prospects')
      .update({ assigned_to: admin.id, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (rErr) return { error: `Reassignation echouee : ${rErr.message}`, reassigned: 0 };
  }

  // Reassigne ses taches ouvertes a l'admin (sinon elles restent orphelines).
  await adminClient
    .from('tasks')
    .update({ owner_id: admin.id })
    .eq('owner_id', userId)
    .eq('done', false);

  const { error } = await adminClient
    .from('users')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { error: error.message, reassigned: ids.length };

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/suivi-equipe');
  revalidatePath('/admin');
  return { error: null, reassigned: ids.length };
}

/** Reactive un membre archive (active=true). Form action. */
export async function reactivateMemberAction(formData: FormData): Promise<void> {
  const id = formData.get('id');
  if (typeof id !== 'string') return;
  const admin = await requireAdmin();
  if (!admin) return;
  const adminClient = createAdminClient();
  await adminClient
    .from('users')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/admin/invitations');
}


/** Roles assignables a un membre depuis la console (= valeurs du CHECK 0018). */
const ASSIGNABLE_ROLES = new Set([
  'commercial',
  'freelance',
  'assistant',
  'admin_limited',
  'admin',
  'stagiaire',
]);

/**
 * Change le role (= niveau d'autorisations) d'un membre depuis la console.
 * Garde requireAdmin (admin / admin_limited). Interdit de changer son PROPRE role
 * (anti-lockout) ; seul un 'admin' (fondateur) peut promouvoir quelqu'un 'admin'.
 */
export async function setMemberRole(
  userId: string,
  role: string
): Promise<{ error: string | null }> {
  const actor = await requireAdmin();
  if (!actor) return { error: 'Permissions insuffisantes' };
  if (!ASSIGNABLE_ROLES.has(role)) return { error: 'Role invalide.' };
  if (userId === actor.id) {
    return { error: "Tu ne peux pas changer ton propre role (demande a un autre admin)." };
  }

  const adminClient = createAdminClient();

  // Seul un fondateur ('admin') peut accorder le role 'admin'.
  if (role === 'admin') {
    const { data: me } = await adminClient
      .from('users')
      .select('role')
      .eq('id', actor.id)
      .maybeSingle();
    if (me?.role !== 'admin') {
      return { error: "Seul un fondateur peut promouvoir quelqu'un Administrateur." };
    }
  }

  const { error } = await adminClient
    .from('users')
    .update({ role, permissions: null, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { error: error.message };

  revalidatePath('/admin/invitations');
  revalidatePath('/admin');
  return { error: null };
}

/**
 * Definit les permissions GRANULAIRES (override par section) d'un membre.
 * Garde requireAdmin + anti-self. perms = { section: 'none'|'view'|'edit' }.
 */
export async function setMemberPermissions(
  userId: string,
  perms: PermMap
): Promise<{ error: string | null }> {
  const actor = await requireAdmin();
  if (!actor) return { error: 'Permissions insuffisantes' };
  if (userId === actor.id) {
    return { error: 'Tu ne peux pas changer tes propres autorisations (demande a un autre admin).' };
  }
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('users')
    .update({ permissions: perms, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { error: error.message };
  revalidatePath('/admin/invitations');
  revalidatePath('/admin');
  return { error: null };
}
