'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

/**
 * Server actions des drafts (prospect_draft, ecrits par Nyx).
 *
 * La RLS prospect_draft_admin_all (0025) reste la garde de fond (seuls les
 * admins ecrivent). On ajoute ici une garde d'identite explicite (getUser) +
 * une validation d'entree (whitelist de statut, bornes de taille), par
 * coherence avec les autres server actions (cf. call-actions.ts). Aucun envoi
 * n'est declenche : 'ready' = valide par l'humain, l'envoi reel est ulterieur.
 */

const DRAFT_STATUSES = new Set(['draft', 'ready', 'discarded']);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Met a jour le statut d'un draft (draft -> ready / discarded / draft). */
export async function setDraftStatus(id: string, status: string) {
  if (typeof id !== 'string' || !id) return { ok: false, error: 'Draft invalide.' };
  if (!DRAFT_STATUSES.has(status)) {
    return { ok: false, error: `Statut invalide : ${status}.` };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non authentifie.' };

  const { error } = await supabase
    .from('prospect_draft')
    .update({ status })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/prospects/drafts');
  return { ok: true };
}

/** Enregistre l'objet + le corps edites d'un draft. */
export async function saveDraftContent(id: string, subject: string, body: string) {
  if (typeof id !== 'string' || !id) return { ok: false, error: 'Draft invalide.' };
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non authentifie.' };

  const cleanSubject = (subject ?? '').toString().slice(0, 300);
  const cleanBody = (body ?? '').toString().slice(0, 20000);

  const { error } = await supabase
    .from('prospect_draft')
    .update({ subject: cleanSubject, body: cleanBody })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/prospects/drafts');
  return { ok: true };
}
