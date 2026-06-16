import { google, type sheets_v4, type drive_v3 } from 'googleapis';
import type { JWT } from 'google-auth-library';

/**
 * src/lib/google-sheets.ts — pont Google Sheets / Drive pour le miroir CRM.
 *
 * Authentifie un compte de service Google (clé JSON fournie en variable
 * d'environnement) et expose les helpers nécessaires au cron `sheets-mirror`.
 *
 * ⚠️ CONTRAINTE DRIVE PERSO — un compte de service N'A PAS de quota de stockage
 *    propre. Sur un Drive personnel (Gmail), `drive.files.create` échoue donc
 *    avec « The user's Drive storage quota has been exceeded ». Le compte de
 *    service PEUT en revanche, avec un droit Éditeur sur le dossier :
 *      - lister les fichiers du dossier (`drive.files.list`) ;
 *      - écrire des valeurs et ajouter des onglets à un classeur DÉJÀ CRÉÉ PAR
 *        L'UTILISATEUR.
 *    => Le miroir N'EST PLUS « un classeur par commercial créé par le compte de
 *       service », mais UN SEUL classeur (pré-créé à la main par l'utilisateur
 *       dans le dossier) avec UN ONGLET par commercial. Le cron ne crée JAMAIS
 *       de fichier Drive.
 *
 * Helpers exposés :
 *   - `findMirrorWorkbook(clients)` : retrouve le classeur miroir dans le
 *     dossier `GND_CRM_SHEETS_FOLDER_ID` (premier spreadsheet par createdTime),
 *     ou `null` si le dossier n'en contient aucun. NE CRÉE RIEN.
 *   - `ensureTab(sheets, spreadsheetId, tabTitle)` : ajoute l'onglet `tabTitle`
 *     s'il n'existe pas encore (batchUpdate addSheet).
 *   - `sanitizeTabTitle(name)` : normalise un libellé en titre d'onglet valide
 *     (≤ 100 chars, sans `: \ / ? * [ ]`).
 *   - `writeSnapshot(spreadsheetId, tabTitle, header, rows)` : réécrit
 *     INTÉGRALEMENT l'onglet `tabTitle` (clear + update) → idempotent, le
 *     classeur est un MIROIR unidirectionnel (la plateforme est master, toute
 *     édition manuelle dans le Sheet est écrasée au run suivant).
 *
 * ⚠️ Server-only. Ne jamais importer côté client : la clé de service ne doit
 *    jamais fuiter dans un bundle navigateur.
 *
 * Variables d'environnement attendues (Vercel) :
 *   - GOOGLE_SERVICE_ACCOUNT_KEY : la chaîne JSON COMPLÈTE de la clé du compte
 *     de service (gnd-crm-writer@…iam.gserviceaccount.com). Accepte aussi une
 *     valeur encodée en base64 (utile si l'UI Vercel échappe mal les retours à
 *     la ligne de la clé privée).
 *   - GND_CRM_SHEETS_FOLDER_ID : id du dossier Drive « GND CRM Sheets » où vit
 *     le classeur miroir (pré-créé par l'utilisateur, partagé en Éditeur au
 *     compte de service).
 */

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

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

/**
 * Retrouve le classeur miroir DANS le dossier Drive configuré.
 *
 * Le compte de service ne peut PAS créer de fichier sur un Drive perso (pas de
 * quota). Le classeur doit donc être créé À LA MAIN par l'utilisateur dans le
 * dossier `GND_CRM_SHEETS_FOLDER_ID`. On le retrouve dynamiquement (jamais
 * d'id hardcodé : l'utilisateur peut le recréer) en listant les spreadsheets
 * du dossier, triés par createdTime, et on renvoie le PREMIER.
 *
 * @returns le spreadsheetId du classeur miroir, ou `null` si le dossier ne
 *          contient aucun spreadsheet.
 */
export async function findMirrorWorkbook(
  clients: GoogleClients
): Promise<string | null> {
  const { drive, folderId } = clients;

  const q = [
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

  return search.data.files?.[0]?.id ?? null;
}

/**
 * Normalise un libellé en titre d'onglet Google valide.
 *
 * Contraintes Google Sheets : un titre d'onglet ne peut pas contenir
 * `: \ / ? * [ ]` et fait au plus ~100 caractères. On remplace les caractères
 * interdits par un espace, on compacte les espaces, on tronque à 100, et on
 * retombe sur un libellé non vide si tout a été retiré.
 */
export function sanitizeTabTitle(name: string): string {
  const cleaned = (name ?? '')
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim();
  return cleaned.length > 0 ? cleaned : 'Sans nom';
}

/**
 * Garantit que l'onglet `tabTitle` existe sur le classeur. Si absent, l'ajoute
 * via batchUpdate addSheet. Idempotent : ne touche à rien si l'onglet existe.
 */
export async function ensureTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabTitle: string
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const has = (meta.data.sheets ?? []).some(
    (s) => s.properties?.title === tabTitle
  );
  if (has) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tabTitle } } }],
    },
  });
}

/** Échappe un titre d'onglet pour l'usage dans une plage A1 (`'…'`). */
function quoteTab(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * Réécrit INTÉGRALEMENT l'onglet `tabTitle` du classeur : clear complet de
 * l'onglet puis update à partir de A1 (en-tête + lignes). Opération idempotente
 * — appeler avec le même snapshot laisse l'onglet identique. C'est le cœur du
 * « miroir unidirectionnel ».
 *
 * L'onglet doit déjà exister (appeler `ensureTab` avant). On ne crée ni ne
 * supprime aucun fichier Drive ici.
 *
 * `rows` : tableau de lignes, chaque ligne = tableau de cellules (string |
 * number | null). `null`/undefined deviennent des cellules vides.
 */
export async function writeSnapshot(
  clients: GoogleClients,
  spreadsheetId: string,
  tabTitle: string,
  header: string[],
  rows: (string | number | null)[][]
): Promise<void> {
  const { sheets } = clients;
  const tab = quoteTab(tabTitle);

  // 1. Clear total de l'onglet (supprime les anciennes lignes — gère le cas où
  //    un prospect a été désassigné : il disparaît du miroir).
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: tab,
  });

  // 2. Réécriture en bloc depuis A1.
  const values: (string | number | null)[][] = [header, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}
