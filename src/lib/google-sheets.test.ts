import { describe, it, expect } from 'vitest';
import { sanitizeTabTitle } from '@/lib/google-sheets';

describe('sanitizeTabTitle', () => {
  it('retire les caractères interdits par Google Sheets', () => {
    expect(sanitizeTabTitle('Jean: Dupont / [Paris]')).toBe('Jean Dupont Paris');
    expect(sanitizeTabTitle('a\\b?c*d')).toBe('a b c d');
  });

  it('compacte les espaces multiples', () => {
    expect(sanitizeTabTitle('trop    d   espaces')).toBe('trop d espaces');
  });

  it('tronque à 100 caractères', () => {
    const long = 'x'.repeat(150);
    expect(sanitizeTabTitle(long).length).toBe(100);
  });

  it('retombe sur "Sans nom" si tout est retiré', () => {
    expect(sanitizeTabTitle(':::')).toBe('Sans nom');
    expect(sanitizeTabTitle('   ')).toBe('Sans nom');
    expect(sanitizeTabTitle('')).toBe('Sans nom');
  });

  it('tolère une entrée null/undefined au runtime', () => {
    // @ts-expect-error — robustesse runtime sur entrée nulle
    expect(sanitizeTabTitle(null)).toBe('Sans nom');
    // @ts-expect-error — robustesse runtime sur entrée undefined
    expect(sanitizeTabTitle(undefined)).toBe('Sans nom');
  });
});
