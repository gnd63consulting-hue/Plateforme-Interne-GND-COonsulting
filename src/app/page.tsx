import { redirect } from 'next/navigation';
import { createClient, MissingSupabaseEnvError } from '@/lib/supabase-server';

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/formation');
    }
  } catch (err) {
    if (!(err instanceof MissingSupabaseEnvError)) {
      throw err;
    }
  }

  redirect('/login');
}
