import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { supabaseStatusToNotionStatus } from '@/lib/status-mapping';

export const dynamic = 'force-dynamic';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * POST /api/prospects/[id]/sync-status-to-notion
 *
 * Pousse le statut courant d'un prospect (côté Supabase) vers la page Notion
 * correspondante. Appelé en fire-and-forget par ProspectTable.tsx après chaque
 * `handleStatusChange` du commercial sur la plateforme.
 *
 * Authentification :
 *   - User Supabase authentifié, ET
 *   - Propriétaire du prospect (created_by ou assigned_to) OU role=admin
 *
 * Réponses :
 *   - 200 { success: true, notion_status: "Contacté" }
 *   - 200 { skipped: true, reason: "..." } pour les cas non applicables
 *   - 401 si pas authentifié
 *   - 403 si pas propriétaire/admin
 *   - 404 si prospect introuvable
 *   - 502 si Notion API échoue
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // -------- Auth --------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // -------- Lecture du prospect (admin client pour bypass RLS) --------
  const admin = createAdminClient();
  const { data: prospect, error: readErr } = await admin
    .from('prospects')
    .select('id, notion_page_id, status, created_by, assigned_to')
    .eq('id', id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json(
      { error: `DB read failed: ${readErr.message}` },
      { status: 500 }
    );
  }
  if (!prospect) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // -------- Vérification ownership (créateur, assigné, ou admin) --------
  const isOwner =
    prospect.created_by === user.id || prospect.assigned_to === user.id;
  let isAdmin = false;
  if (!isOwner) {
    const { data: me } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = me?.role === 'admin';
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // -------- Cas où on n'a rien à faire --------
  if (!prospect.notion_page_id) {
    return NextResponse.json({
      skipped: true,
      reason: 'Manual prospect (no notion_page_id), nothing to push.',
    });
  }

  const notionStatus = supabaseStatusToNotionStatus(prospect.status);
  if (!notionStatus) {
    return NextResponse.json({
      skipped: true,
      reason: `No Notion equivalent for status "${prospect.status}".`,
    });
  }

  // -------- PATCH Notion --------
  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY not configured.' },
      { status: 500 }
    );
  }

  const res = await fetch(
    `${NOTION_API}/pages/${prospect.notion_page_id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          statut: { select: { name: notionStatus } },
        },
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json(
      {
        error: `Notion API ${res.status}: ${txt.slice(0, 300)}`,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    notion_status: notionStatus,
    supabase_status: prospect.status,
  });
}
