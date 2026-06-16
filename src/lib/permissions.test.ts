import { describe, it, expect } from 'vitest';
import {
  presetFor,
  sanitizePerms,
  effectivePerms,
  allows,
  hasConsoleAccess,
  can,
} from '@/lib/permissions';

describe('presetFor', () => {
  it('donne un preset full à admin', () => {
    const p = presetFor('admin');
    expect(p.finance).toBe('edit');
    expect(p.members).toBe('edit');
  });

  it('limite l’assistant (finance none, pipeline edit)', () => {
    const p = presetFor('assistant');
    expect(p.pipeline).toBe('edit');
    expect(p.finance).toBe('none');
    expect(p.members).toBe('none');
  });

  it('ne donne que formation:view aux rôles terrain', () => {
    for (const role of ['commercial', 'freelance', 'stagiaire']) {
      const p = presetFor(role);
      expect(p.formation).toBe('view');
      expect(p.pipeline).toBe('none');
    }
  });

  it('retourne un objet vide pour un rôle inconnu / null', () => {
    expect(presetFor('inconnu')).toEqual({});
    expect(presetFor(null)).toEqual({});
    expect(presetFor(undefined)).toEqual({});
  });

  it('retourne une COPIE (pas la référence interne)', () => {
    const a = presetFor('admin');
    a.finance = 'none';
    expect(presetFor('admin').finance).toBe('edit');
  });
});

describe('sanitizePerms', () => {
  it('ne garde que les sections et niveaux valides', () => {
    const out = sanitizePerms({
      pipeline: 'edit',
      finance: 'view',
      bogus_section: 'edit',
      members: 'INVALID',
    });
    expect(out).toEqual({ pipeline: 'edit', finance: 'view' });
  });

  it('retourne {} pour une entrée non-objet', () => {
    expect(sanitizePerms(null)).toEqual({});
    expect(sanitizePerms('edit')).toEqual({});
    expect(sanitizePerms(42)).toEqual({});
  });
});

describe('effectivePerms', () => {
  it('renvoie le preset quand aucun override', () => {
    expect(effectivePerms('assistant', null)).toEqual(presetFor('assistant'));
  });

  it('fusionne l’override par-dessus le preset', () => {
    const eff = effectivePerms('assistant', { finance: 'view' });
    expect(eff.finance).toBe('view'); // override
    expect(eff.pipeline).toBe('edit'); // preset conservé
  });

  it('ignore un override vide (retourne le preset brut)', () => {
    expect(effectivePerms('admin', {})).toEqual(presetFor('admin'));
  });

  it('un override peut élever un rôle terrain sur une section', () => {
    const eff = effectivePerms('commercial', { pipeline: 'view' });
    expect(eff.pipeline).toBe('view');
    expect(allows(eff, 'pipeline', 'view')).toBe(true);
    expect(allows(eff, 'pipeline', 'edit')).toBe(false);
  });
});

describe('allows', () => {
  const perms = { pipeline: 'edit', suivi: 'view', finance: 'none' } as const;

  it('respecte le rang none < view < edit', () => {
    expect(allows(perms, 'pipeline', 'edit')).toBe(true);
    expect(allows(perms, 'pipeline', 'view')).toBe(true);
    expect(allows(perms, 'suivi', 'view')).toBe(true);
    expect(allows(perms, 'suivi', 'edit')).toBe(false);
    expect(allows(perms, 'finance', 'view')).toBe(false);
  });

  it('défaut-deny pour une section absente', () => {
    expect(allows({}, 'members', 'view')).toBe(false);
  });
});

describe('hasConsoleAccess', () => {
  it('vrai si au moins une section admin est lisible', () => {
    expect(hasConsoleAccess(presetFor('admin'))).toBe(true);
    expect(hasConsoleAccess(presetFor('assistant'))).toBe(true);
  });

  it('faux pour un rôle qui n’a que formation', () => {
    expect(hasConsoleAccess(presetFor('commercial'))).toBe(false);
  });

  it('faux pour un PermMap vide', () => {
    expect(hasConsoleAccess({})).toBe(false);
  });
});

describe('can (compat legacy)', () => {
  it('admin a toutes les capabilities listées', () => {
    expect(can('admin', 'console.access')).toBe(true);
    expect(can('admin', 'members.manage')).toBe(true);
  });

  it('assistant n’a pas finance.view ni members.manage', () => {
    expect(can('assistant', 'console.access')).toBe(true);
    expect(can('assistant', 'finance.view')).toBe(false);
    expect(can('assistant', 'members.manage')).toBe(false);
  });

  it('faux pour rôle null / terrain', () => {
    expect(can(null, 'console.access')).toBe(false);
    expect(can('commercial', 'console.access')).toBe(false);
  });
});
