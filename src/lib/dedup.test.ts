import { describe, it, expect } from 'vitest';
import {
  phoneKey9,
  signatureFor,
  completenessScore,
  pickMaster,
  buildDedupGroups,
  type DedupProspect,
} from '@/lib/dedup';

const base = (over: Partial<DedupProspect> & { id: string }): DedupProspect => ({
  id: over.id,
  company_name: over.company_name ?? 'ACME',
  contact_name: over.contact_name ?? null,
  email: over.email ?? null,
  phone: over.phone ?? null,
  city: over.city ?? null,
  status: over.status ?? 'a_contacter',
  assigned_to: over.assigned_to ?? null,
  notes: over.notes ?? null,
  next_action_at: over.next_action_at ?? null,
  created_at: over.created_at ?? '2026-01-01T00:00:00.000Z',
});

describe('phoneKey9', () => {
  it('retourne les 9 derniers chiffres', () => {
    expect(phoneKey9('+33 6 12 34 56 78')).toBe('612345678');
    expect(phoneKey9('0033612345678')).toBe('612345678');
  });

  it('retourne null si null/vide ou < 9 chiffres', () => {
    expect(phoneKey9(null)).toBeNull();
    expect(phoneKey9(undefined)).toBeNull();
    expect(phoneKey9('12345')).toBeNull();
  });
});

describe('signatureFor', () => {
  it('préfixe la clé par le critère', () => {
    expect(signatureFor('email', 'a@b.fr')).toBe('email:a@b.fr');
    expect(signatureFor('phone', '612345678')).toBe('phone:612345678');
  });
});

describe('completenessScore', () => {
  it('croît avec les champs renseignés', () => {
    const empty = base({ id: '1' });
    const full = base({
      id: '2',
      email: 'a@b.fr',
      phone: '0612345678',
      contact_name: 'Jean',
      city: 'Paris',
      notes: 'note',
      next_action_at: '2026-02-01T00:00:00.000Z',
      assigned_to: 'u1',
    });
    expect(completenessScore(empty)).toBe(0);
    expect(completenessScore(full)).toBeGreaterThan(completenessScore(empty));
  });

  it('pondère les notes plus fort (2 points)', () => {
    const withNote = base({ id: '1', notes: 'quelque chose' });
    const withEmail = base({ id: '2', email: 'a@b.fr' });
    expect(completenessScore(withNote)).toBe(2);
    expect(completenessScore(withEmail)).toBe(1);
  });

  it('ignore une note vide / espaces', () => {
    expect(completenessScore(base({ id: '1', notes: '   ' }))).toBe(0);
  });
});

describe('pickMaster', () => {
  it('choisit la fiche la plus complète', () => {
    const a = base({ id: 'a' });
    const b = base({ id: 'b', email: 'b@x.fr', notes: 'riche' });
    expect(pickMaster([a, b])).toBe('b');
  });

  it('départage à complétude égale par ancienneté', () => {
    const older = base({ id: 'old', email: 'x@x.fr', created_at: '2025-01-01T00:00:00.000Z' });
    const newer = base({ id: 'new', email: 'y@y.fr', created_at: '2026-01-01T00:00:00.000Z' });
    expect(pickMaster([newer, older])).toBe('old');
  });
});

describe('buildDedupGroups', () => {
  // Triage « entreprises différentes » (cf. dedup.ts) : un groupe n'est remonté
  // que s'il couvre 2+ noms de sociétés DISTINCTS partageant le même email/tél.
  // Les fixtures ci-dessous utilisent donc des sociétés distinctes.
  it('regroupe par email_norm exact (≥ 2 fiches)', () => {
    const rows = [
      { ...base({ id: '1', email: 'a@x.fr', company_name: 'Salon Lea' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '2', email: 'a@x.fr', company_name: 'Patisserie Max' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '3', email: 'b@x.fr', company_name: 'Autre' }), email_norm: 'b@x.fr', phone_norm: null },
    ];
    const groups = buildDedupGroups(rows, new Set());
    expect(groups).toHaveLength(1);
    expect(groups[0].criterion).toBe('email');
    expect(groups[0].signature).toBe('email:a@x.fr');
    expect(groups[0].prospects.map((p) => p.id).sort()).toEqual(['1', '2']);
  });

  it('regroupe par 9 derniers chiffres de phone_norm', () => {
    const rows = [
      { ...base({ id: '1', phone: '+33612345678', company_name: 'Salon Lea' }), email_norm: null, phone_norm: '+33612345678' },
      { ...base({ id: '2', phone: '0612345678', company_name: 'Patisserie Max' }), email_norm: null, phone_norm: '0612345678' },
    ];
    const groups = buildDedupGroups(rows, new Set());
    expect(groups).toHaveLength(1);
    expect(groups[0].criterion).toBe('phone');
    expect(groups[0].signature).toBe('phone:612345678');
  });

  it('ne remonte PAS un groupe d\'une même société (même email/tél, 1 seule entreprise)', () => {
    const rows = [
      { ...base({ id: '1', email: 'a@x.fr', company_name: 'ACME' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '2', email: 'a@x.fr', company_name: 'ACME' }), email_norm: 'a@x.fr', phone_norm: null },
    ];
    expect(buildDedupGroups(rows, new Set())).toHaveLength(0);
  });

  it('exclut les signatures dismissed', () => {
    const rows = [
      { ...base({ id: '1', email: 'a@x.fr', company_name: 'Salon Lea' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '2', email: 'a@x.fr', company_name: 'Patisserie Max' }), email_norm: 'a@x.fr', phone_norm: null },
    ];
    const groups = buildDedupGroups(rows, new Set(['email:a@x.fr']));
    expect(groups).toHaveLength(0);
  });

  it('ignore les groupes singletons', () => {
    const rows = [
      { ...base({ id: '1', email: 'solo@x.fr', company_name: 'Solo' }), email_norm: 'solo@x.fr', phone_norm: null },
    ];
    expect(buildDedupGroups(rows, new Set())).toHaveLength(0);
  });

  it('trie les groupes par taille décroissante', () => {
    const rows = [
      { ...base({ id: '1', email: 'a@x.fr', company_name: 'Salon Lea' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '2', email: 'a@x.fr', company_name: 'Patisserie Max' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '3', email: 'a@x.fr', company_name: 'Garage Tom' }), email_norm: 'a@x.fr', phone_norm: null },
      { ...base({ id: '4', email: 'b@x.fr', company_name: 'Fleuriste Iris' }), email_norm: 'b@x.fr', phone_norm: null },
      { ...base({ id: '5', email: 'b@x.fr', company_name: 'Boucherie Paul' }), email_norm: 'b@x.fr', phone_norm: null },
    ];
    const groups = buildDedupGroups(rows, new Set());
    expect(groups.map((g) => g.prospects.length)).toEqual([3, 2]);
  });
});
