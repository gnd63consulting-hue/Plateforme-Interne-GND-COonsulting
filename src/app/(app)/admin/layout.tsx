import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminSidebar from '@/components/gnd/AdminSidebar';
import { effectivePerms, hasConsoleAccess, roleLabel } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * Layout fullscreen pour /admin (et toutes ses sous-routes : /admin/v2,
 * /admin/invitations, etc.).
 *
 * Couvre la fenêtre entière (position fixed inset:0 z-index:50) afin de
 * masquer la Navbar horizontale du layout (app)/ parent — c'est cette
 * sidebar qui est la signature visuelle de la console GND, on ne
 * veut pas avoir un menu en haut + une sidebar à gauche.
 *
 * Toutes les autres routes ((app)/dashboard, (app)/prospects, etc.) gardent
 * leur Navbar horizontale standard, ce layout n'est appliqué qu'aux pages
 * sous /admin.
 *
 * data-lenis-prevent : empêche le composant Lenis SmoothScroll global
 * (monté au niveau RootLayout) d'intercepter les events molette/wheel
 * sur le contenu admin. Sans cet attribut, Lenis tente de scroller le
 * body — qui ne scroll pas car notre layout est position:fixed au-dessus.
 * Avec cet attribut, le scroll natif du browser reprend la main.
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
    .select('id, email, full_name, role, permissions')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/dashboard');
  }
  const perms = effectivePerms(profile.role, profile.permissions);
  if (!hasConsoleAccess(perms)) {
    redirect('/dashboard');
  }

  const userName = profile.full_name ?? profile.email.split('@')[0];
  const userRole = roleLabel(profile.role);

  return (
    <div
      data-lenis-prevent
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        background: '#F6EFE7',
        overflow: 'hidden',
      }}
    >
      <AdminSidebar
        userName={userName}
        userEmail={profile.email}
        userRole={userRole}
        roleKey={profile.role}
        perms={perms}
      />
      <main
        data-lenis-prevent
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'auto',
          position: 'relative',
          background: '#F6EFE7',
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </main>
    </div>
  );
}
