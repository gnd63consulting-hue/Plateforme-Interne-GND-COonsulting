/**
 * Helpers for the `ca_estime` Notion field.
 *
 * Notion stores estimates as labelled ranges (e.g. "800-2500€",
 * "De 100k€ à 500k€"). To compute pipeline-wide CA stats we map each
 * range to its midpoint as a number of euros. Unknown labels return null
 * so the caller can skip the prospect from the total.
 */

const CA_MIDPOINTS_EUR: Record<string, number> = {
  // Plages "prix de service GND" (TPE/PME locales — la majorité du pipeline)
  '500-1000€': 750,
  '800-1000€': 900,
  '800-2500€': 1650,
  '1000-2500€': 1750,

  // Plages "CA entreprise prospect" (héritées de versions antérieures du
  // schéma ; pas le bon prisme pour calculer le CA potentiel GND mais on
  // les map quand même par cohérence)
  'Moins de 100k€': 50_000,
  'De 100k€ à 500k€': 300_000,
  'De 500k€ à 1M€': 750_000,
  'De 1M€ à 5M€': 3_000_000,
  'De 5M€ à 10M€': 7_500_000,
  'Plus de 10M€': 10_000_000,
};

/** Returns the midpoint € amount for a `ca_estime` label, or null if
 *  the label isn't recognised. */
export function caEstimeToMidpointEur(
  caEstime: string | null | undefined
): number | null {
  if (!caEstime) return null;
  return CA_MIDPOINTS_EUR[caEstime.trim()] ?? null;
}

/** Sums the midpoint CA across an array of prospects, skipping any
 *  whose `ca_estime` is empty or unknown. */
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
