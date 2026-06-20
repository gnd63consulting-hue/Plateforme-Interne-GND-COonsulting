'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { STATUS_OPTIONS } from '@/lib/prospects';

/**
 * Loguer un appel depuis la liste d'appel (Hermes / phone-first).
 *
 * En un clic, un commercial met a jour le statut + la date de rappel d'un
 * prospect ET enregistre une activite 'call' dans la timeline (activities,
 * migration 0012). La plateforme devient ainsi la source de verite en temps
 * reel : plus besoin de fouiller Notion a la main.
 *
 * Tourne via le client serveur normal (session de l'utilisateur connecte) :
 * la RLS owner-based de prospects et d'activities s'applique telle quelle
 * (un commercial n'ecrit que SES prospects / SES activites). Aucun client
 * service-role, aucune modif RLS, aucun montant financier touche ici.
 */

/** Set des statuts autorises (memes valeurs que les dropdowns commerciaux). */
const ALLOWED_STATUSES = new Set<string>(STATUS_OPTIONS.map((o) => o.value));

export type LogCallInput = {
  prospectId: string;
  status: string;
  note?: string | null;
  /** Date de rappel souhaitee (ISO ou YYYY-MM-DD). Vide => inchangee. */
  nextActionAt?: string | null;
};

export type LogCallResult = { ok: true } | { ok: false; error: string };

/** Normalise une date de rappel vers un ISO timestamptz (ou null). */
function normalizeNextAction(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Un input type="date" renvoie 'YYYY-MM-DD' : on cale a midi local pour
  // eviter les decalages de fuseau (la veille a minuit UTC).
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T12:00:00`).toISOString()
    : new Date(trimmed).toISOString();
  return iso;
}

export async function logCall(input: LogCallInput): Promise<LogCallResult> {
  const supabase = await createClient();

  // Auth guard (meme garde que draft-actions / le reste des actions serveur).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non authentifie.' };

  const { prospectId, status } = input;
  if (!prospectId) return { ok: false, error: 'Prospect manquant.' };
  if (!ALLOWED_STATUSES.has(status)) {
    return { ok: false, error: `Statut invalide : ${status}.` };
  }

  let nextActionAt: string | null;
  try {
    nextActionAt = normalizeNextAction(input.nextActionAt);
  } catch {
    return { ok: false, error: 'Date de rappel invalide.' };
  }

  const note = (input.note ?? '').trim() || null;

  // 1. Mise a jour du prospect (statut + rappel eventuel + updated_at).
  //    RLS owner-based : echoue proprement si le prospect n'est pas a l'user.
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (nextActionAt) patch.next_action_at = nextActionAt;

  const { data: updated, error: updateError } = await supabase
    .from('prospects')
    .update(patch)
    .eq('id', prospectId)
    .select('id')
    .maybeSingle();

  if (updateError) return { ok: false, error: updateError.message };
  if (!updated) {
    return { ok: false, error: 'Prospect introuvable ou non autorise.' };
  }

  // 2. Trace de l'appel dans la timeline (activities, kind='call').
  //    owner_id / occurred_at sont des defaults Postgres (auth.uid() / now()).
  const { error: activityError } = await supabase.from('activities').insert({
    prospect_id: prospectId,
    kind: 'call',
    body: note,
    metadata: { status, by: user.id },
  });
  if (activityError) {
    // Le prospect est deja a jour ; on signale l'echec de trace sans rollback.
    return { ok: false, error: `Trace non enregistree : ${activityError.message}` };
  }

  revalidatePath('/prospects/intel');
  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true };
}
