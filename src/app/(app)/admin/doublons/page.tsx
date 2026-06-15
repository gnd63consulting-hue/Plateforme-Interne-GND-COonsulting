import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { buildDedupGroups, type DedupProspect } from '@/lib/dedup';
import DoublonsClient from './DoublonsClient';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type Raw = DedupProspect & {
  email_norm: string | null;
  phone_norm: string | null;
};

export default async function DoublonsPage() {
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

  // Détection côté serveur via le client service-role (vue globale, bypass RLS).
  const adminClient = createAdminClient();

  const [{ data: prospectsRaw }, { data: dismissedRaw }, { data: usersRaw }] =
    await Promise.all([
      adminClient
        .from('prospects')
        .select(
          'id, company_name, contact_name, email, phone, city, status, assigned_to, notes, next_action_at, created_at, email_norm, phone_norm'
        )
        .neq('status', 'archived')
        .is('merged_into', null),
      adminClient.from('dedup_dismissed').select('signature'),
      adminClient.from('users').select('id, full_name, email'),
    ]);

  const rows = (prospectsRaw ?? []) as Raw[];
  const dismissed = new Set(
    (dismissedRaw ?? []).map((d: { signature: string }) => d.signature)
  );

  const userName = new Map<string, string>();
  for (const u of (usersRaw ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
  }[]) {
    userName.set(u.id, u.full_name ?? u.email.split('@')[0]);
  }

  const groups = buildDedupGroups(rows, dismissed, 200);

  // Map id → nom commercial pour l'affichage (sérialisable vers le client).
  const assignedNames: Record<string, string> = {};
  for (const g of groups) {
    for (const p of g.prospects) {
      if (p.assigned_to && !assignedNames[p.assigned_to]) {
        assignedNames[p.assigned_to] = userName.get(p.assigned_to) ?? '—';
      }
    }
  }

  return (
    <DoublonsClient
      groups={groups}
      assignedNames={assignedNames}
      totalActive={rows.length}
    />
  );
}
