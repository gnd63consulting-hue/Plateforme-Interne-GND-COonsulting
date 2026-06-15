'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Server actions de la déduplication des prospects (CRM Sprint 3).
 *
 * Toutes admin-guarded (requireAdmin) et exécutées via le client service-role
 * (bypass RLS) — ce fichier est 'use server', le service-role ne fuit jamais
 * côté client.
 *
 * ⚠️ Aucune suppression : une fusion archive les doublons (status='archived')
 *    et pose merged_into vers la fiche maître. Les fiches archivées restent
 *    en base (et sont ignorées par le sync Notion — pas de hard-delete).
 */

const MGMT_ADMIN_ROLES = ['admin', 'admin_limited'];

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
    .single();
  if (!profile || !MGMT_ADMIN_ROLES.includes(profile.role)) return null;
  return user;
}

/**
 * Fusionne `duplicateIds` dans la fiche maître `masterId`.
 *
 * Étapes (aucune destruction) :
 *   1. valide master + duplicates (existent, distincts, master ∉ duplicates) ;
 *   2. re-rattache les activités des doublons au master ;
 *   3. concatène les notes des doublons dans celles du master ;
 *   4. reporte la relance la plus proche si le master n'en a pas ;
 *   5. archive les doublons (status='archived', merged_into=master).
 *
 * Bornes : max 50 doublons par appel.
 */
export async function mergeProspects(
  masterId: string,
  duplicateIds: string[]
): Promise<{ error: string | null; merged: number }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes', merged: 0 };

  // --- Garde-fous d'entrée ---
  if (typeof masterId !== 'string' || !masterId) {
    return { error: 'Fiche maître invalide.', merged: 0 };
  }
  const dupes = Array.from(
    new Set((duplicateIds ?? []).filter((id) => typeof id === 'string' && id))
  ).filter((id) => id !== masterId);

  if (dupes.length === 0) {
    return { error: 'Aucune fiche doublon à fusionner.', merged: 0 };
  }
  if (dupes.length > 50) {
    return { error: 'Trop de doublons en un seul appel (max 50).', merged: 0 };
  }

  const adminClient = createAdminClient();

  // --- 1. Validation existence ---
  const { data: master, error: masterErr } = await adminClient
    .from('prospects')
    .select('id, notes, next_action_at')
    .eq('id', masterId)
    .maybeSingle();
  if (masterErr) return { error: masterErr.message, merged: 0 };
  if (!master) return { error: "La fiche maître n'existe pas.", merged: 0 };

  const { data: dupRows, error: dupErr } = await adminClient
    .from('prospects')
    .select('id, company_name, notes, next_action_at')
    .in('id', dupes);
  if (dupErr) return { error: dupErr.message, merged: 0 };
  const found = dupRows ?? [];
  if (found.length === 0) {
    return { error: 'Aucune fiche doublon trouvée.', merged: 0 };
  }
  const foundIds = found.map((d) => d.id);

  // --- 2. Re-rattachement des activités ---
  const { error: actErr } = await adminClient
    .from('activities')
    .update({ prospect_id: masterId })
    .in('prospect_id', foundIds);
  if (actErr) return { error: `Activités : ${actErr.message}`, merged: 0 };

  // --- 3. Concaténation des notes ---
  const mergedNoteBlocks: string[] = [];
  if (master.notes && master.notes.trim()) mergedNoteBlocks.push(master.notes.trim());
  for (const d of found) {
    if (d.notes && d.notes.trim()) {
      mergedNoteBlocks.push(
        `--- Fusionné depuis ${d.company_name ?? 'fiche doublon'} ---\n${d.notes.trim()}`
      );
    }
  }
  const nextNotes = mergedNoteBlocks.length > 0 ? mergedNoteBlocks.join('\n\n') : null;

  // --- 4. Report de la relance la plus proche si le master n'en a pas ---
  let nextActionAt: string | null = master.next_action_at ?? null;
  if (!nextActionAt) {
    const candidates = found
      .map((d) => d.next_action_at)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    if (candidates.length > 0) nextActionAt = candidates[0];
  }

  // --- 5a. Mise à jour de la fiche maître (notes + relance) ---
  const masterPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (nextNotes !== (master.notes ?? null)) masterPatch.notes = nextNotes;
  if (nextActionAt !== (master.next_action_at ?? null)) masterPatch.next_action_at = nextActionAt;
  const { error: upMasterErr } = await adminClient
    .from('prospects')
    .update(masterPatch)
    .eq('id', masterId);
  if (upMasterErr) return { error: `Maître : ${upMasterErr.message}`, merged: 0 };

  // --- 5b. Archivage des doublons (jamais de delete) ---
  const { error: archErr } = await adminClient
    .from('prospects')
    .update({
      status: 'archived',
      merged_into: masterId,
      updated_at: new Date().toISOString(),
    })
    .in('id', foundIds);
  if (archErr) return { error: `Archivage : ${archErr.message}`, merged: 0 };

  revalidatePath('/admin/doublons');
  return { error: null, merged: foundIds.length };
}

/**
 * Marque un groupe comme « pas un doublon » : insère sa signature dans
 * dedup_dismissed. Le groupe n'apparaîtra plus dans la liste à traiter.
 */
export async function dismissGroup(
  signature: string
): Promise<{ error: string | null }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Permissions insuffisantes' };
  if (typeof signature !== 'string' || !signature.trim()) {
    return { error: 'Signature invalide.' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('dedup_dismissed')
    .upsert(
      { signature: signature.trim(), dismissed_by: admin.id },
      { onConflict: 'signature', ignoreDuplicates: true }
    );
  if (error) return { error: error.message };

  revalidatePath('/admin/doublons');
  return { error: null };
}
