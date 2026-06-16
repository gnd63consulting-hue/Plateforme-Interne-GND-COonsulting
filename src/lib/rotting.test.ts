import { describe, it, expect } from 'vitest';
import { evaluateRotting, ROT_DAYS_THRESHOLD } from '@/lib/rotting';

const DAY_MS = 86_400_000;
const NOW = Date.parse('2026-06-16T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW - n * DAY_MS).toISOString();
const inDays = (n: number) => new Date(NOW + n * DAY_MS).toISOString();

describe('evaluateRotting', () => {
  it('considère un prospect actif frais comme non pourri', () => {
    const info = evaluateRotting(
      { status: 'a_contacter', updated_at: daysAgo(1), next_action_at: inDays(3) },
      NOW
    );
    expect(info.rotten).toBe(false);
    expect(info.reason).toBeNull();
  });

  it('marque "overdue" quand la relance est dépassée', () => {
    const info = evaluateRotting(
      { status: 'contacte', updated_at: daysAgo(1), next_action_at: daysAgo(1) },
      NOW
    );
    expect(info.rotten).toBe(true);
    expect(info.overdue).toBe(true);
    expect(info.reason).toBe('Relance en retard');
  });

  it('marque "stale" au-delà du seuil d’inactivité', () => {
    const info = evaluateRotting(
      { status: 'en_discussion', updated_at: daysAgo(ROT_DAYS_THRESHOLD + 2), next_action_at: null },
      NOW
    );
    expect(info.rotten).toBe(true);
    expect(info.stale).toBe(true);
    expect(info.daysIdle).toBe(ROT_DAYS_THRESHOLD + 2);
    expect(info.reason).toBe(`${ROT_DAYS_THRESHOLD + 2} jours sans activité`);
  });

  it('n’est PAS stale juste sous le seuil', () => {
    const info = evaluateRotting(
      { status: 'contacte', updated_at: daysAgo(ROT_DAYS_THRESHOLD - 1), next_action_at: null },
      NOW
    );
    expect(info.rotten).toBe(false);
    expect(info.stale).toBe(false);
  });

  it('est stale pile au seuil (>=)', () => {
    const info = evaluateRotting(
      { status: 'contacte', updated_at: daysAgo(ROT_DAYS_THRESHOLD), next_action_at: null },
      NOW
    );
    expect(info.stale).toBe(true);
  });

  it('priorise "Relance en retard" sur l’inactivité', () => {
    const info = evaluateRotting(
      {
        status: 'contacte',
        updated_at: daysAgo(ROT_DAYS_THRESHOLD + 5),
        next_action_at: daysAgo(2),
      },
      NOW
    );
    expect(info.overdue).toBe(true);
    expect(info.stale).toBe(true);
    expect(info.reason).toBe('Relance en retard');
  });

  it('ne pourrit jamais un prospect en colonne morte', () => {
    const info = evaluateRotting(
      { status: 'perdu', updated_at: daysAgo(100), next_action_at: daysAgo(50) },
      NOW
    );
    expect(info.rotten).toBe(false);
  });

  it('ne pourrit jamais un prospect gagné (sortie gagne)', () => {
    const info = evaluateRotting(
      { status: 'gagne', updated_at: daysAgo(100), next_action_at: daysAgo(50) },
      NOW
    );
    expect(info.rotten).toBe(false);
  });

  it('gère updated_at null (daysIdle = 0, non pourri sans relance)', () => {
    const info = evaluateRotting(
      { status: 'a_contacter', updated_at: null, next_action_at: null },
      NOW
    );
    expect(info.rotten).toBe(false);
    expect(info.daysIdle).toBe(0);
  });

  it('clampe daysIdle à 0 pour un updated_at dans le futur', () => {
    const info = evaluateRotting(
      { status: 'contacte', updated_at: inDays(5), next_action_at: null },
      NOW
    );
    expect(info.daysIdle).toBe(0);
    expect(info.stale).toBe(false);
  });
});
