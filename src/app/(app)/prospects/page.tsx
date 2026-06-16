import { createClient } from '@/lib/supabase-server';
import ProspectsClient from './ProspectsClient';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';
import {
  PIPELINE_SELECT_COLUMNS,
  sortPipelines,
  defaultPipelineId,
  type Pipeline,
} from '@/lib/pipelines';

export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Show prospects assigned to OR created by current user
  const { data: prospects } = await supabase
    .from('prospects')
    .select(PROSPECT_SELECT_COLUMNS)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const initialProspects = (prospects ?? []) as unknown as Prospect[];

  // Multi-pipeline (Phase 1) : charge les lignes de métier (boards). RLS
  // pipelines : SELECT autorisé à tout authentifié. Liste vide tolérée (avant
  // exécution de la migration 0024) → le sélecteur ne s'affiche tout
  // simplement pas et le comportement reste identique à aujourd'hui.
  const { data: pipelinesRaw } = await supabase
    .from('pipelines')
    .select(PIPELINE_SELECT_COLUMNS)
    .order('position', { ascending: true });

  const pipelines = sortPipelines(
    (pipelinesRaw ?? []) as unknown as Pipeline[]
  );
  const defaultPid = defaultPipelineId(pipelines);

  // Best name for header (full_name first, then email local-part).
  // NB: la colonne est `full_name` (cf. users) — `display_name` n'existe pas.
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const firstName =
    (profile?.full_name as string | undefined)?.split(' ')[0] ??
    (profile?.email as string | undefined)?.split('@')[0] ??
    'Toi';

  return (
    <ProspectsClient
      initialProspects={initialProspects}
      currentUserId={user.id}
      firstName={firstName}
      pipelines={pipelines}
      defaultPipelineId={defaultPid}
    />
  );
}
