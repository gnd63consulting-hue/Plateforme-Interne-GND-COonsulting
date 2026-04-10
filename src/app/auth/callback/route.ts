import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Supabase OAuth callback. Google sends the user back here with a `code`
 * that we exchange for a session cookie, then we bounce to /dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
