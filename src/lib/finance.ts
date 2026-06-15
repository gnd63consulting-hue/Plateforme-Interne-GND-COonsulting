/**
 * Types & helpers PURS du module financier interne (Sprint 8).
 *
 * ⚠️ MODULE PUR — il n'importe RIEN de server-only (`@/lib/supabase-server`,
 * `next/headers`, `supabase-admin`). Il peut donc être importé indifféremment
 * par un Server Component, une Server Action et un Client Component
 * (`"use client"`) sans tirer de code serveur dans le bundle client.
 *
 * Couvre 3 entités (cf. migration 0015_finance.sql) :
 *   - quotes        : en-tête de devis (totaux HT/TVA/TTC, statut, validité)
 *   - quote_lines   : lignes (désignation, qté, PU HT → total ligne)
 *   - commissions   : commission RÉELLE par commercial (base × taux figé)
 *
 * Sprint 11 : le devis porte en plus des références Stripe (facture hostee /
 * lien de paiement) — cf. migration 0017_stripe.sql.
 *
 * Le formatage € réexporte `formatEur` de ca-utils (lui aussi pur).
 */

import { formatEur } from '@/lib/ca-utils';

export { formatEur };

/* ====================================================================== */
/* Types                                                                   */
/* ====================================================================== */

/** Statut d'un devis. Aligné sur le CHECK SQL de 0015. */
export type QuoteStatut = 'brouillon' | 'envoye' | 'accepte' | 'refuse';

/** Statut d'une commission. Aligné sur le CHECK SQL de 0015. */
export type CommissionStatut = 'a_payer' | 'paye' | 'annule';

export type QuoteLine = {
  id: string;
  quote_id: string;
  position: number;
  designation: string;
  quantite: number;
  prix_unitaire_ht: number;
  total_ht: number;
};

export type Quote = {
  id: string;
  prospect_id: string | null;
  numero: string | null;
  statut: QuoteStatut | string; // string toléré pour des valeurs futures BDD
  montant_ht: number;
  tva_rate: number;
  montant_tva: number;
  montant_ttc: number;
  valid_until: string | null;
  notes: string | null;
  owner_id: string;
  created_at: string;
  // --- Stripe (Sprint 11, migration 0017) ---
  stripe_invoice_id: string | null;
  stripe_invoice_url: string | null;
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_status: string | null;
  paid_at: string | null;
};

/** Devis + ses lignes (jointure applicative pour l'éditeur / l'impression). */
export type QuoteWithLines = Quote & { lines: QuoteLine[] };

export type Commission = {
  id: string;
  prospect_id: string | null;
  commercial_id: string;
  base_amount: number;
  rate: number;
  amount: number; // généré BDD = base_amount * rate
  statut: CommissionStatut | string;
  paid_at: string | null;
  created_at: string;
};

/* ====================================================================== */
/* Colonnes SELECT                                                         */
/* ====================================================================== */

export const QUOTE_SELECT_COLUMNS = [
  'id',
  'prospect_id',
  'numero',
  'statut',
  'montant_ht',
  'tva_rate',
  'montant_tva',
  'montant_ttc',
  'valid_until',
  'notes',
  'owner_id',
  'created_at',
  'stripe_invoice_id',
  'stripe_invoice_url',
  'stripe_payment_link_id',
  'stripe_payment_link_url',
  'stripe_status',
  'paid_at',
].join(', ');

export const QUOTE_LINE_SELECT_COLUMNS = [
  'id',
  'quote_id',
  'position',
  'designation',
  'quantite',
  'prix_unitaire_ht',
  'total_ht',
].join(', ');

export const COMMISSION_SELECT_COLUMNS = [
  'id',
  'prospect_id',
  'commercial_id',
  'base_amount',
  'rate',
  'amount',
  'statut',
  'paid_at',
  'created_at',
].join(', ');

/* ====================================================================== */
/* Labels                                                                  */
/* ====================================================================== */

