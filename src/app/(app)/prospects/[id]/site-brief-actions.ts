'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import {
  SITE_BRIEF_SELECT_COLUMNS,
  ACTIVE_BRIEF_STATUSES,
  deriveBudgetTier,
  type SiteBriefRow,
} from '@/lib/site-brief';

/**
 * Demande une maquette pour un prospect : insere UNE ligne `site_brief` avec
 * status 'requested' (le watcher Studio Phase 4 cote VPS la consomme). RLS
 * admin (site_brief_admin_all, migration 0032) : seul un admin/admin_limited
 * authentifie peut ecrire. Aucune generation declenchee ici cote app : c'est le
 * watcher Studio qui produit la maquette puis passe le brief en 'done'.
 *
 * Anti-spam : si un brief existe deja pour ce prospect en 'requested' ou 'done',
 * on ne re-insere pas (on renvoie l'existant). Le bouton ne sature pas la file.
 *
 * Cloisonnement : ne lit AUCUNE donnee financiere. budget_tier est calibre sur
 * le signal ca_estime (capacite), jamais sur le deal signe.
 */
export async function requestMockup(prospectId: string) {
  const supabase = await createClient();

  // 1. Garde d'authentification (mirroir des actions existantes).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Non authentifie.' };

  // 2. Anti-doublon : un brief deja en file (requested) ou livre (done) suffit.
  const { data: existingRows, error: existingErr } = await supabase
    .from('site_brief')
    .select(SITE_BRIEF_SELECT_COLUMNS)
    .eq('prospect_id', prospectId)
    .in('status', ACTIVE_BRIEF_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1);
  if (existingErr) return { ok: false as const, error: existingErr.message };

  const existing = (existingRows?.[0] ?? null) as SiteBriefRow | null;
  if (existing) {
    return { ok: true as const, brief: existing, alreadyRequested: true };
  }

  // 3. Calibrage budget a partir du signal ca_estime du prospect (capacite).
  const { data: prospect } = await supabase
    .from('prospects')
    .select('ca_estime')
    .eq('id', prospectId)
    .maybeSingle();
  const budgetTier = deriveBudgetTier(
    (prospect as { ca_estime?: string | null } | null)?.ca_estime
  );

  // 4. INSERT du cahier des charges minimal a destination du watcher Studio.
  const { data: inserted, error: insertErr } = await supabase
    .from('site_brief')
    .insert({
      prospect_id: prospectId,
      budget_tier: budgetTier,
      status: 'requested',
      payload: { requested_by: user.id, source: 'crm_button' },
    })
    .select(SITE_BRIEF_SELECT_COLUMNS)
    .maybeSingle();
  if (insertErr) return { ok: false as const, error: insertErr.message };

  revalidatePath(`/prospects/${prospectId}`);
  return {
    ok: true as const,
    brief: (inserted as SiteBriefRow | null) ?? null,
    alreadyRequested: false,
  };
}
