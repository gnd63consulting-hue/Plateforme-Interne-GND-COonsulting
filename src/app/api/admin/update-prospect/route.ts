import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * Whitelist stricte des champs éditables depuis le drawer admin.
 *
 * Mapping spec → schéma Supabase :
 *  - email_contact → colonne `email`
 *  - telephone_contact → colonne `phone`
 *  - nom_contact → colonne `contact_name` (le schéma Supabase a contact_name pour
 *    le nom complet, et prenom_contact pour le prénom séparé suite à enrichment Notion)
 *
 * Hors whitelist :
 *  - score (calculé)
 *  - assigned_to (route séparée /api/admin/reassign-prospect)
 *  - id, notion_page_id, created_at, updated_at (immutables / système)
 *  - tous les champs Notion enrichis (recommandation, analyses, arguments_cles,
 *    besoins_detectes, instagram, etc.) — gérés depuis Notion uniquement.
 */
const PatchSchema = z
  .object({
    status: z.string().min(1).optional(),
    classification: z.string().min(1).optional(),
    prenom_contact: z.string().nullable().optional(),
    contact_name: z.string().nullable().optional(),
    role_contact: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

const BodySchema = z.object({
  prospect_id: z.string().uuid(),
  patch: PatchSchema,
});

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

/**
 * POST /api/admin/update-prospect
 *
 * Met à jour les champs whitelist d'un prospect depuis le drawer admin.
 * Réservé aux admins (admin / admin_limited).
 *
 * Note (persistance des éditions admin) : ces modifications ne sont PLUS
 * écrasées par le sync Notion → Supabase. Depuis le passage du sync en mode
 * « comblement non destructif » (fill-null-only, cf.
 * /api/admin/sync-prospects/route.ts), l'UPDATE de sync ne remplit QUE les
 * colonnes encore vides en DB et ne touche jamais `status` / `notes` /
 * `assigned_to`. Une valeur éditée ici (email, téléphone, classification,
 * secteur, etc.) est donc préservée : le sync 6h suivant ne la réécrit pas.
 * Le push retour vers Notion (pour aligner aussi la fiche Notion) reste une
 * évolution future facultative — il n'est plus nécessaire pour empêcher la
 * perte des éditions côté plateforme.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { prospect_id, patch } = parsed.data;

  // Filter undefined values (zod laisse passer undefined pour les .optional())
  const cleanPatch: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      cleanPatch[key] = value;
    }
  }
  if (Object.keys(cleanPatch).length === 0) {
    return NextResponse.json({ error: 'Empty patch' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from('prospects')
    .update({ ...cleanPatch, updated_at: new Date().toISOString() })
    .eq('id', prospect_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prospect_id, fields: Object.keys(cleanPatch) });
}
