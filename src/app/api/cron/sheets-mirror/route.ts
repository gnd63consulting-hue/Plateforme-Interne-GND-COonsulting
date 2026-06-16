import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  getGoogleClients,
  findMirrorWorkbook,
  ensureTab,
  sanitizeTabTitle,
  writeSnapshot,
} from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * /api/cron/sheets-mirror — Miroir Google Sheets (UN classeur, 1 onglet/commercial).
 *
 * Objectif : sauvegarde lisible (humain + agent) côté Drive de TOUT le pipeline
 * de chaque commercial. Rien n'est perdu côté Drive même si la plateforme
 * tombe : le Sheet est un export complet, un onglet par commercial.
 *
 * ⚠️ DRIVE PERSO — le compte de service N'A PAS de quota de stockage. Sur un
 *    Drive personnel (Gmail), `drive.files.create` échoue (« The user's Drive
 *    storage quota has been exceeded »). Le cron ne crée donc JAMAIS de fichier
 *    Drive : il écrit dans UN classeur UNIQUE, pré-créé À LA MAIN par
 *    l'utilisateur dans le dossier `GND_CRM_SHEETS_FOLDER_ID` (partagé Éditeur
 *    au compte de service), et y maintient UN ONGLET par commercial.
 *
 * ⚠️ MIROIR UNIDIRECTIONNEL — la plateforme Supabase est MASTER.
 *    Chaque run réécrit INTÉGRALEMENT l'onglet de chaque commercial (snapshot
 *    idempotent : clear + update). Toute édition manuelle faite dans le Google
 *    Sheet est donc ÉCRASÉE au run suivant. Le Sheet n'est jamais relu vers la
 *    plateforme — c'est une copie en lecture seule, pas une source. On ne
 *    supprime aucun onglet (ni l'onglet par défaut « Feuille 1 », ni les onglets
 *    qu'on n'a pas créés) : pas de pruning destructif.
 *
 * Cloisonnement financier : AUCUN montant n'est exporté (pas de deal_amount /
 * commissions). De toute façon `deal_amount` ne vit plus sur `prospects` (il a
 * été isolé dans `prospect_finance`, RLS admin-only — cf. migration 0021), donc
 * le service-role read ci-dessous ne peut structurellement pas exfiltrer de CA.
 *
 * Déclenché par Vercel Cron (quotidien, cf. vercel.json). Service-role
 * UNIQUEMENT (bypass RLS) : on lit les prospects de TOUS les commerciaux, le
 * cron n'a pas de session utilisateur.
 *
 * Auth : identique à /api/sequences/tick & /api/notifications/digest.
 *   - `Authorization: Bearer ${CRON_SECRET}`     (Vercel Cron — auto-set)
 *   - `Authorization: Bearer ${ADMIN_SYNC_SECRET}` (déclenchement manuel curl)
 *
 * DORMANT par défaut : si GOOGLE_SERVICE_ACCOUNT_KEY n'est pas défini, la route
 * ne fait RIEN (skipped) et ne plante jamais — comme le digest sans
 * RESEND_API_KEY. Tant que la clé n'est pas posée en env, le cron est un no-op.
 */

/** Rôles considérés comme « commercial » (un onglet miroir par user actif). */
const COMMERCIAL_ROLES = new Set(['freelance', 'commercial']);

/**
 * Colonnes prospect lues pour le snapshot. AUCUNE colonne financière.
 * `deal_amount` n'existe plus sur prospects (cf. 0021) — on ne le sélectionne
 * donc pas. `source` n'existe pas dans le schéma prospects : la colonne du Sheet
 * existe pour cohérence du gabarit mais reste vide (cf. mapping ci-dessous).
 */
const PROSPECT_COLS = [
  'id',
  'company_name',
  'contact_name',
  'email',
  'phone',
  'sector',
  'status',
  'classification',
  'created_at',
  'updated_at',
  'notes',
  'assigned_to',
].join(', ');

/** En-tête du Sheet (ordre figé). */
const HEADER = [
  'nom_entreprise',
  'nom_contact',
  'email',
  'telephone',
  'secteur',
  'statut',
  'classification',
  'source',
  'date_assignation',
  'derniere_activite',
  'notes',
];

type ProspectRow = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  sector: string | null;
  status: string | null;
  classification: string | null;
  created_at: string | null;
  updated_at: string | null;
  notes: string | null;
  assigned_to: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  active: boolean | null;
};

function authenticate(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const adminSecret = process.env.ADMIN_SYNC_SECRET;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true;
  return false;
}

/** Libellé d'onglet déterministe pour un commercial (sanitizé avant écriture). */
function commercialLabel(user: UserRow): string {
  return (
    (user.full_name && user.full_name.trim()) ||
    (user.email && user.email.trim()) ||
    user.id
  );
}

