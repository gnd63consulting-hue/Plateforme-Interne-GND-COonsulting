import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Supabase OAuth callback. Google sends the user back here with a `code`
 * that we exchange for a session cookie, then we bounce to /dashboard.
 *
 * Error handling:
 *   - If the email is not in our `invitations` whitelist, the
 *     `handle_new_user` trigger raises an exception and Supabase returns
 *     "Database error saving new user" (500). We catch that and redirect
 *     to /login?error=not_invited so the UI can show a clean message
 *     instead of leaking the technical error in the URL.
 *   - Other errors fall back to /login?error=auth_failed.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/dashboard';

  // Cas 1 : Supabase a déjà détecté une erreur en amont (rare, parfois
  // sur certains flows OAuth). On parse le message et on redirige propre.
  if (errorParam) {
    if (
      errorDescription &&
      /database error saving new user/i.test(errorDescription)
    ) {
      return NextResponse.redirect(`${origin}/login?error=not_invited`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // L'exchange a échoué — le plus souvent c'est notre trigger
    // handle_new_user qui RAISE EXCEPTION pour un email pas whitelist.
    const msg = error.message?.toLowerCase() ?? '';
    if (
      msg.includes('database error') ||
      msg.includes('non autoris') ||
      msg.includes('saving new user')
    ) {
      return NextResponse.redirect(`${origin}/login?error=not_invited`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
