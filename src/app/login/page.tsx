import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import LoginButton from './LoginButton';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gnd-bg p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gnd-primary text-lg font-bold text-white">
            G
          </div>
          <h1 className="text-2xl font-bold text-gnd-primary">
            Espace commerciaux GND
          </h1>
          <p className="mt-2 text-sm text-gnd-muted">
            Connecte-toi pour accéder à ta formation, tes ressources et tes prospects.
          </p>
        </div>

        <LoginButton />

        <p className="mt-6 text-center text-xs text-gnd-muted">
          Accès réservé aux commerciaux freelances de GND Consulting.
        </p>
      </div>
    </main>
  );
}
