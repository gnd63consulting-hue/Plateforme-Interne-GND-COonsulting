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
 * Assigne `count` prospects FRAIS (status='a_contacter') ASSIGNABLES vers le
 * commercial `userId`.
 *
 * Definition de la source ASSIGNABLE (corrige le bug "0 assigne") :
 *   Le sync Notion (api/admin/sync-prospects) pose `assigned_to = <commercial
 *   mappe>` des l'INSERT. Donc les prospects frais ne sont PAS forcement dans
 *   le pool admin/non-assigne — l'ancien filtre (`assigned_to` null OU admin)
 *   les ratait → "0 assigne" alors que des prospects frais existent.
 *
 *   Nouvelle regle : un prospect `a_contacter` est assignable s'il n'est PAS
 *   actuellement detenu par un commercial ACTIF. Concretement :
 *     - non assigne (assigned_to NULL)                                    → OUI
 *     - detenu par un admin / admin_limited (pool admin)                  → OUI
 *     - detenu par un user inactif / archive (active=false)              → OUI
 *     - detenu par un user inconnu (id orphelin)                          → OUI
 *     - detenu par un commercial ACTIF                                    → NON
 *
 * On ne touche jamais un prospect detenu par un commercial actif. On expose
 * `candidatePool` (taille reelle du vivier assignable) pour que l'UI explique
 * pourquoi 0 ont ete assignes le cas echeant. Scoring hot-first conserve.
 */
export async function assignFreshProspects(
  userId: string,
  count: number
): Promise<{ error: string | null; assigned: number; candidatePool: number }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes', assigned: 0, candidatePool: 0 };
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
      candidatePool: 0,
    };
  }

  // Tous les users avec role + statut actif. On en derive l'ensemble des
  // PROPRIETAIRES ACTIFS NON-ADMIN : ce sont les seuls dont les prospects sont
  // "verrouilles" (ne reviennent pas au pool). Tout le reste (non assigne,
  // admin, inactif, inconnu) est assignable.
  const { data: allUsers, error: usersErr } = await adminClient
    .from('users')
    .select('id, role, active');
  if (usersErr) {
    return { error: `Lecture des users echouee : ${usersErr.message}`, assigned: 0, candidatePool: 0 };
  }

  const adminIds = new Set(
    (allUsers ?? [])
      .filter((u) => MGMT_ADMIN_ROLES.includes(u.role as string))
      .map((u) => u.id as string)
  );
  if (adminIds.size === 0) {
    return { error: 'Aucun compte admin trouve (pool source vide).', assigned: 0, candidatePool: 0 };
  }

  // Proprietaires ACTIFS NON-ADMIN : prospects a EXCLURE du vivier.
  const activeCommercialOwners = new Set(
    (allUsers ?? [])
      .filter(
        (u) =>
          !MGMT_ADMIN_ROLES.includes(u.role as string) &&
          (u as { active?: boolean | null }).active !== false
      )
      .map((u) => u.id as string)
  );

  // On lit le pool FRAIS (status a_contacter) puis on filtre cote JS. Plus
  // robuste que `.in('assigned_to', ...)`. On prend ensuite les MEILLEURS
  // (chauds + contactables prioritaires, plus anciens en tie-break).
  const { data: poolRaw, error: poolErr } = await adminClient
    .from('prospects')
    .select('id, classification, phone, email, created_at, assigned_to')
    .eq('status', 'a_contacter')
    .limit(5000);
  if (poolErr) return { error: `Lecture du pool echouee : ${poolErr.message}`, assigned: 0, candidatePool: 0 };

  // Assignable ssi : non assigne, OU pas detenu par un commercial actif
  // (admin / inactif / inconnu inclus). On exclut aussi explicitement le
  // membre cible lui-meme (ne pas se "reassigner" ses propres prospects).
  const candidates = (poolRaw ?? []).filter((p) => {
    const owner = p.assigned_to as string | null;
    if (!owner) return true;
    if (owner === userId) return false;
    return !activeCommercialOwners.has(owner);
  }) as {
    id: string;
    classification: string | null;
    phone: string | null;
    email: string | null;
    created_at: string;
  }[];

  const candidatePool = candidates.length;
  if (candidatePool === 0) {
    return {
      error:
        "Aucun prospect 'a_contacter' assignable : tous les prospects frais sont deja detenus par des commerciaux actifs. Synchronise Notion ou archive un membre pour liberer son pool.",
      assigned: 0,
      candidatePool: 0,
    };
  }

  const scored = candidates.map((p) => {
    const hot = !!p.classification && /chaud|hot|prioritaire|\u{1F525}/iu.test(p.classification);
    const contactable = !!(p.phone || p.email);
    return { id: p.id, score: (hot ? 2 : 0) + (contactable ? 1 : 0), created_at: p.created_at };
  });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const ids = scored.slice(0, n).map((p) => p.id);

  const { error: updErr, count: updatedCount } = await adminClient
    .from('prospects')
    .update({ assigned_to: userId, updated_at: new Date().toISOString() }, { count: 'exact' })
    .in('id', ids);
  if (updErr) return { error: `Mise a jour echouee : ${updErr.message}`, assigned: 0, candidatePool };

  revalidatePath('/admin/invitations');
  revalidatePath('/admin');
  return { error: null, assigned: updatedCount ?? ids.length, candidatePool };
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
