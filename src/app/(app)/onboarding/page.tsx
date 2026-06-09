import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, role, commission_rate')
    .eq('id', user.id)
    .maybeSingle();

  const { count: prospectCount } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', user.id);

  const prenom =
    (profile?.full_name ?? user.email?.split('@')[0] ?? '').split(/[\s.]+/)[0] ||
    'à toi';
  const commissionPct =
    profile?.commission_rate != null
      ? Math.round(Number(profile.commission_rate) * 100)
      : null;

  return (
    <OnboardingClient
      prenom={prenom}
      commissionPct={commissionPct}
      nbProspects={prospectCount ?? 0}
      userId={user.id}
    />
  );
}
