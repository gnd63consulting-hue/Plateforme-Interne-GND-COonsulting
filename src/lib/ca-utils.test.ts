import { describe, it, expect } from 'vitest';
import {
  caEstimeToGndPriceMidpointEur,
  caEstimeToCompanyCaMidpointEur,
  sumCaMidpointGndPriceEur,
  sumCaMidpointEntrepriseEur,
  formatEur,
} from '@/lib/ca-utils';

describe('caEstimeToGndPriceMidpointEur', () => {
  it('mappe une fourchette de prix GND vers son milieu', () => {
    expect(caEstimeToGndPriceMidpointEur('800-2500€')).toBe(1650);
    expect(caEstimeToGndPriceMidpointEur('1000-2500€')).toBe(1750);
  });

  it('trim les espaces autour du label', () => {
    expect(caEstimeToGndPriceMidpointEur('  500-1000€  ')).toBe(750);
  });

  it('retourne null pour un label hors barème GND', () => {
    expect(caEstimeToGndPriceMidpointEur('De 1M€ à 5M€')).toBeNull();
    expect(caEstimeToGndPriceMidpointEur(null)).toBeNull();
    expect(caEstimeToGndPriceMidpointEur('')).toBeNull();
  });
});

describe('caEstimeToCompanyCaMidpointEur', () => {
  it('mappe une fourchette de CA entreprise vers son milieu', () => {
    expect(caEstimeToCompanyCaMidpointEur('Moins de 100k€')).toBe(50_000);
    expect(caEstimeToCompanyCaMidpointEur('De 1M€ à 5M€')).toBe(3_000_000);
  });

  it('retourne null pour un label de prix GND', () => {
    expect(caEstimeToCompanyCaMidpointEur('800-2500€')).toBeNull();
  });
});

describe('sumCaMidpointGndPriceEur', () => {
  it('ne somme QUE les fourchettes de prix GND (pas le CA entreprise)', () => {
    const prospects = [
      { ca_estime: '800-2500€' }, // 1650
      { ca_estime: '500-1000€' }, // 750
      { ca_estime: 'De 1M€ à 5M€' }, // ignoré (CA entreprise)
      { ca_estime: null }, // ignoré
    ];
    expect(sumCaMidpointGndPriceEur(prospects)).toBe(2400);
  });

  it('retourne 0 sur une liste vide', () => {
    expect(sumCaMidpointGndPriceEur([])).toBe(0);
  });
});

describe('sumCaMidpointEntrepriseEur', () => {
  it('ne somme QUE les fourchettes de CA entreprise', () => {
    const prospects = [
      { ca_estime: 'Moins de 100k€' }, // 50 000
      { ca_estime: 'De 100k€ à 500k€' }, // 300 000
      { ca_estime: '800-2500€' }, // ignoré (prix GND)
    ];
    expect(sumCaMidpointEntrepriseEur(prospects)).toBe(350_000);
  });
});

describe('formatEur', () => {
  it('formate les millions en M€', () => {
    expect(formatEur(3_000_000)).toBe('3 M€');
    expect(formatEur(1_200_000)).toBe('1.2 M€');
  });

  it('formate les ≥ 10k en k€', () => {
    expect(formatEur(50_000)).toBe('50 k€');
  });

  it('formate les petits montants en € avec séparateur de milliers', () => {
    const out = formatEur(1750);
    expect(out).toContain('€');
    expect(out).toMatch(/1[\s  ]?750/);
  });
});
