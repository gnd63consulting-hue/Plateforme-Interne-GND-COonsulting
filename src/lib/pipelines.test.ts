import { describe, it, expect } from 'vitest';
import {
  type Pipeline,
  sortPipelines,
  defaultPipeline,
  defaultPipelineId,
  effectivePipelineId,
  filterByPipeline,
} from '@/lib/pipelines';

function pipe(over: Partial<Pipeline> & { id: string }): Pipeline {
  return {
    name: over.id,
    position: 0,
    is_default: false,
    color: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('sortPipelines', () => {
  it('trie par position croissante', () => {
    const out = sortPipelines([
      pipe({ id: 'b', position: 2 }),
      pipe({ id: 'a', position: 1 }),
      pipe({ id: 'c', position: 3 }),
    ]);
    expect(out.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('depart egal par created_at puis name', () => {
    const out = sortPipelines([
      pipe({ id: 'z', position: 0, created_at: '2026-02-01T00:00:00.000Z' }),
      pipe({ id: 'a', position: 0, created_at: '2026-01-01T00:00:00.000Z' }),
    ]);
    expect(out.map((p) => p.id)).toEqual(['a', 'z']);
  });

  it('ne mute pas le tableau d’entree', () => {
    const input = [pipe({ id: 'b', position: 2 }), pipe({ id: 'a', position: 1 })];
    const copy = [...input];
    sortPipelines(input);
    expect(input).toEqual(copy);
  });
});

describe('defaultPipeline / defaultPipelineId', () => {
  it('retourne le premier is_default (apres tri)', () => {
    const list = [
      pipe({ id: 'a', position: 0 }),
      pipe({ id: 'b', position: 1, is_default: true }),
    ];
    expect(defaultPipeline(list)?.id).toBe('b');
    expect(defaultPipelineId(list)).toBe('b');
  });

  it('fallback sur le premier pipeline si aucun is_default', () => {
    const list = [pipe({ id: 'a', position: 1 }), pipe({ id: 'b', position: 0 })];
    // tri → b (position 0) en premier
    expect(defaultPipeline(list)?.id).toBe('b');
    expect(defaultPipelineId(list)).toBe('b');
  });

  it('retourne null sur une liste vide', () => {
    expect(defaultPipeline([])).toBeNull();
    expect(defaultPipelineId([])).toBeNull();
  });
});

describe('effectivePipelineId', () => {
  it('renvoie la valeur posee si presente', () => {
    expect(effectivePipelineId('p1', 'def')).toBe('p1');
  });
  it('retombe sur le defaut si null/undefined', () => {
    expect(effectivePipelineId(null, 'def')).toBe('def');
    expect(effectivePipelineId(undefined, 'def')).toBe('def');
  });
  it('peut renvoyer null si pas de defaut', () => {
    expect(effectivePipelineId(null, null)).toBeNull();
  });
});

describe('filterByPipeline', () => {
  const rows = [
    { id: '1', pipeline_id: 'A' },
    { id: '2', pipeline_id: 'B' },
    { id: '3', pipeline_id: null }, // fiche sans pipeline → traitee comme defaut
  ];

  it('selectedId null ⇒ aucune filtration (toutes les fiches)', () => {
    expect(filterByPipeline(rows, null, 'A').map((r) => r.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('filtre sur un pipeline non-defaut sans inclure les NULL', () => {
    // defaut = A ; on filtre B → seule la fiche 2 (la fiche 3 NULL = defaut A).
    expect(filterByPipeline(rows, 'B', 'A').map((r) => r.id)).toEqual(['2']);
  });

  it('filtrer sur le defaut inclut les fiches sans pipeline_id (NULL)', () => {
    // defaut = A ; fiche 1 (A) + fiche 3 (NULL ⇒ A) visibles, comme aujourd’hui.
    expect(filterByPipeline(rows, 'A', 'A').map((r) => r.id)).toEqual(['1', '3']);
  });

  it('comportement identique a aujourd’hui avec un seul pipeline', () => {
    // Un seul pipeline (defaut A) et toutes les fiches NULL ⇒ toutes visibles.
    const single = [
      { id: '1', pipeline_id: null },
      { id: '2', pipeline_id: null },
    ];
    expect(filterByPipeline(single, 'A', 'A').map((r) => r.id)).toEqual([
      '1',
      '2',
    ]);
  });
});
