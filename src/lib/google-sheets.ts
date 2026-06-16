import { google, type sheets_v4, type drive_v3 } from 'googleapis';
import type { JWT } from 'google-auth-library';

/**
 * src/lib/google-sheets.ts — pont Google Sheets / Drive pour le miroir CRM.
 *
 * Authentifie un compte de service Google (clé JSON fournie en variable
 * d'environnement) et expose les helpers nécessaires au cron `sheets-mirror` :
 *   - `findOrCreateSpreadsheet(name)` : trouve (ou crée) un classeur portant un
 *     nom donné DANS le dossier Drive `GND_CRM_SHEETS_FOLDER_ID`.
 *   - `writeSnapshot(spreadsheetId, header, rows)` : réécrit intégralement
 *     l'onglet (clear + update) → idempotent, le classeur est un MIROIR
 *     unidirectionnel (la plateforme est master, toute édition manuelle dans
 *     le Sheet est écrasée au run suivant).
 *
 * ⚠️ Server-only. Ne jamais importer côté client : la clé de service ne doit
 *    jamais fuiter dans un bundle navigateur.
 *
 * Variables d'environnement attendues (Vercel) :
 *   - GOOGLE_SERVICE_ACCOUNT_KEY : la chaîne JSON COMPLÈTE de la clé du compte
 *     de service (gnd-crm-writer@…iam.gserviceaccount.com). Accepte aussi une
 *     valeur encodée en base64 (utile si l'UI Vercel échappe mal les retours à
 *     la ligne de la clé privée).
 *   - GND_CRM_SHEETS_FOLDER_ID : id du dossier Drive « GND CRM Sheets » où les
 *     classeurs par commercial sont créés/retrouvés.
 */

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

/** Onglet unique réécrit à chaque run. */
export const MIRROR_SHEET_TITLE = 'Prospects';

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  [k: string]: unknown;
};

/**
 * Parse la clé du compte de service depuis l'env. Tolère :
 *   - JSON brut (cas standard)
 *   - JSON encodé base64 (workaround Vercel sur les `\n` de la private_key)
 */
function parseServiceAccountKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY manquant. Colle la chaîne JSON complète de la ' +
        'clé du compte de service Google dans Vercel > Settings > Environment ' +
        'Variables.'
    );
  }

  const candidate = raw.trim();
  let jsonStr = candidate;
  // Si ça ne ressemble pas à du JSON, on tente un décodage base64.
  if (!candidate.startsWith('{')) {
    try {
      jsonStr = Buffer.from(candidate, 'base64').toString('utf8');
    } catch {
      // on retombera sur l'erreur de parse JSON ci-dessous
    }
  }

  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(jsonStr) as ServiceAccountKey;
  } catch {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY invalide : impossible de parser le JSON de la ' +
        'clé du compte de service.'
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY incomplet : client_email / private_key absents.'
    );
  }

  // Vercel échappe parfois les retours à la ligne de la clé privée en `\\n`.
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
}

function getFolderId(): string {
  const folderId = process.env.GND_CRM_SHEETS_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      'GND_CRM_SHEETS_FOLDER_ID manquant. Renseigne l’id du dossier Drive ' +
        '« GND CRM Sheets » dans Vercel > Settings > Environment Variables.'
    );
  }
  return folderId;
}

/** Construit un client JWT authentifié avec les scopes Sheets + Drive. */
function getAuth(): JWT {
  const key = parseServiceAccountKey();
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: SCOPES,
  });
}

export type GoogleClients = {
  sheets: sheets_v4.Sheets;
  drive: drive_v3.Drive;
  folderId: string;
};

/**
 * Initialise les clients Google (Sheets + Drive) + résout l'id du dossier.
 * Lance une erreur explicite si une env var manque (pour que le cron remonte
 * un message actionnable plutôt qu'un échec opaque).
 */
export function getGoogleClients(): GoogleClients {
  const auth = getAuth();
  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
    folderId: getFolderId(),
  };
}

/** Échappe un nom pour une requête Drive `q` (les apostrophes sont doublées). */
function escapeDriveQueryValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Trouve — ou crée si absent — un classeur Google Sheets portant `name` DANS le
 * dossier Drive configuré. Retourne le spreadsheetId.
 *
 * Recherche Drive : on filtre par nom EXACT, type spreadsheet, parent = dossier,
 * non supprimé. Si plusieurs classeurs homonymes existaient (ne devrait pas),
 * on réutilise le plus ancien (ordre createdTime) pour rester déterministe.
 */
export async function findOrCreateSpreadsheet(
  clients: GoogleClients,
  name: string
): Promise<string> {
  const { drive, sheets, folderId } = clients;
  const safeName = escapeDriveQueryValue(name);

  const q = [
    `name = '${safeName}'`,
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    `'${folderId}' in parents`,
    'trashed = false',
  ].join(' and ');

  const search = await drive.files.list({
    q,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime',
    spaces: 'drive',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = search.data.files?.[0]?.id;
  if (existing) return existing;

  // Création directement dans le dossier cible (parents = [folderId]).
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  const newId = created.data.id;
  if (!newId) {
    throw new Error(`Échec de création du classeur Google Sheets « ${name} ».`);
  }

  // Renomme l'onglet par défaut (Sheet1/Feuille1) en MIRROR_SHEET_TITLE pour
  // que writeSnapshot écrive toujours sur un onglet au nom connu.
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: newId });
    const firstSheet = meta.data.sheets?.[0]?.properties;
    if (firstSheet?.sheetId != null && firstSheet.title !== MIRROR_SHEET_TITLE) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: newId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: firstSheet.sheetId,
                  title: MIRROR_SHEET_TITLE,
                },
                fields: 'title',
              },
            },
          ],
        },
      });
    }
  } catch {
    // Non bloquant : si le rename échoue, writeSnapshot crée l'onglet au besoin.
  }

  return newId;
}

/** Garantit que l'onglet `MIRROR_SHEET_TITLE` existe sur le classeur. */
async function ensureMirrorSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const has = (meta.data.sheets ?? []).some(
    (s) => s.properties?.title === MIRROR_SHEET_TITLE
  );
  if (has) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: MIRROR_SHEET_TITLE } } },
      ],
    },
  });
}

/**
 * Réécrit INTÉGRALEMENT l'onglet miroir : clear complet puis update à partir de
 * A1 (en-tête + lignes). Opération idempotente — appeler avec le même snapshot
 * laisse le classeur identique. C'est le cœur du « miroir unidirectionnel ».
 *
 * `rows` : tableau de lignes, chaque ligne = tableau de cellules (string |
 * number | null). `null`/undefined deviennent des cellules vides.
 */
export async function writeSnapshot(
  clients: GoogleClients,
  spreadsheetId: string,
  header: string[],
  rows: (string | number | null)[][]
): Promise<void> {
  const { sheets } = clients;

  await ensureMirrorSheet(sheets, spreadsheetId);

  // 1. Clear total de l'onglet (supprime les anciennes lignes — gère le cas où
  //    un prospect a été désassigné : il disparaît du miroir).
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: MIRROR_SHEET_TITLE,
  });

  // 2. Réécriture en bloc depuis A1.
  const values: (string | number | null)[][] = [header, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${MIRROR_SHEET_TITLE}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}
