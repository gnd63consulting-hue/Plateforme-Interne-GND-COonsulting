import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase-server';

/**
 * Force every route under (app)/ to be rendered per-request at runtime.
 *
 * This layout hard-calls Supabase (createClient + auth.getUser + users
 * table read), which means it can never be pre-rendered at build time —
 * there's no stable output without a live session. Marking the layout
 * `force-dynamic` opts every nested page out of SSG even if the page
 * itself looks static (e.g. /ressources only reads a local MDX file).
 *
 * Without this, `next build` on a cold environment (no env vars set
 * yet, like the first Vercel deploy) fails at the "Generating static
 * pages" step with MissingSupabaseEnvError on /ressources.
 */
export const dynamic = 'force-dynamic';

/**
 * Layout wrapping every authenticated page. Ensures the user is logged in,
 * fetches their profile (to know if admin) and renders the Navbar.
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
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gnd-bg">
      <Navbar userEmail={profile?.email ?? user.email ?? null} isAdmin={isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
