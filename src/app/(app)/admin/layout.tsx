import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminSidebar from '@/components/gnd/AdminSidebar';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

/**
 * Layout fullscreen pour /admin (et toutes ses sous-routes : /admin/v2,
 * /admin/invitations, etc.).
 *
 * Couvre la fenêtre entière (position fixed inset:0 z-index:50) afin de
 * masquer la Navbar horizontale du layout (app)/ parent — c'est cette
 * sidebar dark qui est la signature visuelle de la console GND, on ne
 * veut pas avoir un menu en haut + une sidebar à gauche.
 *
 * Toutes les autres routes ((app)/dashboard, (app)/prospects, etc.) gardent
 * leur Navbar horizontale standard, ce layout n'est appliqué qu'aux pages
 * sous /admin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !ADMIN_ROLES.has(profile.role)) {
    redirect('/dashboard');
  }

  const userName = profile.full_name ?? profile.email.split('@')[0];
  const userRole =
    profile.role === 'admin'
      ? 'FONDATEUR'
      : profile.role === 'admin_limited'
      ? 'CO-ADMIN'
      : 'ADMIN';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        background: '#1A0F0E',
        overflow: 'hidden',
      }}
    >
      <AdminSidebar
        userName={userName}
        userEmail={profile.email}
        userRole={userRole}
      />
      <main
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'auto',
          position: 'relative',
          background: '#1A0F0E',
        }}
      >
        {children}
      </main>
    </div>
  );
}
