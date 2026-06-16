import { createClient } from '@/lib/supabase-server';
import ProspectsClient from './ProspectsClient';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';

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
    />
  );
}
