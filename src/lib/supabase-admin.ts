import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec la SERVICE ROLE KEY.
 *
 * À utiliser UNIQUEMENT côté serveur (route handlers, server actions).
 * Bypass la RLS — ne JAMAIS l'exposer au client.
 *
 * Cas d'usage v1 :
 *   - Route /api/quiz/submit : lire les correct_ids, insérer dans
 *     quiz_attempts, upsert progressions.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase admin env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY in Vercel > Settings > Environment Variables.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
