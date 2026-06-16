/**
 * Reporting avancé (Sprint Reporting) — helpers PURS pour l'écran
 * `/admin/reporting`.
 *
 * ⚠️ MODULE PUR — il n'importe RIEN de server-only (`@/lib/supabase-server`,
 * `next/headers`, `supabase-admin`). Il peut donc être importé indifféremment
 * par un Server Component, une Server Action et un Client Component
 * (`"use client"`) sans tirer de code serveur dans le bundle client. Comme
 * `finance.ts` / `pipeline.ts` / `ca-utils.ts`, il est entièrement testable
 * sous vitest (environnement node).
 *
 * Couvre 3 calculs + 1 constante tunable :
 *   - STAGE_PROBABILITY   : probabilité de signature par colonne de pipeline
 *                           (cf. src/lib/pipeline.ts). Tunable par l'admin.
 *   - conversionFunnel    : compte par colonne de pipeline + taux de conversion
 *                           étape→étape le long du parcours commercial.
 *   - weightedForecast    : CA pondéré = Σ (montant deal × proba de la colonne)
 *                           sur les deals OUVERTS (hors gagné / sorties).
 *   - periodCompare       : KPIs d'une période vs la période équivalente
 *                           précédente, avec deltas en %.
 *
 * La source de vérité des colonnes/statuts reste `pipeline.ts` :
 * `PIPELINE_COLUMNS` + `getColumnForStatus`. On ne redéfinit PAS le mapping
 * statut → colonne ici, on le réutilise — ainsi tout nouveau statut terrain
 * ajouté à `prospects.ts`/`pipeline.ts` est automatiquement pris en compte.
 */

import {
  PIPELINE_COLUMNS,
  getColumnForStatus,
  type PipelineColumnId,
} from '@/lib/pipeline';

/* ====================================================================== */
/* STAGE_PROBABILITY — tunable                                             */
/* ====================================================================== */

/**
 * Probabilité de signature (0 → 1) par colonne de pipeline.
 *
 * Les clés sont les `PipelineColumnId` de `src/lib/pipeline.ts` (et NON les
 * statuts bruts) : chaque colonne regroupe déjà plusieurs statuts terrain
 * (ex. `tentative` = tentative_appel + a_rappeler). Le forecast raisonne donc
 * au niveau colonne, ce qui est l'altitude commerciale pertinente.
 *
 * Défauts choisis (à AJUSTER par l'admin selon le taux de closing réel GND) :
 *   - a_contacter    5%  : prospect froid, pas encore approché.
 *   - tentative     10%  : appels tentés / à rappeler, contact pas établi.
 *   - contact_etabli 25% : premier contact établi, discussion en cours.
 *   - en_attente    35%  : balle dans leur camp, intérêt manifeste.
 *   - rdv_devis     60%  : RDV pris ou devis envoyé — très engagé.
 *   - gagne        100%  : déjà signé (compté au forecast réalisé, pas pondéré).
 *   - mort           0%  : perdu / sortie / ne plus démarcher.
 *
 * `gagne` (100%) et `mort` (0%) sont volontairement présents pour exhaustivité,
 * mais `weightedForecast` EXCLUT les deals déjà gagnés et morts du pipeline
 * pondéré (un deal gagné est du CA réalisé, pas une prévision). Ils restent
 * utiles pour pondérer un breakdown complet si besoin.
 */
export const STAGE_PROBABILITY: Record<PipelineColumnId, number> = {
  a_contacter: 0.05,
  tentative: 0.1,
  contact_etabli: 0.25,
  en_attente: 0.35,
  rdv_devis: 0.6,
  gagne: 1,
  mort: 0,
};

/** Colonnes considérées « ouvertes » pour le forecast pondéré : tout le
 *  pipeline SAUF la colonne gagnée (CA réalisé) et la colonne morte (sorties).
 *  Dérivé de PIPELINE_COLUMNS pour rester aligné si l'ordre/les colonnes
 *  évoluent. */
export const OPEN_FORECAST_COLUMNS: PipelineColumnId[] = PIPELINE_COLUMNS
  .filter((c) => c.id !== 'gagne' && !c.dead)
  .map((c) => c.id);

