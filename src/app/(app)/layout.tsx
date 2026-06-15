import { redirect } from 'next/navigation';
import AppShell from '@/components/app-shell/AppShell';
import { createClient } from '@/lib/supabase-server';

/**
 * Force chaque route de (app)/ à être rendue per-request.
 * Sans ça, `next build` sur un env sans vars d'env plante sur
 * /ressources (MissingSupabaseEnvError).
 */
export const dynamic = 'force-dynamic';

/**
 * Sprint 10 — nouveau shell SaaS (sidebar claire + topbar fin + panneau crème).
 * Remplace l'ancienne Navbar top + Footer. Toutes les routes (app) continuent
 * de s'afficher dans ce shell. La logique d'auth/rôle est conservée à
 * l'identique (`isAdmin = role === 'admin'`).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, email, full_name, commission_rate')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;
  const commissionRate =
    profile?.commission_rate != null ? Number(profile.commission_rate) : null;
  const commissionPct =
    commissionRate != null ? Math.round(commissionRate * 100) : null;

  return (
    <AppShell
      isAdmin={isAdmin}
      user={{
        name:
          profile?.full_name ??
          (user.user_metadata?.full_name as string | undefined) ??
          null,
        email: profile?.email ?? user.email ?? null,
        role: profile?.role ?? null,
        commissionPct,
        avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
