'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

const ADMIN_ROLES = ['admin', 'admin_limited'];

/** Garde admin : renvoie le user si admin/admin_limited, sinon null. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) return null;
  return user;
}

/** Marque une commission comme payée (statut='paye', paid_at=now). Admin only. */
export async function markCommissionPaid(
  commissionId: string
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes' };
  if (!commissionId) return { error: 'Commission introuvable.' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('commissions')
    .update({ statut: 'paye', paid_at: new Date().toISOString() })
    .eq('id', commissionId);
  if (error) return { error: error.message };

  revalidatePath('/admin/commissions');
  revalidatePath('/mon-tableau');
  return { error: null };
}

/** Repasse une commission "payé" en "à payer" (corrige une erreur). Admin only. */
export async function markCommissionUnpaid(
  commissionId: string
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes' };
  if (!commissionId) return { error: 'Commission introuvable.' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('commissions')
    .update({ statut: 'a_payer', paid_at: null })
    .eq('id', commissionId);
  if (error) return { error: error.message };

  revalidatePath('/admin/commissions');
  revalidatePath('/mon-tableau');
  return { error: null };
}
