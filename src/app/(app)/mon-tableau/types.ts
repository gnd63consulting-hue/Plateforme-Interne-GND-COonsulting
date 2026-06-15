/**
 * Types & constantes PARTAGÉS du tableau de bord commercial personnel.
 *
 * Ce module est volontairement PUR : il n'importe rien de server-only
 * (pas de `@/lib/supabase-server`, pas de `next/headers`). Il peut donc être
 * importé indifféremment par le server component (`page.tsx`) et par le client
 * component (`MonTableauClient.tsx`) sans tirer de code serveur dans le bundle
 * client.
 *
 * Auparavant ces définitions vivaient dans `page.tsx`, ce qui forçait
 * `MonTableauClient` ("use client") à importer depuis `./page` — et donc à
 * embarquer transitivement `supabase-server` (`next/headers`), cassant le build
 * Vercel.
 */

/** Paliers bonus officiels (identiques à l'onboarding commercial). */
export const BONUS_TIERS = [
  { contrats: 20, bonus: 250 },
  { contrats: 25, bonus: 500 },
  { contrats: 30, bonus: 750 },
] as const;

export type StatusBreakdownEntry = {
  status: string;
  label: string;
  tone: string;
  count: number;
  /** Valeur GND (prix service) cumulée pour ce statut, en €. */
  valeur: number;
};

export type RecentActivityEntry = {
  id: string;
  kind: string;
  body: string | null;
  occurred_at: string;
  company: string | null;
};

export type MonTableauData = {
  prenom: string;
  commissionRate: number | null; // décimal (0.10 = 10%)
  commissionPct: number | null; // entier %
  // Pipeline
  prospectsTotal: number; // tous prospects scopés
  pipelineActifCount: number; // prospects encore en jeu
  statusBreakdown: StatusBreakdownEntry[];
  // CA
  caPotentiel: number; // € — pipeline en cours (prix service GND, estimé)
  caRealise: number; // € — signatures (prix service GND, estimé via ca_estime)
  // Commission ESTIMÉE (depuis ca_estime, prisme prix service GND)
  commissionEstimeeRealisee: number; // € — estimée sur les signatures
  commissionPotentielle: number; // € — estimée sur le pipeline en cours
  // Commission RÉELLE (table commissions, Sprint 8 — montant signé × taux figé)
  commissionReelleAPayer: number; // € — commissions statut 'a_payer'
  commissionReellePayee: number; // € — commissions statut 'paye'
  commissionReelleTotale: number; // € — à payer + payée (réalisée)
  commissionsCount: number; // nb de lignes de commission
  // Signatures / paliers
  signatures: number; // nb prospects 'gagne'
  // Relances
  relancesEnRetard: number;
  relancesAujourdhui: number;
  // Activité
  activites: RecentActivityEntry[];
};
