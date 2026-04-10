import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Thrown when required Supabase env vars are missing at runtime.
 * Callers that can fail soft (e.g. /login, /) should catch this and
 * fall back. Callers that cannot (e.g. /dashboard, /prospects, /admin)
 * should let it bubble up to the `error.tsx` boundary.
 */
export class MissingSupabaseEnvError extends Error {
  constructor() {
    super(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel > Settings > Environment ' +
        'Variables, then redeploy.'
    );
    this.name = 'MissingSupabaseEnvError';
  }
}

/**
 * Supabase client for the server (Server Components, Route Handlers, Server Actions).
 * Uses Next.js cookies() to read / write the auth session.
 * Throws MissingSupabaseEnvError if the required env vars are not set.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new MissingSupabaseEnvError();
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });
}
