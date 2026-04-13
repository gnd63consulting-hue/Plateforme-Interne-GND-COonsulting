import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase-server';

/**
 * Force chaque route de (app)/ à être rendue per-request.
 * Sans ça, `next build` sur un env sans vars d'env plante sur
 * /ressources (MissingSupabaseEnvError).
 */
export const dynamic = 'force-dynamic';

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
    .select('role, email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar
        userEmail={profile?.email ?? user.email ?? null}
        userName={profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
      />
      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-screen-2xl px-6 md:px-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
