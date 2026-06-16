import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminSidebar from '@/components/gnd/AdminSidebar';
import { effectivePerms, hasConsoleAccess, roleLabel } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type Me = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  permissions: unknown;
};

/**
 * Layout fullscreen pour /admin (et toutes ses sous-routes).
 *
 * Gate d'acces : permissions effectives (role preset + override). ROBUSTE :
 * si la colonne `permissions` n'est pas encore lisible cote API (cache de
 * schema PostgREST pas recharge apres la migration 0020), on relit SANS elle
 * pour ne JAMAIS verrouiller la console (le preset du role s'applique).
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

  const { data: withPerms, error: permsErr } = await supabase
    .from('users')
    .select('id, email, full_name, role, permissions')
    .eq('id', user.id)
    .maybeSingle();

  let me: Me | null = (withPerms as Me | null) ?? null;
  if (permsErr || !me) {
    const { data: fallback } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .maybeSingle();
    me = fallback ? { ...fallback, permissions: null } : null;
  }
  if (!me) redirect('/dashboard');

  const perms = effectivePerms(me.role, me.permissions);
  if (!hasConsoleAccess(perms)) redirect('/dashboard');

  const userName = me.full_name ?? me.email.split('@')[0];
  const userRole = roleLabel(me.role);

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
        userEmail={me.email}
        userRole={userRole}
        roleKey={me.role}
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
