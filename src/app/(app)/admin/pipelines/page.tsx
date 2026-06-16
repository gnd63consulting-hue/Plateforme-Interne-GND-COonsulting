import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  PIPELINE_SELECT_COLUMNS,
  sortPipelines,
  type Pipeline,
} from '@/lib/pipelines';
import PipelinesClient from './PipelinesClient';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

/**
 * /admin/pipelines — gestion des lignes de metier (boards) multi-pipeline.
 *
 * Admin-only (gate par role, comme /admin/commissions). Charge les pipelines
 * ordonnes + le nombre de prospects rattaches a chacun (pour afficher le
 * compteur et bloquer la suppression cote UI). Le comptage passe par le client
 * service-role : aucune donnee financiere n'y transite, seulement pipeline_id.
 */
export default async function AdminPipelinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const admin = createAdminClient();

  const { data: pipelinesRaw } = await admin
    .from('pipelines')
    .select(PIPELINE_SELECT_COLUMNS)
    .order('position', { ascending: true });

  const pipelines = sortPipelines((pipelinesRaw ?? []) as unknown as Pipeline[]);

  // Compteur de prospects par pipeline_id (une seule lecture, agregation en JS).
  const { data: rows } = await admin.from('prospects').select('pipeline_id');
  const counts: Record<string, number> = {};
  for (const r of (rows ?? []) as { pipeline_id: string | null }[]) {
    if (!r.pipeline_id) continue;
    counts[r.pipeline_id] = (counts[r.pipeline_id] ?? 0) + 1;
  }

  return <PipelinesClient initialPipelines={pipelines} counts={counts} />;
}
