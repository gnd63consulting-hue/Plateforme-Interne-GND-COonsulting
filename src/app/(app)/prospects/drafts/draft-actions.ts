'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

/**
 * Met a jour le statut d'un draft (draft -> ready / discarded / draft).
 * RLS admin (prospect_draft_admin_all, 0025). Aucun envoi declenche ici :
 * 'ready' = valide par l'humain, l'envoi reel est une etape ulterieure.
 */
export async function setDraftStatus(id: string, status: string) {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { error } = await supabase
    .from('prospect_draft')
    .update({ subject, body })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/prospects/drafts');
  return { ok: true };
}
