import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

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
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              // See supabase-middleware.ts for the explanation of this cast:
              // Supabase's CookieOptions has a broader shape than Next.js
              // ResponseCookie (sameSite boolean, capitalized variants).
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, options as any)
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