const OPEN_FORECAST_SET = new Set<PipelineColumnId>(OPEN_FORECAST_COLUMNS);

/* ====================================================================== */
/* Conversion funnel                                                       */
/* ====================================================================== */

/** Une étape du funnel = une colonne de pipeline + compte + taux de
 *  conversion depuis l'étape précédente. */
export type FunnelStage = {
  columnId: PipelineColumnId;
  label: string;
  count: number;
  /** Taux de conversion depuis l'étape précédente (0 → 1), ou null pour la
   *  1re étape. count(i) / count(i-1), borné à [0,1] visuellement côté UI. */
  conversionFromPrev: number | null;
};

/** Entrée minimale acceptée : tout objet portant un `status`. */
export type StatusBearing = { status: string | null | undefined };

/**
 * Funnel de conversion : compte de prospects par colonne de pipeline (dans
 * l'ordre commercial de PIPELINE_COLUMNS) + taux de conversion étape→étape.
 *
 * Par défaut la colonne morte (`mort`) est EXCLUE : un funnel de conversion
 * décrit la progression vers la signature, pas les sorties. Passe
 * `{ includeDead: true }` pour l'inclure en fin de funnel.
 *
 * Le taux `conversionFromPrev` est count(i)/count(i-1) : il répond à « quelle
 * part de l'étape précédente a atteint celle-ci ». Sur un pipeline réel
 * (snapshot, pas cohorte) c'est un proxy, pas une vérité de cohorte — c'est le
 * même calcul que le funnel existant de admin/v2.
 */
export function conversionFunnel(
  prospects: StatusBearing[],
  opts: { includeDead?: boolean } = {}
): FunnelStage[] {
  const cols = PIPELINE_COLUMNS.filter((c) => opts.includeDead || !c.dead);

  // Compte par colonne (init à 0 pour garder toutes les colonnes, même vides).
  const counts = new Map<PipelineColumnId, number>();
  for (const c of cols) counts.set(c.id, 0);
  const allowed = new Set(cols.map((c) => c.id));
  for (const p of prospects) {
    const colId = getColumnForStatus(p.status);
    if (allowed.has(colId)) {
      counts.set(colId, (counts.get(colId) ?? 0) + 1);
    }
  }

  return cols.map((c, i) => {
    const count = counts.get(c.id) ?? 0;
    let conversionFromPrev: number | null = null;
    if (i > 0) {
      const prevCount = counts.get(cols[i - 1].id) ?? 0;
      conversionFromPrev = prevCount > 0 ? count / prevCount : null;
    }
    return { columnId: c.id, label: c.label, count, conversionFromPrev };
  });
}

/* ====================================================================== */
/* Weighted forecast                                                       */
/* ====================================================================== */

/** Deal pour le forecast : un statut + un montant € (HT). Le montant vient de
 *  `prospect_finance.deal_amount` (admin-only) joint au prospect ; absent → 0
 *  ou `defaultDealAmount` configurable. */
export type ForecastDeal = {
  status: string | null | undefined;
  /** Montant HT du deal en €. null/undefined si pas de ligne prospect_finance. */
  dealAmount: number | null | undefined;
};

export type ForecastStageBreakdown = {
  columnId: PipelineColumnId;
  label: string;
  probability: number;
  /** Nombre de deals ouverts dans cette colonne. */
  dealCount: number;
  /** Somme brute des montants (non pondérée) des deals de la colonne. */
  rawAmount: number;
  /** Montant pondéré = rawAmount × probability. */
  weightedAmount: number;
};

export type WeightedForecast = {
  /** CA pondéré total sur tous les deals ouverts. */
  total: number;
  /** Somme brute (non pondérée) des montants des deals ouverts. */
  totalRaw: number;
  /** Détail par colonne ouverte (ordre commercial). */
  breakdown: ForecastStageBreakdown[];
};

