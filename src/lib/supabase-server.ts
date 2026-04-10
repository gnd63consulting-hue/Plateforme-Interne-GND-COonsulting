import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for the server (Server Components, Route Handlers, Server Actions).
 * Uses Next.js cookies() to read / write the auth session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // See supabase-middleware.ts for the explanation of this cast:
              // Supabase's CookieOptions has a broader shape than Next.js
              // ResponseCookie (sameSite boolean, capitalized variants).
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Called from a Server Component: ignore, the middleware
            // takes care of refreshing the session cookies.
          }
        },
      },
    }
  );
}
