import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase-server';

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
