import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** Trou maximal entre deux heartbeats avant d'ouvrir une nouvelle session. */
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 min

/**
 * POST /api/presence
 *
 * Heartbeat de présence (Sprint connexions). Le client poste périodiquement ;
 * on « sessionise » par trou de 30 min :
 *   - dernière session du user avec last_seen_at < 30 min → on prolonge
 *     (UPDATE last_seen_at = now()).
 *   - sinon → on ouvre une nouvelle session (INSERT).
 *
 * Écrit via le client user authentifié : les RLS own (insert/update/select)
 * de `login_sessions` (migration 0056) s'appliquent. RGPD : aucune IP stockée,
 * seul le user_agent (depuis l'en-tête) est conservé.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const userAgent = req.headers.get('user-agent');

  // 1. Dernière session du user.
  const { data: last } = await supabase
    .from('login_sessions')
    .select('id, last_seen_at')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Session encore « vivante » (< 30 min) → on prolonge.
  if (last) {
    const lastSeen = new Date(last.last_seen_at).getTime();
    if (Date.now() - lastSeen < SESSION_GAP_MS) {
      const { error } = await supabase
        .from('login_sessions')
        .update({ last_seen_at: nowIso })
        .eq('id', last.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }
  }

  // 3. Sinon → nouvelle session (user_id explicite : pas de default auth.uid()
  //    fiable hors contexte SQL, mais validé par la RLS own_insert).
  const { error } = await supabase.from('login_sessions').insert({
    user_id: user.id,
    user_agent: userAgent,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
