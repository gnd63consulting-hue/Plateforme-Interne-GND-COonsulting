import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth middleware helper:
 * 1. Refreshes the Supabase session cookie on every request.
 * 2. If the user is admin/admin_limited and TOTP is not yet enabled, redirect
 *    them to /setup-2fa (except for the setup-2fa page itself and auth routes).
 *
 * Defensive: if env vars are missing OR the Supabase call throws for any
 * reason, we log and let the request through rather than crashing the
 * entire site with MIDDLEWARE_INVOCATION_FAILED.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseResponse = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.warn(
      '[supabase-middleware] Missing NEXT_PUBLIC_SUPABASE_URL or ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY. Session refresh skipped. ' +
        'Set both env vars in Vercel and redeploy.'
    );
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // 2FA enforcement for admin / admin_limited users
    if (user) {
      const path = request.nextUrl.pathname;
      const isAuthPath =
        path.startsWith('/setup-2fa') ||
        path.startsWith('/login') ||
        path.startsWith('/auth/') ||
        path.startsWith('/reset-password') ||
        path.startsWith('/update-password') ||
        path.startsWith('/api/');

      if (!isAuthPath) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, totp_enabled')
          .eq('id', user.id)
          .single();

        if (
          profile &&
          (profile.role === 'admin' || profile.role === 'admin_limited') &&
          !profile.totp_enabled
        ) {
          const url = request.nextUrl.clone();
          url.pathname = '/setup-2fa';
          return NextResponse.redirect(url);
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[supabase-middleware] Session refresh failed:', err);
  }

  return supabaseResponse;
}
