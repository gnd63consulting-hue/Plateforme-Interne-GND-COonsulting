'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Server actions financières attachées à la fiche prospect (Sprint 8).
 *
 * recordCommission() est appelée quand un prospect passe en status='gagne'
 * et que le commercial confirme le montant HT signé dans la modale.
 *
 * Service-role (bypass RLS) car :
 *   - on lit le commission_rate du PROPRIO du prospect (pas forcément le
 *     user courant — l'admin peut clôturer la fiche d'un commercial) ;
 *   - on écrit dans `commissions` dont l'INSERT est admin-only côté RLS.
 *
 * Le user courant DOIT néanmoins être autorisé sur la fiche : on vérifie
 * qu'il en est proprio (created_by/assigned_to) OU admin, via le client
 * SSR (RLS owner). Sinon on refuse — on ne crée pas de commission à
 * l'aveugle en service-role.
 */
export async function recordCommission(
  prospectId: string,
  amountHt: number
): Promise<{ error: string | null }> {
  if (!prospectId) return { error: 'Prospect introuvable.' };
  if (!Number.isFinite(amountHt) || amountHt < 0) {
    return { error: 'Montant invalide.' };
  }
  const amount = Math.round(amountHt * 100) / 100;

  // 1. Auth + autorisation sur la fiche (RLS owner via client SSR).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifié' };

  const { data: prospect } = await supabase
    .from('prospects')
    .select('id, created_by, assigned_to')
    .eq('id', prospectId)
    .maybeSingle();

  // maybeSingle() renvoie null si la RLS owner masque la fiche → non autorisé.
  if (!prospect) {
    return { error: 'Fiche introuvable ou non autorisée.' };
  }

  const admin = createAdminClient();

  // 2. Persist deal_amount sur le prospect (montant HT signé).
  const { error: dealErr } = await admin
    .from('prospects')
    .update({ deal_amount: amount, updated_at: new Date().toISOString() })
    .eq('id', prospectId);
  if (dealErr) return { error: `Montant non enregistré : ${dealErr.message}` };

  // 3. Détermine le commercial propriétaire (assigned_to en priorité).
  const commercialId = prospect.assigned_to ?? prospect.created_by;

  // 4. Lit le taux de commission figé au moment du gain.
  const { data: commercial } = await admin
    .from('users')
    .select('commission_rate')
    .eq('id', commercialId)
    .maybeSingle();
  const rate =
    commercial?.commission_rate != null
      ? Number(commercial.commission_rate)
      : 0;

  // 5. Anti-doublon : si une commission NON annulée existe déjà pour ce
  //    prospect, on la met à jour (montant resigné) plutôt que d'en créer
  //    une seconde. Sinon on insère.
  const { data: existing } = await admin
    .from('commissions')
    .select('id')
    .eq('prospect_id', prospectId)
    .neq('statut', 'annule')
    .maybeSingle();

  if (existing) {
    const { error: updErr } = await admin
      .from('commissions')
      .update({ base_amount: amount, rate, commercial_id: commercialId })
      .eq('id', existing.id);
    if (updErr) return { error: `Commission non mise à jour : ${updErr.message}` };
  } else {
    const { error: insErr } = await admin.from('commissions').insert({
      prospect_id: prospectId,
      commercial_id: commercialId,
      base_amount: amount,
      rate,
      statut: 'a_payer',
    });
    if (insErr) return { error: `Commission non créée : ${insErr.message}` };
  }

  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath('/mon-tableau');
  revalidatePath('/admin/commissions');
  return { error: null };
}
