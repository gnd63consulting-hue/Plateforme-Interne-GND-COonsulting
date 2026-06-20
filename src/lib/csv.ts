/**
 * Petit parseur CSV/TSV autonome (zero dependance) + mapping des en-tetes vers
 * les colonnes prospects. Sert l'import manuel de listes de prospection (page
 * admin /admin/import).
 *
 * Gere : delimiteur , ; ou tabulation (auto-detecte sur la 1re ligne), champs
 * entre guillemets avec "" echappe et retours ligne internes, BOM UTF-8,
 * lignes vides. Mapping d'en-tetes tolerant (accents normalises, FR + EN).
 */

export type ImportRowInput = {
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  postal_code: string | null;
  sector: string | null;
  address: string | null;
  ca_estime: string | null;
  notes: string | null;
};

export const IMPORT_FIELDS: (keyof ImportRowInput)[] = [
  'company_name',
  'contact_name',
  'phone',
  'email',
  'website',
  'city',
  'postal_code',
  'sector',
  'address',
  'ca_estime',
  'notes',
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function norm(s: string): string {
  return stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

const FIELD_ALIASES: Record<keyof ImportRowInput, string[]> = {
  company_name: [
    'company',
    'company name',
    'entreprise',
    'societe',
    'nom',
    'nom entreprise',
    'raison sociale',
    'name',
    'etablissement',
    'enseigne',
  ],
  contact_name: [
    'contact',
    'contact name',
    'nom contact',
    'dirigeant',
    'gerant',
    'interlocuteur',
    'responsable',
    'prenom nom',
  ],
  phone: [
    'phone',
    'telephone',
    'tel',
    'mobile',
    'portable',
    'numero',
    'numero de telephone',
    'phone number',
  ],
  email: ['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse mail'],
  website: ['website', 'site', 'site web', 'site internet', 'url', 'web'],
  city: ['city', 'ville', 'commune', 'localite'],
  postal_code: ['postal code', 'code postal', 'cp', 'zip', 'zipcode', 'code_postal'],
  sector: [
    'sector',
    'secteur',
    'activite',
    'secteur activite',
    'categorie',
    'metier',
    'branche',
    'type',
  ],
  address: ['address', 'adresse', 'rue', 'adresse postale'],
  ca_estime: [
    'ca',
    'ca estime',
    'chiffre affaires',
    'chiffre d affaires',
    'ca_estime',
    'budget',
    'ca estimatif',
  ],
  notes: ['notes', 'note', 'commentaire', 'commentaires', 'remarque', 'remarques', 'observation'],
};

/** Detecte le delimiteur le plus probable sur la 1re ligne. */
function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
  };
  let best = ',';
  let bestN = -1;
  for (const [d, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = d;
      bestN = n;
    }
  }
  return best;
}

/** Parse un texte CSV en tableau de cellules (gere guillemets + \n internes). */
function parseRows(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignore (les fins de ligne CRLF sont gerees par le \n)
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type CsvMapping = {
  headers: string[];
  /** index de colonne -> champ prospect (ou null si non mappe). */
  mapped: (keyof ImportRowInput | null)[];
  rows: ImportRowInput[];
  /** champs prospects reconnus dans l'en-tete. */
  recognized: (keyof ImportRowInput)[];
  /** en-tetes non reconnus (ignores). */
  ignored: string[];
};

const EMPTY_MAPPING: CsvMapping = {
  headers: [],
  mapped: [],
  rows: [],
  recognized: [],
  ignored: [],
};

function matchField(header: string): keyof ImportRowInput | null {
  const nh = norm(header);
  if (!nh) return null;
  // 1. correspondance exacte
  for (const field of IMPORT_FIELDS) {
    if (FIELD_ALIASES[field].some((a) => a === nh)) return field;
  }
  // 2. correspondance partielle, uniquement sur des alias longs (>= 5 car.)
  //    pour eviter les faux positifs des alias courts (nom, tel, cp, ca...).
  for (const field of IMPORT_FIELDS) {
    if (FIELD_ALIASES[field].some((a) => a.length >= 5 && nh.includes(a))) return field;
  }
  return null;
}

/** Parse + mappe un texte CSV vers des lignes prospects pretes a importer. */
export function mapCsv(text: string): CsvMapping {
  const clean = (text ?? '').replace(/^﻿/, '');
  if (!clean.trim()) return EMPTY_MAPPING;
  const delim = detectDelimiter(clean.split('\n')[0] ?? '');
  const all = parseRows(clean, delim).filter((r) => r.some((c) => c.trim() !== ''));
  if (all.length === 0) return EMPTY_MAPPING;

  const headers = all[0].map((h) => h.trim());
  const mapped = headers.map((h) => matchField(h));
  const recognized = Array.from(
    new Set(mapped.filter((m): m is keyof ImportRowInput => m !== null))
  );
  const ignored = headers.filter((_, i) => mapped[i] === null);

  const rows: ImportRowInput[] = [];
  for (let r = 1; r < all.length; r++) {
    const cells = all[r];
    const obj: ImportRowInput = {
      company_name: null,
      contact_name: null,
      phone: null,
      email: null,
      website: null,
      city: null,
      postal_code: null,
      sector: null,
      address: null,
      ca_estime: null,
      notes: null,
    };
    for (let c = 0; c < headers.length; c++) {
      const field = mapped[c];
      if (!field) continue;
      const v = (cells[c] ?? '').trim();
      if (v && !obj[field]) obj[field] = v;
    }
    rows.push(obj);
  }
  return { headers, mapped, rows, recognized, ignored };
}
