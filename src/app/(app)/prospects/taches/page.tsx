import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { TASK_SELECT_COLUMNS, type Task } from '@/lib/tasks';
import TachesClient, { type RelanceLite, type ProspectOption } from './TachesClient';

export const dynamic = 'force-dynamic';

/**
 * « Mes tâches & to-do du jour » — vue commerciale owner-scopée.
 *
 * SSR : on charge en parallèle
 *   1. les tâches de l'user (RLS owner : owner_id = auth.uid()),
 *   2. les prospects de l'user porteurs d'une relance (next_action_at non null),
 *      qui alimentent à la fois le bloc « À faire aujourd'hui » (relances dues)
 *      et le select de rattachement « Mes tâches ».
 *
 * Toute l'interactivité (create / check / edit / delete) vit dans le client
 * component, via le client anon Supabase (RLS owner suffit, pas de service-role).
 */
export default async function TachesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Statuts « clos » : un prospect dans l'un d'eux n'a plus à générer de relance
  // active dans le to-do (cohérent avec le pilotage commercial).
  const CLOSED_STATUSES = [
    'gagne',
    'perdu',
    'archived',
    'pas_interesse',
    'coordonnees_invalides',
    'ne_plus_demarcher',
    'processus_termine',
  ];

  const [tasksRes, prospectsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select(TASK_SELECT_COLUMNS)
      .eq('owner_id', user.id)
      .order('due_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('prospects')
      .select('id, company_name, contact_name, status, next_action_at')
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .order('company_name', { ascending: true }),
  ]);

  const initialTasks = (tasksRes.data ?? []) as unknown as Task[];

  type ProspectRow = {
    id: string;
    company_name: string;
    contact_name: string | null;
    status: string;
    next_action_at: string | null;
  };
  const prospectRows = (prospectsRes.data ?? []) as ProspectRow[];

  // Options pour le select de rattachement (tous les prospects de l'user).
  const prospectOptions: ProspectOption[] = prospectRows.map((p) => ({
    id: p.id,
    company_name: p.company_name,
    contact_name: p.contact_name,
  }));

  // Relances actives (statut non clos + date posée) pour le bloc « Aujourd'hui ».
  const relances: RelanceLite[] = prospectRows
    .filter(
      (p) => p.next_action_at && !CLOSED_STATUSES.includes(p.status)
    )
    .map((p) => ({
      id: p.id,
      company_name: p.company_name,
      contact_name: p.contact_name,
      status: p.status,
      next_action_at: p.next_action_at as string,
    }));

  return (
    <TachesClient
      initialTasks={initialTasks}
      relances={relances}
      prospectOptions={prospectOptions}
    />
  );
}