/**
 * CA pondéré attendu = Σ sur les deals OUVERTS de (montant deal × proba de la
 * colonne du deal).
 *
 * - « ouvert » = colonne ∈ OPEN_FORECAST_COLUMNS (tout sauf `gagne` et `mort`).
 *   Un deal gagné est du CA réalisé ; un deal mort vaut 0.
 * - montant manquant (`dealAmount` null/undefined) → `defaultDealAmount`
 *   (0 par défaut, tunable par l'appelant).
 * - `probabilities` permet d'overrider STAGE_PROBABILITY (ex. réglage admin
 *   persisté plus tard) sans toucher le code.
 *
 * Retourne le total pondéré + un breakdown par colonne (proba, compte, brut,
 * pondéré) dans l'ordre commercial.
 */
export function weightedForecast(
  deals: ForecastDeal[],
  opts: {
    probabilities?: Record<PipelineColumnId, number>;
    defaultDealAmount?: number;
  } = {}
): WeightedForecast {
  const probs = opts.probabilities ?? STAGE_PROBABILITY;
  const fallback = opts.defaultDealAmount ?? 0;

  // Init breakdown pour chaque colonne ouverte (ordre PIPELINE_COLUMNS).
  const order = PIPELINE_COLUMNS.filter((c) => OPEN_FORECAST_SET.has(c.id));
  const acc = new Map<
    PipelineColumnId,
    { dealCount: number; rawAmount: number }
  >();
  for (const c of order) acc.set(c.id, { dealCount: 0, rawAmount: 0 });

  for (const d of deals) {
    const colId = getColumnForStatus(d.status);
    if (!OPEN_FORECAST_SET.has(colId)) continue; // exclut gagné + mort
    const amount =
      d.dealAmount != null && Number.isFinite(d.dealAmount)
        ? Number(d.dealAmount)
        : fallback;
    const bucket = acc.get(colId)!;
    bucket.dealCount += 1;
    bucket.rawAmount += amount;
  }

  let total = 0;
  let totalRaw = 0;
  const breakdown: ForecastStageBreakdown[] = order.map((c) => {
    const bucket = acc.get(c.id)!;
    const probability = probs[c.id] ?? 0;
    const weightedAmount = round2(bucket.rawAmount * probability);
    total += weightedAmount;
    totalRaw += bucket.rawAmount;
    return {
      columnId: c.id,
      label: c.label,
      probability,
      dealCount: bucket.dealCount,
      rawAmount: round2(bucket.rawAmount),
      weightedAmount,
    };
  });

  return { total: round2(total), totalRaw: round2(totalRaw), breakdown };
}

/* ====================================================================== */
/* Period compare                                                          */
/* ====================================================================== */

/** Borne de période [start, end) (end exclusif). */
export type Period = { start: Date; end: Date };

/** KPIs comparés bruts d'une période. */
export type PeriodKpis = {
  newProspects: number;
  dealsWon: number;
  caSigned: number;
  commissions: number;
};

export type KpiDelta = {
  current: number;
  previous: number;
  /** Variation en % (0.25 = +25%). null si la période précédente est à 0 et
   *  la courante > 0 (variation « infinie », à afficher « n/a » ou « +∞ »). */
  deltaPct: number | null;
};

export type PeriodCompareResult = {
  current: PeriodKpis;
  previous: PeriodKpis;
  deltas: Record<keyof PeriodKpis, KpiDelta>;
};

/** Prospect minimal pour le compare : date de création + statut. */
export type ProspectForCompare = {
  created_at: string | null | undefined;
  status: string | null | undefined;
  /** Montant HT du deal (prospect_finance.deal_amount), pour le CA signé. */
  dealAmount?: number | null;
};

/** Commission minimale pour le compare : date + base. */
export type CommissionForCompare = {
  created_at: string | null | undefined;
  base_amount: number | null | undefined;
  amount?: number | null | undefined;
};

const WON_STATUS = 'gagne';

function inPeriod(iso: string | null | undefined, period: Period): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= period.start.getTime() && t < period.end.getTime();
}

function delta(current: number, previous: number): KpiDelta {
  let deltaPct: number | null;
  if (previous === 0) {
    deltaPct = current === 0 ? 0 : null; // 0→0 = 0% ; 0→x = indéfini
  } else {
    deltaPct = (current - previous) / previous;
  }
  return { current, previous, deltaPct };
}

