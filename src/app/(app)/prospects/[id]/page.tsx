import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  PROSPECT_SELECT_COLUMNS,
  type Prospect,
} from '@/lib/prospects';
import {
  ACTIVITY_SELECT_COLUMNS,
  type Activity,
} from '@/lib/activities';
import ProspectDetailClient from './ProspectDetailClient';

export const dynamic = 'force-dynamic';

/**
 * Fiche Prospect 360° — route serveur (Sprint 4).
 *
 * Charge UN prospect par id via le client serveur (session user). La RLS
 * owner-based filtre automatiquement : un commercial ne récupère que SES
 * prospects (created_by/assigned_to), l'admin voit tout. Si la fiche est
 * introuvable OU non autorisée, la requête renvoie 0 ligne → notFound().
 *
 * Charge aussi en SSR les activités récentes du prospect pour un premier
 * rendu immédiat de la timeline (la suite est gérée côté client).
 *
 * Next 15 : `params` est une Promise à await.
 */
export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // RLS owner-based : .maybeSingle() renvoie null si la fiche n'existe pas
  // OU si elle n'appartient pas au commercial courant (non autorisé).
  const { data: prospectRow } = await supabase
    .from('prospects')
    .select(PROSPECT_SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!prospectRow) notFound();

  const prospect = prospectRow as unknown as Prospect;

  // Timeline initiale (récente) en SSR — la RLS filtre aussi les activités.
  const { data: activityRows } = await supabase
    .from('activities')
    .select(ACTIVITY_SELECT_COLUMNS)
    .eq('prospect_id', id)
    .order('occurred_at', { ascending: false })
    .limit(30);

  const initialActivities = (activityRows ?? []) as unknown as Activity[];

  return (
    <ProspectDetailClient
      initialProspect={prospect}
      initialActivities={initialActivities}
    />
  );
}
