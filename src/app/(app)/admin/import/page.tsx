import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

/**
 * Page d'import CSV de prospects (admin uniquement). Le travail (parsing,
 * dedup, insertion) vit dans ImportClient + ./actions. Ici on ne fait que la
 * garde d'acces.
 */
export default async function ImportPage() {
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

  return <ImportClient />;
}
