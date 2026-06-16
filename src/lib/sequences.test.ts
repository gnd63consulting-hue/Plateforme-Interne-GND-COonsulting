import { describe, it, expect } from 'vitest';
import {
  addDays,
  nextDueFrom,
  sortSteps,
  cadenceSummary,
  kindLabel,
  kindIcon,
  isEnrollmentOpen,
  enrollmentStatusLabel,
  type SequenceStep,
} from '@/lib/sequences';

const step = (position: number, delay_days: number): SequenceStep => ({
  id: `s${position}`,
  sequence_id: 'seq',
  position,
  kind: 'call',
  delay_days,
  title: `Étape ${position}`,
  template_body: null,
});

describe('addDays', () => {
  it('ajoute n jours (UTC-safe)', () => {
    const from = new Date('2026-06-16T00:00:00.000Z');
    expect(addDays(from, 5).toISOString()).toBe('2026-06-21T00:00:00.000Z');
  });
});

describe('nextDueFrom', () => {
  it('renvoie un ISO décalé du délai', () => {
    const from = new Date('2026-06-16T00:00:00.000Z');
    expect(nextDueFrom(2, from)).toBe('2026-06-18T00:00:00.000Z');
  });

  it('clampe les délais négatifs / non finis à 0', () => {
    const from = new Date('2026-06-16T00:00:00.000Z');
    expect(nextDueFrom(-5, from)).toBe('2026-06-16T00:00:00.000Z');
    expect(nextDueFrom(NaN, from)).toBe('2026-06-16T00:00:00.000Z');
  });
});

describe('sortSteps', () => {
  it('trie par position sans muter l’entrée', () => {
    const input = [step(2, 1), step(0, 0), step(1, 3)];
    const sorted = sortSteps(input);
    expect(sorted.map((s) => s.position)).toEqual([0, 1, 2]);
    expect(input.map((s) => s.position)).toEqual([2, 0, 1]); // intact
  });
});

describe('cadenceSummary', () => {
  it('cumule les délais relatifs en J+', () => {
    const steps = [step(0, 0), step(1, 2), step(2, 3), step(3, 4)];
    expect(cadenceSummary(steps)).toBe('4 étapes · J+0, J+2, J+5, J+9');
  });

  it('gère 0 étape', () => {
    expect(cadenceSummary([])).toBe('Aucune étape');
  });
});

describe('kindLabel / kindIcon', () => {
  it('renvoie le libellé FR connu', () => {
    expect(kindLabel('call')).toBe('Appel');
    expect(kindLabel('linkedin')).toBe('LinkedIn');
  });

  it('retombe sur la valeur brute pour un kind inconnu', () => {
    expect(kindLabel('webinar')).toBe('webinar');
    expect(kindIcon('webinar')).toBe('•');
  });
});

describe('isEnrollmentOpen / enrollmentStatusLabel', () => {
  it('actif et pausé sont ouverts', () => {
    expect(isEnrollmentOpen('active')).toBe(true);
    expect(isEnrollmentOpen('paused')).toBe(true);
    expect(isEnrollmentOpen('done')).toBe(false);
    expect(isEnrollmentOpen('stopped')).toBe(false);
  });

  it('libellé FR du statut, fallback brut sinon', () => {
    expect(enrollmentStatusLabel('done')).toBe('Terminée');
    expect(enrollmentStatusLabel('mystere')).toBe('mystere');
  });
});
