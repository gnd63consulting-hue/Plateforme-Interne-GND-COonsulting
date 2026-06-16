import { describe, it, expect } from 'vitest';
import {
  round2,
  lineTotalHt,
  computeQuoteTotals,
  buildQuoteNumero,
  formatEurExact,
  type QuoteLineInput,
} from '@/lib/finance';

const line = (
  quantite: number,
  prix_unitaire_ht: number,
  designation = 'Prestation'
): QuoteLineInput => ({ designation, quantite, prix_unitaire_ht });

describe('round2', () => {
  it('arrondit à 2 décimales', () => {
    expect(round2(41.999999)).toBe(42);
    expect(round2(1.236)).toBe(1.24);
    expect(round2(1.004)).toBe(1);
  });

  it('retourne 0 pour les valeurs non finies', () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(Infinity)).toBe(0);
  });
});

describe('lineTotalHt', () => {
  it('multiplie quantité × PU HT', () => {
    expect(lineTotalHt(line(3, 100))).toBe(300);
    expect(lineTotalHt(line(2, 49.995))).toBe(99.99);
  });

  it('traite quantité/PU manquants comme 0', () => {
    expect(lineTotalHt(line(0, 100))).toBe(0);
    // @ts-expect-error — on vérifie la robustesse au runtime sur des champs vides
    expect(lineTotalHt({ designation: 'x' })).toBe(0);
  });
});

describe('computeQuoteTotals', () => {
  it('retourne des totaux nuls pour 0 ligne', () => {
    expect(computeQuoteTotals([], 20)).toEqual({
      montant_ht: 0,
      montant_tva: 0,
      montant_ttc: 0,
    });
  });

  it('calcule HT / TVA / TTC sur une ligne simple', () => {
    expect(computeQuoteTotals([line(1, 1000)], 20)).toEqual({
      montant_ht: 1000,
      montant_tva: 200,
      montant_ttc: 1200,
    });
  });

  it('additionne plusieurs lignes', () => {
    const totals = computeQuoteTotals([line(2, 500), line(1, 250)], 20);
    expect(totals.montant_ht).toBe(1250);
    expect(totals.montant_tva).toBe(250);
    expect(totals.montant_ttc).toBe(1500);
  });

  it('gère un taux de TVA à 0 %', () => {
    expect(computeQuoteTotals([line(1, 800)], 0)).toEqual({
      montant_ht: 800,
      montant_tva: 0,
      montant_ttc: 800,
    });
  });

  it('gère un taux de TVA réduit (10 %) avec arrondi', () => {
    const totals = computeQuoteTotals([line(1, 99.99)], 10);
    expect(totals.montant_ht).toBe(99.99);
    expect(totals.montant_tva).toBe(10); // 9.999 → 10.00
    expect(totals.montant_ttc).toBe(109.99);
  });

  it('traite un tvaRate manquant comme 0', () => {
    // @ts-expect-error — tvaRate volontairement omis pour vérifier le fallback
    expect(computeQuoteTotals([line(1, 100)]).montant_tva).toBe(0);
  });
});

describe('buildQuoteNumero', () => {
  it('construit DEV-<année>-<6 chars> à partir de l’uuid', () => {
    expect(buildQuoteNumero('abcdef12-3456-7890-abcd-ef1234567890', '2026-06-16')).toBe(
      'DEV-2026-ABCDEF'
    );
  });

  it('déduit l’année de la date de création', () => {
    expect(buildQuoteNumero('11112222-3333-4444-5555-666677778888', '2025-01-02')).toBe(
      'DEV-2025-111122'
    );
  });
});

describe('formatEurExact', () => {
  it('formate avec 2 décimales et le symbole €', () => {
    const out = formatEurExact(1234.5);
    expect(out).toContain('€');
    expect(out).toMatch(/1[\s  ]?234,50/);
  });

  it('formate 0 pour une valeur non finie', () => {
    expect(formatEurExact(NaN)).toMatch(/0,00/);
  });
});
