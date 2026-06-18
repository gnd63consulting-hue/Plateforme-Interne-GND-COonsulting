/**
 * Types et helpers pour l'intel d'enrichissement ecrite par Atlas (cascade FR)
 * dans `public.prospect_intel` (migration 0025).
 *
 * La table stocke un payload JSONB par ligne ; le schema produit par la cascade
 * FR est `atlas.fr_cascade.v1` (cf. /data/tools/local_fr_enrich_mcp.py cote VPS
 * Hermes). La table est APPEND-ONLY : un meme prospect peut avoir plusieurs
 * lignes (re-traitements). Cote app on lit TOUJOURS la plus recente.
 *
 * Cloisonnement : ce payload ne contient AUCUNE donnee financiere (le montant
 * vit dans prospect_finance, RLS admin-only). Lisible par les commerciaux via
 * la policy de la migration 0028 (scopee a leurs prospects).
 */

export type EnrichmentConfidence = Record<string, string> & { overall?: string };

export type PresenceDigitale = {
  site?: boolean | null;
  techno?: string | null;
  mobile?: boolean | null;
  https?: boolean | null;
  social_actif?: boolean | null;
};

export type EnrichmentPayload = {
  schema_version?: string | null;
  status?: string | null; // 'enrichi' | 'a_verifier_humain'
  dirigeant_nom?: string | null;
  dirigeant_role?: string | null;
  email_value?: string | null;
  email_status?: string | null; // 'valid' | 'risky' | 'catch-all' | 'invalid' | 'unknown'
  tel_value?: string | null;
  siret?: string | null;
  naf_secteur?: string | null;
  taille_effectif?: string | null;
  anciennete?: string | null;
  ville?: string | null;
  presence_digitale?: PresenceDigitale | null;
  signal_detecte?: string | null;
  angle_gnd?: string | null;
  source_urls?: string[] | null;
  confidence?: EnrichmentConfidence | null;
  fraicheur?: unknown;
};

export type ProspectIntelRow = {
  prospect_id: string;
  payload: EnrichmentPayload | null;
  source: string | null;
  created_at: string;
};

export const INTEL_SELECT_COLUMNS = 'prospect_id, payload, source, created_at';

export type LatestEnrichment = EnrichmentPayload & { _created_at: string };

/**
 * Reduit une liste de lignes prospect_intel (triees created_at DESC en amont)
 * a la ligne la PLUS RECENTE par prospect. Append-only -> on garde la 1ere vue.
 */
export function latestEnrichmentByProspect(
  rows: ProspectIntelRow[]
): Map<string, LatestEnrichment> {
  const map = new Map<string, LatestEnrichment>();
  for (const r of rows) {
    if (!r.payload) continue;
    if (map.has(r.prospect_id)) continue; // deja la plus recente (tri DESC)
    map.set(r.prospect_id, { ...r.payload, _created_at: r.created_at });
  }
  return map;
}

export function isEnrichi(p?: EnrichmentPayload | null): boolean {
  return p?.status === 'enrichi';
}

export function statusTone(status?: string | null): string {
  return status === 'enrichi'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-800';
}
export function statusLabel(status?: string | null): string {
  if (status === 'enrichi') return 'Enrichi';
  if (status === 'a_verifier_humain') return 'A verifier';
  return '--';
}

export function emailStatusTone(status?: string | null): string {
  switch (status) {
    case 'valid':
      return 'bg-emerald-100 text-emerald-700';
    case 'risky':
      return 'bg-amber-100 text-amber-800';
    case 'catch-all':
      return 'bg-orange-100 text-orange-700';
    case 'invalid':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}
export function emailStatusLabel(status?: string | null): string {
  switch (status) {
    case 'valid':
      return 'Email verifie';
    case 'risky':
      return 'Email risque';
    case 'catch-all':
      return 'Catch-all';
    case 'invalid':
      return 'Email invalide';
    default:
      return 'Non verifie';
  }
}

export function confidenceTone(level?: string | null): string {
  switch (level) {
    case 'high':
      return 'bg-emerald-100 text-emerald-700';
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    case 'low':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/** Nettoie un numero pour un lien tel: (garde + et chiffres). */
export function telHref(tel?: string | null): string | null {
  if (!tel) return null;
  const cleaned = tel.replace(/[^+0-9]/g, '');
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}
