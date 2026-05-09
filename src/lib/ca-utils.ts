/**
 * Helpers for the `ca_estime` Notion field.
 *
 * Notion stores estimates as labelled ranges. Two distinct prisms coexist
 * in the data, and they MUST NOT be summed together:
 *
 *  1. GND service price ranges (e.g. "800-2500€", "1000-2500€"):
 *     these represent how much GND would invoice that prospect for a site.
 *     Mapped via GND_PRICE_MIDPOINTS_EUR. Used to compute the GND pipeline
 *     potential — the only meaningful "potential CA" from GND's perspective.
 *
 *  2. Prospect company CA ranges (e.g. "Moins de 100k€", "De 1M€ à 5M€"):
 *     these represent the prospect's own annual revenue (legacy schema).
 *     Mapped via PROSPECT_COMPANY_CA_MIDPOINTS_EUR. Used as a qualification
 *     proxy (signal of the prospect's capacity to pay) — never as a GND
 *     pipeline figure.
 *
 * Historical bug: the legacy `CA_MIDPOINTS_EUR` mapping merged both prisms
 * into a single object, and `sumCaMidpointEur` summed everything together.
 * On a ~640-prospect pipeline this produced ~39M€ figures (the cumulative
 * annual revenue of all prospect companies), which is meaningless for GND.
 *
 * Use `sumCaMidpointGndPriceEur` for any funder-facing computation.
 */

/** GND service price ranges → midpoint € (what GND would invoice). */
const GND_PRICE_MIDPOINTS_EUR: Record<string, number> = {
  '500-1000€': 750,
  '800-1000€': 900,
  '800-2500€': 1650,
  '1000-2500€': 1750,
};

/** Prospect company annual CA ranges → midpoint € (legacy schema, used
 *  as a qualification proxy, NOT as GND pipeline). */
const PROSPECT_COMPANY_CA_MIDPOINTS_EUR: Record<string, number> = {
  'Moins de 100k€': 50_000,
  'De 100k€ à 500k€': 300_000,
  'De 500k€ à 1M€': 750_000,
  'De 1M€ à 5M€': 3_000_000,
  'De 5M€ à 10M€': 7_500_000,
  'Plus de 10M€': 10_000_000,
};

/** @deprecated Combines both prisms — kept for backwards compatibility only.
 *  Use sumCaMidpointGndPriceEur or sumCaMidpointEntrepriseEur instead. */
const CA_MIDPOINTS_EUR: Record<string, number> = {
  ...GND_PRICE_MIDPOINTS_EUR,
  ...PROSPECT_COMPANY_CA_MIDPOINTS_EUR,
};

/** Returns the GND service price midpoint € for a `ca_estime` label, or
 *  null if the label isn't a GND service price range. */
export function caEstimeToGndPriceMidpointEur(
  caEstime: string | null | undefined
): number | null {
  if (!caEstime) return null;
  return GND_PRICE_MIDPOINTS_EUR[caEstime.trim()] ?? null;
}

/** Returns the prospect company CA midpoint € for a `ca_estime` label,
 *  or null if the label isn't a prospect company CA range. */
export function caEstimeToCompanyCaMidpointEur(
  caEstime: string | null | undefined
): number | null {
  if (!caEstime) return null;
  return PROSPECT_COMPANY_CA_MIDPOINTS_EUR[caEstime.trim()] ?? null;
}

/** @deprecated Returns whichever midpoint matches (GND price or company CA),
 *  mixing the two prisms. Prefer caEstimeToGndPriceMidpointEur. */
export function caEstimeToMidpointEur(
  caEstime: string | null | undefined
): number | null {
  if (!caEstime) return null;
  return CA_MIDPOINTS_EUR[caEstime.trim()] ?? null;
}

/** Sums the GND service price midpoints across an array of prospects.
 *  This is the correct figure for "GND pipeline potential" — usable in
 *  funder dossiers, dashboards, and KPIs that represent revenue GND
 *  could realistically invoice. */
export function sumCaMidpointGndPriceEur(
  prospects: { ca_estime: string | null }[]
): number {
  let total = 0;
  for (const p of prospects) {
    const mid = caEstimeToGndPriceMidpointEur(p.ca_estime);
    if (mid != null) total += mid;
  }
  return total;
}

/** Sums the prospect company CA midpoints across an array of prospects.
 *  This is the addressable market size — useful as a qualification signal,
 *  NOT as a GND revenue figure. */
export function sumCaMidpointEntrepriseEur(
  prospects: { ca_estime: string | null }[]
): number {
  let total = 0;
  for (const p of prospects) {
    const mid = caEstimeToCompanyCaMidpointEur(p.ca_estime);
    if (mid != null) total += mid;
  }
  return total;
}

/** @deprecated Sums both prisms together — produces meaningless figures
 *  (e.g. ~39M€ on a 640-prospect pipeline). Use sumCaMidpointGndPriceEur
 *  for funder-facing pipeline values. Kept for backwards compat only. */
export function sumCaMidpointEur(
  prospects: { ca_estime: string | null }[]
): number {
  let total = 0;
  for (const p of prospects) {
    const mid = caEstimeToMidpointEur(p.ca_estime);
    if (mid != null) total += mid;
  }
  return total;
}

/** Format an amount (in €) for display: "1 750 €", "120 k€", "1.2 M€". */
export function formatEur(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} M€`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 1000)} k€`;
  }
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} €`;
}