function kpisFor(
  prospects: ProspectForCompare[],
  commissions: CommissionForCompare[],
  period: Period
): PeriodKpis {
  let newProspects = 0;
  let dealsWon = 0;
  let caSigned = 0;
  for (const p of prospects) {
    if (inPeriod(p.created_at, period)) newProspects += 1;
    // Deal gagné DANS la période : on date la signature sur created_at faute de
    // colonne `won_at` dédiée — proxy cohérent avec le reste du CRM (admin/v2
    // date les signatures sur updated_at, ici on s'appuie sur created_at du
    // prospect car c'est la seule date stable disponible côté prospects pour ce
    // helper pur ; l'appelant peut filtrer en amont s'il a mieux).
    if (p.status === WON_STATUS && inPeriod(p.created_at, period)) {
      dealsWon += 1;
      const amt = p.dealAmount;
      if (amt != null && Number.isFinite(amt)) caSigned += Number(amt);
    }
  }
  let commissionsTotal = 0;
  for (const c of commissions) {
    if (inPeriod(c.created_at, period)) {
      const base = c.base_amount;
      if (base != null && Number.isFinite(base)) commissionsTotal += Number(base);
    }
  }
  return {
    newProspects,
    dealsWon,
    caSigned: round2(caSigned),
    commissions: round2(commissionsTotal),
  };
}

/**
 * Compare les KPIs d'une période à la période équivalente précédente.
 *
 * KPIs : nouveaux prospects (prospects.created_at), deals gagnés
 * (status='gagne'), CA signé (Σ dealAmount des gagnés), commissions
 * (Σ commissions.base_amount). Pour chaque KPI : valeur courante, précédente,
 * et delta en %.
 *
 * `current` et `previous` sont fournis par l'appelant (cf. monthPeriods pour le
 * défaut « ce mois vs le mois dernier ») afin de garder ce helper pur et
 * déterministe (pas de `new Date()` caché).
 */
export function periodCompare(
  prospects: ProspectForCompare[],
  commissions: CommissionForCompare[],
  current: Period,
  previous: Period
): PeriodCompareResult {
  const cur = kpisFor(prospects, commissions, current);
  const prev = kpisFor(prospects, commissions, previous);
  return {
    current: cur,
    previous: prev,
    deltas: {
      newProspects: delta(cur.newProspects, prev.newProspects),
      dealsWon: delta(cur.dealsWon, prev.dealsWon),
      caSigned: delta(cur.caSigned, prev.caSigned),
      commissions: delta(cur.commissions, prev.commissions),
    },
  };
}

/**
 * Construit les deux bornes « ce mois-ci » vs « le mois précédent » à partir
 * d'une date de référence (par défaut maintenant). Mois calendaires complets :
 * current = [1er du mois de ref, 1er du mois suivant) ;
 * previous = [1er du mois précédent, 1er du mois de ref).
 */
export function monthPeriods(ref: Date = new Date()): {
  current: Period;
  previous: Period;
} {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const startCurrent = new Date(y, m, 1, 0, 0, 0, 0);
  const startNext = new Date(y, m + 1, 1, 0, 0, 0, 0);
  const startPrev = new Date(y, m - 1, 1, 0, 0, 0, 0);
  return {
    current: { start: startCurrent, end: startNext },
    previous: { start: startPrev, end: startCurrent },
  };
}

/* ====================================================================== */
/* Petit util local (évite d'importer finance.ts server-safe mais inutile) */
/* ====================================================================== */

/** Arrondi monétaire à 2 décimales (même sémantique que finance.round2,
 *  dupliqué ici pour garder reporting.ts autonome côté dépendances). */
export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** Formate un ratio (0.25) en pourcentage signé lisible (« +25% », « -8% »,
 *  « n/a » si null). Helper UI pur, testé. */
export function formatDeltaPct(deltaPct: number | null): string {
  if (deltaPct == null) return 'n/a';
  const pct = Math.round(deltaPct * 100);
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}
