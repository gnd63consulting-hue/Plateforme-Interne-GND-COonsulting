/**
 * Types et helpers pour les cahiers des charges du Studio (`public.site_brief`,
 * migration 0032) et la lecture de la maquette associee (`public.site_mockups`,
 * migration 0034). Mirroir de style de src/lib/site-mockup.ts.
 *
 * Flux Phase 4 : le bouton "Generer une maquette" de la fiche prospect insere
 * une ligne site_brief avec status 'requested'. Le watcher Studio (Metis/Dedale)
 * cote VPS Hermes consomme les 'requested', produit la maquette dans
 * site_mockups, puis passe le brief en 'done'.
 *
 * Cloisonnement : aucune donnee financiere ici. budget_tier est un simple
 * calibrage S/M/L derive du signal ca_estime (capacite), jamais du deal signe.
 */

import { MOCKUP_SELECT_COLUMNS, type MockupRow } from '@/lib/site-mockup';

export type SiteBriefStatus =
  | 'requested'
  | 'done'
  | 'draft'
  | 'ready'
  | 'built'
  | 'discarded';

export type BudgetTier = 'S' | 'M' | 'L';

export type SiteBriefRow = {
  id: string;
  prospect_id: string;
  budget_tier: string | null;
  status: SiteBriefStatus | string;
  payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const SITE_BRIEF_SELECT_COLUMNS =
  'id, prospect_id, budget_tier, status, payload, created_by, created_at, updated_at';

/** Etats du brief qui signifient "deja dans la file" : ne pas re-demander. */
export const ACTIVE_BRIEF_STATUSES: SiteBriefStatus[] = ['requested', 'done'];

/**
 * Client Supabase minimal attendu par les fetchers ci-dessous. On evite de
 * dependre du type genere : un objet `from(...).select(...)...` suffit, comme
 * le reste du code app (cf. page serveur de la fiche 360).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/**
 * Renvoie le brief "actif" le plus recent d'un prospect (status requested/done),
 * ou null. Sert a piloter le bouton de la fiche (anti-doublon + etat en cours).
 * RLS admin (0032) : un non-admin lit null, ce qui est sans risque cote UI.
 */
export async function getSiteBriefForProspect(
  supabase: SupabaseLike,
  prospectId: string
): Promise<SiteBriefRow | null> {
  const { data } = await supabase
    .from('site_brief')
    .select(SITE_BRIEF_SELECT_COLUMNS)
    .eq('prospect_id', prospectId)
    .in('status', ACTIVE_BRIEF_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1);
  return ((data?.[0] ?? null) as SiteBriefRow | null) ?? null;
}

/**
 * Renvoie la maquette la plus recente d'un prospect (site_mockups), ou null.
 * Lisible par tout authentifie (migration 0035).
 */
export async function getMockupForProspect(
  supabase: SupabaseLike,
  prospectId: string
): Promise<MockupRow | null> {
  const { data } = await supabase
    .from('site_mockups')
    .select(MOCKUP_SELECT_COLUMNS)
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(1);
  return ((data?.[0] ?? null) as MockupRow | null) ?? null;
}

/** Un brief est "en cours" tant que le watcher ne l'a pas traite. */
export function isBriefPending(s?: string | null): boolean {
  return s === 'requested';
}

export function briefStatusLabel(s?: string | null): string {
  switch (s) {
    case 'requested':
      return 'Maquette en cours';
    case 'done':
      return 'Maquette livree';
    case 'draft':
      return 'Brouillon';
    case 'ready':
      return 'Prete';
    case 'built':
      return 'Construite';
    case 'discarded':
      return 'Abandonnee';
    default:
      return s ?? '--';
  }
}

/**
 * Derive le calibrage budget S/M/L a partir du signal ca_estime du prospect
 * (chaine libre Notion, ex "50k-100k", "Moins de 50 000 EUR", "> 1M"). Heuristique
 * volontairement prudente : si on ne sait pas, on calibre 'S' (le plus modeste).
 * Ce n'est PAS le deal signe (joyau scelle), juste un signal de capacite.
 */
export function deriveBudgetTier(caEstime?: string | null): BudgetTier {
  if (!caEstime) return 'S';
  const raw = caEstime.toLowerCase();

  // Extrait le plus grand nombre present (en gerant les suffixes k / m / millions).
  const matches = raw.matchAll(/(\d+(?:[.,]\d+)?)\s*(m(?:illion)?|k|000)?/g);
  let maxEuros = 0;
  for (const m of matches) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (Number.isNaN(n)) continue;
    const unit = m[2];
    let euros = n;
    if (unit === 'k') euros = n * 1_000;
    else if (unit && unit.startsWith('m')) euros = n * 1_000_000;
    else if (unit === '000') euros = n * 1_000;
    if (euros > maxEuros) maxEuros = euros;
  }

  if (maxEuros >= 1_000_000) return 'L';
  if (maxEuros >= 200_000) return 'M';
  return 'S';
}
