import { describe, it, expect } from 'vitest';
import {
  PIPELINE_COLUMNS,
  getColumnForStatus,
  columnById,
  resolveDropStatus,
} from '@/lib/pipeline';

describe('PIPELINE_COLUMNS', () => {
  it('expose 7 colonnes dans l’ordre commercial', () => {
    expect(PIPELINE_COLUMNS.map((c) => c.id)).toEqual([
      'a_contacter',
      'tentative',
      'contact_etabli',
      'en_attente',
      'rdv_devis',
      'gagne',
      'mort',
    ]);
  });

  it('marque la dernière colonne comme morte', () => {
    const last = PIPELINE_COLUMNS[PIPELINE_COLUMNS.length - 1];
    expect(last.id).toBe('mort');
    expect(last.dead).toBe(true);
  });

  it('chaque colonne a un statut canonique présent dans ses statuses', () => {
    for (const col of PIPELINE_COLUMNS) {
      expect(col.statuses).toContain(col.defaultStatus);
    }
  });
});

describe('getColumnForStatus', () => {
  it('mappe chaque statut vers sa colonne', () => {
    expect(getColumnForStatus('a_contacter')).toBe('a_contacter');
    expect(getColumnForStatus('a_rappeler')).toBe('tentative');
    expect(getColumnForStatus('en_discussion')).toBe('contact_etabli');
    expect(getColumnForStatus('devis_envoye')).toBe('rdv_devis');
    expect(getColumnForStatus('gagne')).toBe('gagne');
    expect(getColumnForStatus('perdu')).toBe('mort');
    expect(getColumnForStatus('archived')).toBe('mort');
  });

  it('rabat le legacy "prospecte" sur l’entrée de pipeline', () => {
    expect(getColumnForStatus('prospecte')).toBe('a_contacter');
  });

  it('rabat tout statut inconnu / null sur "a_contacter"', () => {
    expect(getColumnForStatus('statut_bidon')).toBe('a_contacter');
    expect(getColumnForStatus(null)).toBe('a_contacter');
    expect(getColumnForStatus(undefined)).toBe('a_contacter');
  });
});

describe('columnById', () => {
  it('retrouve la définition d’une colonne', () => {
    expect(columnById('gagne').label).toBe('Devis signé');
  });
});

describe('resolveDropStatus', () => {
  it('préserve le statut courant s’il appartient déjà à la colonne cible', () => {
    // 'a_rappeler' vit dans la colonne 'tentative' → on ne le réécrit pas.
    expect(resolveDropStatus('a_rappeler', 'tentative')).toBe('a_rappeler');
  });

  it('applique le statut canonique quand on change de colonne', () => {
    // 'a_contacter' déposé dans 'rdv_devis' → statut canonique 'rdv_pris'.
    expect(resolveDropStatus('a_contacter', 'rdv_devis')).toBe('rdv_pris');
  });

  it('canonicalise vers "perdu" en colonne morte depuis un statut actif', () => {
    expect(resolveDropStatus('contacte', 'mort')).toBe('perdu');
  });
});