/** Convertit une ligne prospect DB en ligne de cellules pour le Sheet. */
function prospectToCells(p: ProspectRow): (string | number | null)[] {
  return [
    p.company_name ?? '',
    p.contact_name ?? '',
    p.email ?? '',
    p.phone ?? '',
    p.sector ?? '',
    p.status ?? '',
    p.classification ?? '',
    '', // source — non stocké côté plateforme (colonne réservée)
    p.created_at ?? '', // date_assignation / created
    p.updated_at ?? '', // derniere_activite (dernière modif de la fiche)
    p.notes ?? '',
  ];
}

async function runMirror() {
  // Dormance : pas de clé → no-op propre (cohérent avec le digest sans Resend).
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return {
      skipped: true,
      reason:
        'GOOGLE_SERVICE_ACCOUNT_KEY absent — miroir Sheets en dormance (rien écrit).',
    };
  }
  if (!process.env.GND_CRM_SHEETS_FOLDER_ID) {
    return {
      skipped: true,
      reason:
        'GND_CRM_SHEETS_FOLDER_ID absent — miroir Sheets en dormance (rien écrit).',
    };
  }

  const admin = createAdminClient();

  // -------- 1. Commerciaux actifs --------
  const { data: usersRaw, error: usersErr } = await admin
    .from('users')
    .select('id, full_name, email, role, active');
  if (usersErr) {
    return {
      error: `Lecture des users échouée : ${usersErr.message}`,
      status: 500 as const,
    };
  }
  const commercials = ((usersRaw ?? []) as UserRow[]).filter(
    (u) =>
      u.role != null && COMMERCIAL_ROLES.has(u.role) && u.active !== false
  );

  // -------- 2. Tous les prospects assignés (1 lecture, regroupée en mémoire) --
  const { data: prosRaw, error: prosErr } = await admin
    .from('prospects')
    .select(PROSPECT_COLS)
    .not('assigned_to', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50000);
  if (prosErr) {
    return {
      error: `Lecture des prospects échouée : ${prosErr.message}`,
      status: 500 as const,
    };
  }

  const byOwner = new Map<string, ProspectRow[]>();
  for (const p of (prosRaw ?? []) as unknown as ProspectRow[]) {
    if (!p.assigned_to) continue;
    const list = byOwner.get(p.assigned_to);
    if (list) list.push(p);
    else byOwner.set(p.assigned_to, [p]);
  }

  // -------- 3. Init clients Google + résolution du classeur miroir UNIQUE -----
  let clients;
  try {
    clients = getGoogleClients();
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Google clients init failed',
      status: 500 as const,
    };
  }

  // Le compte de service ne peut PAS créer de fichier sur un Drive perso. Le
  // classeur doit déjà exister dans le dossier (créé à la main par l'utilisateur).
  let spreadsheetId: string | null;
  try {
    spreadsheetId = await findMirrorWorkbook(clients);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `Recherche du classeur miroir échouée : ${e.message}`
          : 'Recherche du classeur miroir échouée',
      status: 500 as const,
    };
  }

  if (!spreadsheetId) {
    const result = {
      skipped: true as const,
      reason:
        "Aucun classeur dans le dossier GND CRM Sheets — crée d'abord un Google Sheet dedans (le compte de service ne peut pas en créer sur un Drive perso).",
    };
    console.log('[sheets-mirror] ' + JSON.stringify(result));
    return result;
  }

  // -------- 4. Un onglet par commercial, snapshot complet --------
  let tabsWritten = 0;
  let rowsTotal = 0;
  const errors: { user: string; error: string }[] = [];

  for (const u of commercials) {
    const prospects = byOwner.get(u.id) ?? [];
    const tabTitle = sanitizeTabTitle(commercialLabel(u));
    try {
      await ensureTab(clients.sheets, spreadsheetId, tabTitle);
      const rows = prospects.map(prospectToCells);
      await writeSnapshot(clients, spreadsheetId, tabTitle, HEADER, rows);
      tabsWritten++;
      rowsTotal += rows.length;
    } catch (e) {
      // Une erreur sur un commercial ne doit PAS interrompre la boucle.
      errors.push({
        user: u.email ?? u.id,
        error: e instanceof Error ? e.message : 'unknown',
      });
    }
  }

  const result = {
    workbook: spreadsheetId,
    commercials: commercials.length,
    tabsWritten,
    rowsTotal,
    errors,
  };
  console.log('[sheets-mirror] ' + JSON.stringify(result));
  return result;
}

export async function GET(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runMirror();
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

/** POST identique — déclenchement manuel (curl) hors verbe imposé par Vercel Cron. */
export async function POST(req: Request) {
  return GET(req);
}
