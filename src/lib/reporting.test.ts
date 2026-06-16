import { describe, it, expect } from 'vitest';
import {
  STAGE_PROBABILITY,
  OPEN_FORECAST_COLUMNS,
  conversionFunnel,
  weightedForecast,
  periodCompare,
  monthPeriods,
  formatDeltaPct,
  round2,
  type ForecastDeal,
  type ProspectForCompare,
  type CommissionForCompare,
} from '@/lib/reporting';

/* ---------------------------------------------------------------------- */
/* STAGE_PROBABILITY                                                       */
/* ---------------------------------------------------------------------- */

describe('STAGE_PROBABILITY', () => {
  it('couvre les 7 colonnes de pipeline avec des probas dans [0,1]', () => {
    const keys = Object.keys(STAGE_PROBABILITY);
    expect(keys).toEqual(
      expect.arrayContaining([
        'a_contacter',
        'tentative',
        'contact_etabli',
        'en_attente',
        'rdv_devis',
        'gagne',
        'mort',
      ])
    );
    for (const v of Object.values(STAGE_PROBABILITY)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('gagne=1 et mort=0', () => {
    expect(STAGE_PROBABILITY.gagne).toBe(1);
    expect(STAGE_PROBABILITY.mort).toBe(0);
  });

  it('OPEN_FORECAST_COLUMNS exclut gagne et mort', () => {
    expect(OPEN_FORECAST_COLUMNS).not.toContain('gagne');
    expect(OPEN_FORECAST_COLUMNS).not.toContain('mort');
    expect(OPEN_FORECAST_COLUMNS).toContain('a_contacter');
    expect(OPEN_FORECAST_COLUMNS).toContain('rdv_devis');
  });
});

/* ---------------------------------------------------------------------- */
/* conversionFunnel                                                        */
/* ---------------------------------------------------------------------- */

describe('conversionFunnel', () => {
  it('compte par colonne dans l’ordre commercial et exclut la colonne morte par défaut', () => {
    const prospects = [
      { status: 'a_contacter' },
      { status: 'a_contacter' },
      { status: 'tentative_appel' }, // → tentative
      { status: 'a_rappeler' }, // → tentative
      { status: 'en_discussion' }, // → contact_etabli
      { status: 'devis_envoye' }, // → rdv_devis
      { status: 'gagne' }, // → gagne
      { status: 'perdu' }, // → mort (exclu par défaut)
    ];
    const funnel = conversionFunnel(prospects);
    expect(funnel.map((s) => s.columnId)).toEqual([
      'a_contacter',
      'tentative',
      'contact_etabli',
      'en_attente',
      'rdv_devis',
      'gagne',
    ]);
    const byId = Object.fromEntries(funnel.map((s) => [s.columnId, s.count]));
    expect(byId.a_contacter).toBe(2);
    expect(byId.tentative).toBe(2);
    expect(byId.contact_etabli).toBe(1);
    expect(byId.en_attente).toBe(0);
    expect(byId.rdv_devis).toBe(1);
    expect(byId.gagne).toBe(1);
  });

  it('calcule le taux de conversion étape→étape (null pour la 1re)', () => {
    const prospects = [
      { status: 'a_contacter' },
      { status: 'a_contacter' },
      { status: 'a_contacter' },
      { status: 'a_contacter' }, // 4 à contacter
      { status: 'tentative_appel' },
      { status: 'tentative_appel' }, // 2 tentative → 2/4 = 0.5
    ];
    const funnel = conversionFunnel(prospects);
    expect(funnel[0].conversionFromPrev).toBeNull();
    expect(funnel[1].conversionFromPrev).toBe(0.5);
  });

  it('met conversionFromPrev=null quand l’étape précédente est vide', () => {
    const funnel = conversionFunnel([{ status: 'devis_envoye' }]);
    // contact_etabli (idx 2) précède en_attente etc. La 1re non-vide après des
    // vides a un prev=0 → null.
    const enAttente = funnel.find((s) => s.columnId === 'en_attente')!;
    expect(enAttente.conversionFromPrev).toBeNull();
  });

  it('inclut la colonne morte si includeDead=true', () => {
    const funnel = conversionFunnel([{ status: 'perdu' }], { includeDead: true });
    expect(funnel.map((s) => s.columnId)).toContain('mort');
    expect(funnel.find((s) => s.columnId === 'mort')!.count).toBe(1);
  });

  it('rabat les statuts inconnus/null sur a_contacter', () => {
    const funnel = conversionFunnel([{ status: null }, { status: 'statut_bidon' }]);
    expect(funnel.find((s) => s.columnId === 'a_contacter')!.count).toBe(2);
  });
});

/* ---------------------------------------------------------------------- */
/* weightedForecast                                                        */
/* ---------------------------------------------------------------------- */

describe('weightedForecast', () => {
  const deal = (status: string, dealAmount: number | null): ForecastDeal => ({
    status,
    dealAmount,
  });

  it('pondère chaque deal ouvert par la proba de sa colonne', () => {
    const res = weightedForecast([
      deal('a_contacter', 1000), // 1000 × 0.05 = 50
      deal('devis_envoye', 1000), // rdv_devis 1000 × 0.6 = 600
    ]);
    expect(res.total).toBe(650);
    expect(res.totalRaw).toBe(2000);
  });

  it('exclut les deals gagnés et morts du forecast pondéré', () => {
    const res = weightedForecast([
      deal('gagne', 5000), // exclu (CA réalisé)
      deal('perdu', 5000), // exclu (mort)
      deal('contacte', 1000), // contact_etabli 1000 × 0.25 = 250
    ]);
    expect(res.total).toBe(250);
    expect(res.totalRaw).toBe(1000);
    // Aucun breakdown pour gagne / mort
    expect(res.breakdown.map((b) => b.columnId)).not.toContain('gagne');
    expect(res.breakdown.map((b) => b.columnId)).not.toContain('mort');
  });

  it('traite un montant manquant comme 0 par défaut', () => {
    const res = weightedForecast([deal('rdv_pris', null)]);
    expect(res.total).toBe(0);
    expect(res.totalRaw).toBe(0);
    const rdv = res.breakdown.find((b) => b.columnId === 'rdv_devis')!;
    expect(rdv.dealCount).toBe(1);
    expect(rdv.rawAmount).toBe(0);
  });

  it('applique un defaultDealAmount configurable aux montants manquants', () => {
    const res = weightedForecast([deal('devis_envoye', null)], {
      defaultDealAmount: 2000,
    });
    // rdv_devis 2000 × 0.6 = 1200
    expect(res.total).toBe(1200);
  });

  it('accepte un override de probabilités', () => {
    const res = weightedForecast([deal('a_contacter', 1000)], {
      probabilities: { ...STAGE_PROBABILITY, a_contacter: 0.5 },
    });
    expect(res.total).toBe(500);
  });

  it('produit un breakdown par colonne ouverte avec les bons agrégats', () => {
    const res = weightedForecast([
      deal('a_contacter', 1000),
      deal('a_contacter', 1000),
    ]);
    const ac = res.breakdown.find((b) => b.columnId === 'a_contacter')!;
    expect(ac.dealCount).toBe(2);
    expect(ac.rawAmount).toBe(2000);
    expect(ac.probability).toBe(0.05);
    expect(ac.weightedAmount).toBe(100);
  });
});

/* ---------------------------------------------------------------------- */
/* periodCompare + monthPeriods                                            */
/* ---------------------------------------------------------------------- */

describe('monthPeriods', () => {
  it('construit ce mois vs le mois précédent (mois calendaires)', () => {
    const { current, previous } = monthPeriods(new Date('2026-06-16T10:00:00'));
    expect(current.start.getFullYear()).toBe(2026);
    expect(current.start.getMonth()).toBe(5); // juin (0-indexé)
    expect(current.end.getMonth()).toBe(6); // juillet
    expect(previous.start.getMonth()).toBe(4); // mai
    expect(previous.end.getMonth()).toBe(5); // juin (= start current)
    expect(previous.end.getTime()).toBe(current.start.getTime());
  });

  it('gère le passage d’année (janvier → décembre précédent)', () => {
    const { current, previous } = monthPeriods(new Date('2026-01-10T10:00:00'));
    expect(current.start.getMonth()).toBe(0); // janvier 2026
    expect(previous.start.getFullYear()).toBe(2025);
    expect(previous.start.getMonth()).toBe(11); // décembre 2025
  });
});

describe('periodCompare', () => {
  const { current, previous } = monthPeriods(new Date('2026-06-16T10:00:00'));
  const inJune = '2026-06-10T09:00:00';
  const inMay = '2026-05-12T09:00:00';

  const prospects: ProspectForCompare[] = [
    { created_at: inJune, status: 'a_contacter' },
    { created_at: inJune, status: 'gagne', dealAmount: 1500 },
    { created_at: inMay, status: 'a_contacter' },
    { created_at: inMay, status: 'gagne', dealAmount: 1000 },
    { created_at: inMay, status: 'gagne', dealAmount: 1000 },
  ];
  const commissions: CommissionForCompare[] = [
    { created_at: inJune, base_amount: 1500 },
    { created_at: inMay, base_amount: 1000 },
    { created_at: inMay, base_amount: 1000 },
  ];

  it('compte nouveaux prospects / deals gagnés / CA signé / commissions par période', () => {
    const res = periodCompare(prospects, commissions, current, previous);
    expect(res.current.newProspects).toBe(2);
    expect(res.current.dealsWon).toBe(1);
    expect(res.current.caSigned).toBe(1500);
    expect(res.current.commissions).toBe(1500);

    expect(res.previous.newProspects).toBe(3);
    expect(res.previous.dealsWon).toBe(2);
    expect(res.previous.caSigned).toBe(2000);
    expect(res.previous.commissions).toBe(2000);
  });

  it('calcule les deltas en % (signés) et n/a sur division par zéro', () => {
    const res = periodCompare(prospects, commissions, current, previous);
    // newProspects 2 vs 3 = -33%
    expect(res.deltas.newProspects.deltaPct).toBeCloseTo((2 - 3) / 3, 5);
    // caSigned 1500 vs 2000 = -25%
    expect(res.deltas.caSigned.deltaPct).toBeCloseTo(-0.25, 5);
  });

  it('renvoie deltaPct=null quand la période précédente est à 0 et la courante > 0', () => {
    const res = periodCompare(
      [{ created_at: inJune, status: 'a_contacter' }],
      [],
      current,
      previous
    );
    expect(res.previous.newProspects).toBe(0);
    expect(res.deltas.newProspects.deltaPct).toBeNull();
  });

  it('renvoie deltaPct=0 quand les deux périodes sont à 0', () => {
    const res = periodCompare([], [], current, previous);
    expect(res.deltas.dealsWon.deltaPct).toBe(0);
  });

  it('ignore les dates hors période et les dates invalides', () => {
    const res = periodCompare(
      [
        { created_at: '2026-03-01T00:00:00', status: 'a_contacter' }, // hors période
        { created_at: 'pas-une-date', status: 'a_contacter' },
        { created_at: null, status: 'a_contacter' },
      ],
      [],
      current,
      previous
    );
    expect(res.current.newProspects).toBe(0);
    expect(res.previous.newProspects).toBe(0);
  });
});

/* ---------------------------------------------------------------------- */
/* formatDeltaPct + round2                                                 */
/* ---------------------------------------------------------------------- */

describe('formatDeltaPct', () => {
  it('formate avec signe et n/a', () => {
    expect(formatDeltaPct(0.25)).toBe('+25%');
    expect(formatDeltaPct(-0.08)).toBe('-8%');
    expect(formatDeltaPct(0)).toBe('0%');
    expect(formatDeltaPct(null)).toBe('n/a');
  });
});

describe('round2', () => {
  it('arrondit à 2 décimales et neutralise les non finis', () => {
    expect(round2(41.999999)).toBe(42);
    expect(round2(NaN)).toBe(0);
  });
});