const QUOTE_STATUT_META: Record<
  QuoteStatut,
  { label: string; tone: string }
> = {
  brouillon: { label: 'Brouillon', tone: 'bg-slate-100 text-slate-700' },
  envoye: { label: 'Envoyé', tone: 'bg-amber-100 text-amber-700' },
  accepte: { label: 'Accepté', tone: 'bg-emerald-100 text-emerald-700' },
  refuse: { label: 'Refusé', tone: 'bg-rose-100 text-rose-700' },
};

export const QUOTE_STATUT_OPTIONS: { value: QuoteStatut; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'envoye', label: 'Envoyé' },
  { value: 'accepte', label: 'Accepté' },
  { value: 'refuse', label: 'Refusé' },
];

export function labelForQuoteStatut(statut: string | null | undefined): string {
  if (!statut) return '—';
  return QUOTE_STATUT_META[statut as QuoteStatut]?.label ?? statut;
}

export function toneForQuoteStatut(statut: string | null | undefined): string {
  if (!statut) return 'bg-slate-100 text-slate-700';
  return (
    QUOTE_STATUT_META[statut as QuoteStatut]?.tone ??
    'bg-slate-100 text-slate-700'
  );
}

const COMMISSION_STATUT_META: Record<CommissionStatut, string> = {
  a_payer: 'À payer',
  paye: 'Payé',
  annule: 'Annulé',
};

export function labelForCommissionStatut(
  statut: string | null | undefined
): string {
  if (!statut) return '—';
  return COMMISSION_STATUT_META[statut as CommissionStatut] ?? statut;
}

/* ====================================================================== */
/* Calculs devis (purs — utilisés côté éditeur ET côté serveur)            */
/* ====================================================================== */

/** Entrée minimale d'une ligne pour le recalcul (avant insert/persist). */
export type QuoteLineInput = {
  designation: string;
  quantite: number;
  prix_unitaire_ht: number;
};

/** Arrondi monétaire à 2 décimales (évite les flottants type 41.99999). */
export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** Total HT d'une ligne = quantité × PU HT (arrondi 2 décimales). */
export function lineTotalHt(line: QuoteLineInput): number {
  return round2((line.quantite || 0) * (line.prix_unitaire_ht || 0));
}

/**
 * Recalcule les totaux d'un devis à partir de ses lignes et du taux de TVA.
 * Retourne { montant_ht, montant_tva, montant_ttc } arrondis à 2 décimales.
 * Source de vérité unique du calcul, partagée éditeur ↔ persistance.
 */
export function computeQuoteTotals(
  lines: QuoteLineInput[],
  tvaRate: number
): { montant_ht: number; montant_tva: number; montant_ttc: number } {
  const montant_ht = round2(
    lines.reduce((sum, l) => sum + lineTotalHt(l), 0)
  );
  const montant_tva = round2(montant_ht * ((tvaRate || 0) / 100));
  const montant_ttc = round2(montant_ht + montant_tva);
  return { montant_ht, montant_tva, montant_ttc };
}

/* ====================================================================== */
/* Numéro de devis                                                         */
/* ====================================================================== */

/**
 * Génère un numéro de devis lisible : `DEV-<année>-<6 chars de l'uuid>`.
 * Déterministe à partir de l'id du devis (pas de compteur séquentiel BDD,
 * inutile pour un usage interne et évite une race condition).
 */
export function buildQuoteNumero(quoteId: string, createdAtIso?: string): string {
  const year = createdAtIso
    ? new Date(createdAtIso).getFullYear()
    : new Date().getFullYear();
  const short = quoteId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `DEV-${year}-${short}`;
}

/* ====================================================================== */
/* Formatage                                                               */
/* ====================================================================== */

/** Montant € exact (2 décimales) pour les documents officiels (devis). */
export function formatEurExact(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Date FR longue (ex. "15 juin 2026") — pour le devis imprimable. */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
