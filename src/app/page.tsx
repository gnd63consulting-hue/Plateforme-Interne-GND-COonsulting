import { redirect } from 'next/navigation';
import { createClient, MissingSupabaseEnvError } from '@/lib/supabase-server';

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/dashboard');
    }
  } catch (err) {
    // If Supabase isn't configured yet, fall through to /login so at
    // least something renders. The login page itself is also fail-soft.
    if (!(err instanceof MissingSupabaseEnvError)) {
      throw err;
    }
  }

  redirect('/login');
}
