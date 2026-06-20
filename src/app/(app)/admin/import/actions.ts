'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { phoneKey9 } from '@/lib/dedup';
import type { ImportRowInput } from '@/lib/csv';

/**
 * Server actions de l'import CSV de prospects (page admin /admin/import).
 *
 * Admin-guarded (requireAdmin) + client service-role (bypass RLS) ; ce fichier
 * est 'use server', le service-role ne fuit jamais cote client.
 *
 * Regles metier :
 *   - dedup en deux niveaux : contre la base existante (phone_norm/email_norm)
 *     ET dans le fichier lui-meme ;
 *   - une ligne sans entreprise est invalide (pas d'insert) ;
 *   - les prospects importes entrent NON assignes (assigned_to = null) dans le
 *     pool admin : le routage vers un commercial reste un acte humain (base
 *     intouchable, human-in-the-loop) ;
 *   - aucune donnee financiere n'est touchee.
 */

const MGMT_ADMIN_ROLES = ['admin', 'admin_limited'];
const MAX_ROWS = 5000;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !MGMT_ADMIN_ROLES.includes(profile.role)) return null;
  return user;
}

function clean(v: string | null): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

/** Cle telephone = 9 derniers chiffres du numero brut (aligne sur phoneKey9). */
function key9(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : null;
}

function emailKey(email: string | null): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e.includes('@') ? e : null;
}

type Classified = {
  insert: ImportRowInput[];
  dupDb: number;
  dupFile: number;
  invalid: number;
};

/** Charge les cles existantes (paginees) et classe les lignes a importer. */
async function classify(rows: ImportRowInput[]): Promise<Classified> {
  const adminClient = createAdminClient();
  const existPhone = new Set<string>();
  const existEmail = new Set<string>();

  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await adminClient
      .from('prospects')
      .select('phone_norm, email_norm')
      .is('merged_into', null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const row = r as { phone_norm: string | null; email_norm: string | null };
      const pk = phoneKey9(row.phone_norm);
      if (pk) existPhone.add(pk);
      if (row.email_norm) existEmail.add(String(row.email_norm).toLowerCase());
    }
    if (!data || data.length < PAGE) break;
  }

  const seenPhone = new Set<string>();
  const seenEmail = new Set<string>();
  const insert: ImportRowInput[] = [];
  let dupDb = 0;
  let dupFile = 0;
  let invalid = 0;

  for (const raw of rows) {
    const company = clean(raw.company_name);
    const phone = clean(raw.phone);
    const email = clean(raw.email);
    if (!company) {
      invalid++;
      continue;
    }
    const pk = key9(phone);
    const ek = emailKey(email);

    if ((pk && existPhone.has(pk)) || (ek && existEmail.has(ek))) {
      dupDb++;
      continue;
    }
    if ((pk && seenPhone.has(pk)) || (ek && seenEmail.has(ek))) {
      dupFile++;
      continue;
    }
    if (pk) seenPhone.add(pk);
    if (ek) seenEmail.add(ek);
    insert.push({
      company_name: company,
      contact_name: clean(raw.contact_name),
      phone,
      email,
      website: clean(raw.website),
      city: clean(raw.city),
      postal_code: clean(raw.postal_code),
      sector: clean(raw.sector),
      address: clean(raw.address),
      ca_estime: clean(raw.ca_estime),
      notes: clean(raw.notes),
    });
  }
  return { insert, dupDb, dupFile, invalid };
}

export type ImportAnalysis = {
  ok: boolean;
  error: string | null;
  total: number;
  toInsert: number;
  duplicatesInDb: number;
  duplicatesInFile: number;
  invalid: number;
  sample: {
    company_name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
  }[];
};

const EMPTY_ANALYSIS = {
  ok: false,
  total: 0,
  toInsert: 0,
  duplicatesInDb: 0,
  duplicatesInFile: 0,
  invalid: 0,
  sample: [] as ImportAnalysis['sample'],
};

/** Dry-run : analyse les lignes sans rien ecrire en base. */
export async function analyzeImport(rows: ImportRowInput[]): Promise<ImportAnalysis> {
  const admin = await requireAdmin();
  if (!admin) return { ...EMPTY_ANALYSIS, error: 'Permissions insuffisantes.' };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ...EMPTY_ANALYSIS, error: 'Aucune ligne a importer.' };
  }
  if (rows.length > MAX_ROWS) {
    return { ...EMPTY_ANALYSIS, error: `Trop de lignes (max ${MAX_ROWS}). Decoupe le fichier.` };
  }
  try {
    const c = await classify(rows);
    return {
      ok: true,
      error: null,
      total: rows.length,
      toInsert: c.insert.length,
      duplicatesInDb: c.dupDb,
      duplicatesInFile: c.dupFile,
      invalid: c.invalid,
      sample: c.insert.slice(0, 10).map((p) => ({
        company_name: p.company_name ?? '',
        phone: p.phone,
        email: p.email,
        city: p.city,
      })),
    };
  } catch (e) {
    return { ...EMPTY_ANALYSIS, error: e instanceof Error ? e.message : 'Erreur analyse.' };
  }
}

export type ImportResult = {
  ok: boolean;
  error: string | null;
  inserted: number;
  skipped: number;
};

/** Insere reellement les lignes nouvelles (re-classe cote serveur, ne fait pas
 *  confiance au client). */
export async function commitImport(rows: ImportRowInput[]): Promise<ImportResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Permissions insuffisantes.', inserted: 0, skipped: 0 };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'Aucune ligne a importer.', inserted: 0, skipped: 0 };
  }
  if (rows.length > MAX_ROWS) {
    return { ok: false, error: `Trop de lignes (max ${MAX_ROWS}).`, inserted: 0, skipped: 0 };
  }
  try {
    const c = await classify(rows);
    if (c.insert.length === 0) {
      return { ok: true, error: null, inserted: 0, skipped: rows.length };
    }
    const adminClient = createAdminClient();
    const stamp = new Date().toISOString();
    const importNote = `Importe via CSV le ${new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date())}`;

    const payload = c.insert.map((p) => ({
      company_name: p.company_name,
      contact_name: p.contact_name,
      phone: p.phone,
      email: p.email,
      website: p.website,
      city: p.city,
      postal_code: p.postal_code,
      sector: p.sector,
      address: p.address,
      ca_estime: p.ca_estime,
      notes: p.notes ? `${p.notes}\n\n${importNote}` : importNote,
      status: 'a_contacter',
      created_by: admin.id,
      assigned_to: null as string | null,
      updated_at: stamp,
    }));

    let inserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const { error } = await adminClient.from('prospects').insert(slice);
      if (error) {
        return {
          ok: false,
          error: `Insertion (lot ${Math.floor(i / CHUNK) + 1}) : ${error.message}`,
          inserted,
          skipped: rows.length - inserted,
        };
      }
      inserted += slice.length;
    }

    revalidatePath('/admin/import');
    revalidatePath('/prospects');
    return { ok: true, error: null, inserted, skipped: rows.length - inserted };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Erreur import.',
      inserted: 0,
      skipped: 0,
    };
  }
}
