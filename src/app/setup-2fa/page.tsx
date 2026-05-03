import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Setup2faClient } from './Setup2faClient';

export default async function Setup2faPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('totp_enabled, role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  // Si déjà activé, on redirige vers dashboard
  if (profile.totp_enabled) redirect('/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white border rounded-lg p-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Activer la double authentification</h1>
          <p className="text-sm text-gray-600 mt-2">
            Bonjour {profile.full_name ?? user.email}, pour des raisons de sécurité,
            la 2FA est obligatoire sur cette plateforme. Configure ton authenticator
            (Google Authenticator, Authy, 1Password, etc.) en 2 minutes.
          </p>
        </header>

        <Setup2faClient />
      </div>
    </div>
  );
}
