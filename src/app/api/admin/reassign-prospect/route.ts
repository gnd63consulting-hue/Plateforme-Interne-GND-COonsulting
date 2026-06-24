import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  prospect_id: z.string().uuid(),
  new_assigned_to: z.string().uuid().nullable(),
});

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

/**
 * POST /api/admin/reassign-prospect
 *
 * Réassigne un prospect à un autre commercial (ou à NULL pour désassigner).
 * Réservé aux admins. Met à jour uniquement la colonne `assigned_to` du prospect.
 *
 * Source de vérité : la PLATEFORME est master de la propriété. Le sync Notion
 * (cf. sync-prospects) ne réécrit JAMAIS `assigned_to` sur un prospect existant
 * (la colonne est exclue de FILLABLE_COLUMNS ; l'UPDATE ne comble que les
 * champs encore vides). Le mirror Google Sheets ne fait que LIRE. Une
 * assignation faite ici est donc préservée à travers les syncs. (Le push
 * bidirectionnel vers Notion reste un nice-to-have informatif, pas requis.)
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prospect_id, new_assigned_to } = parsed.data;

  // Si new_assigned_to non-null, vérifier que c'est un commercial valide
  if (new_assigned_to) {
    const { data: target } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', new_assigned_to)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }
    if (!['freelance', 'commercial', 'admin', 'admin_limited'].includes(target.role)) {
      return NextResponse.json({ error: 'Target user has invalid role' }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from('prospects')
    .update({ assigned_to: new_assigned_to, updated_at: new Date().toISOString() })
    .eq('id', prospect_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prospect_id, new_assigned_to });
}
