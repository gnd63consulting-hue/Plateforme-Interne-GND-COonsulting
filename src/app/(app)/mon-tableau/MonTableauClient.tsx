'use client';

import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  ArrowRight,
  Users,
  AlarmClock,
  TrendingUp,
  Wallet,
  Award,
  Upload,
  CalendarDays,
  Flame,
} from 'lucide-react';
import { formatEur } from '@/lib/ca-utils';
import {
  iconForActivityKind,
  labelForActivityKind,
} from '@/lib/activities';
import {
  Card,
  StatCard,
  SparklineSVG,
  DonutSVG,
  SectionHeader,
  StatusBadge,
  Button,
} from '@/components/ui';
import { columnById, type PipelineColumnId } from '@/lib/pipeline';
import {
  type MonTableauData,
  type PipelineSnapshotColumn,
} from './types';

/* ---------- helpers ---------- */

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

function relativeDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return '';
  }
}

/**
 * Mini-série illustrative DÉTERMINISTE dérivée d'une valeur réelle (aucune
 * donnée supplémentaire n'est fetchée). Sert uniquement de micro-tendance
 * décorative dans les KPI cards — montée douce vers la valeur courante.
 */
function trendFrom(value: number, points = 7): number[] {
  if (value <= 0) return Array(points).fill(0);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const ease = 0.45 + 0.55 * t;
    const wave = 1 + 0.08 * Math.sin(i * 1.3);
    out.push(Math.max(0, value * ease * wave));
  }
  return out;
}

/* ---------- variants ---------- */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 130, damping: 18 },
  },
};

/* ============================================================ */
/*  Carte-étape compacte (résumé pipeline du dashboard)         */
/*                                                              */
/*  Une carte par colonne de pipeline : libellé + point         */
/*  d'accent, compteur, valeur € totale, barre de répartition   */
/*  (part du pipeline) et au plus 2 prospects en aperçu. Hauteur */
/*  contenue, aucun scroll interne — c'est un RÉSUMÉ, le Kanban  */
/*  complet vit sur /prospects.                                 */
/* ============================================================ */
function StageCard({
  col,
  share,
  reduce,
}: {
  col: PipelineSnapshotColumn;
  /** Part du pipeline (0–100) que représente cette étape. */
  share: number;
  reduce: boolean;
}) {
  const accent = columnById(col.id as PipelineColumnId)?.accent ?? 'bg-brand';
  const reste = col.count - col.cards.length;

  return (
    <Card
      tone="cream"
      as="section"
      aria-label={`${col.label} — ${col.count} prospect${col.count > 1 ? 's' : ''}, ${formatEur(col.valeur)}`}
      className="flex flex-col p-4"
    >
      {/* En-tête : libellé + point d'accent · compteur */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${accent}`}
          />
          <h3 className="truncate font-marcellus text-sm leading-tight text-choco">
            {col.label}
          </h3>
        </div>
        <span className="shrink-0 font-marcellus text-lg leading-none tabular-nums text-brand-dark">
          {col.count}
        </span>
      </div>

      {/* Valeur € + barre de répartition (part du pipeline) */}
      <p className="mt-1 font-inter text-[11px] font-semibold tabular-nums text-muted-warm">
        {formatEur(col.valeur)}
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-deep"
        role="progressbar"
        aria-valuenow={share}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Part du pipeline : ${share}%`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-brand"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${share}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        />
      </div>

      {/* Aperçu : au plus 2 prospects (nom + montant), liens fiches */}
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        {col.cards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-soft/70 px-2.5 py-3 text-center font-inter text-[10px] uppercase tracking-[0.12em] text-muted-warm/70">
            Vide
          </p>
        ) : (
          col.cards.map((card) => (
            <Link
              key={card.id}
              href={`/prospects/${card.id}`}
              className="group flex items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1 transition-colors hover:border-border-soft/70 hover:bg-surface-soft focus-visible:border-border-soft focus-visible:bg-surface-soft focus-visible:outline-none"
            >
              {card.hot && (
                <Flame
                  className="h-3 w-3 shrink-0 text-brand"
                  aria-label="Prospect prioritaire"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-ink-warm group-hover:text-choco">
                {card.company}
              </span>
              {card.caEstime && (
                <span className="shrink-0 font-inter text-[10px] font-semibold tabular-nums text-brand-dark">
                  {card.caEstime}
                </span>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Footer : « +N de plus » discret OU lien étape */}
      {reste > 0 ? (
        <Link
          href="/prospects"
          className="mt-2.5 inline-flex items-center gap-1 self-start rounded-full px-1.5 py-0.5 font-inter text-[10px] font-semibold text-muted-warm transition-colors hover:text-brand-dark"
        >
          +{reste} de plus
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      ) : (
        col.count > 0 && (
          <span className="mt-2.5 font-inter text-[10px] text-muted-warm/70">
            {col.count === 1 ? '1 prospect' : `${col.count} prospects`}
          </span>
        )
      )}
    </Card>
  );
}

/* ============================================================ */
/*  Main                                                         */
/* ============================================================ */
export default function MonTableauClient({ data }: { data: MonTableauData }) {
  const reduce = useReducedMotion();

  const {
    prenom,
    commissionPct,
    prospectsTotal,
    pipelineActifCount,
    pipelineSnapshot,
    caPotentiel,
    commissionPotentielle,
    commissionReelleAPayer,
    commissionReellePayee,
    commissionReelleTotale,
    signatures,
    relancesEnRetard,
    relancesAujourdhui,
    relancesAVenir,
    activites,
  } = data;

  const relancesTotal =
    relancesEnRetard + relancesAujourdhui + relancesAVenir;

  // Total des prospects présents dans le snapshot (colonnes vivantes) — sert de
  // dénominateur à la « part du pipeline » de chaque carte-étape. Purement
  // dérivé du snapshot déjà calculé : aucune donnée supplémentaire.
  const snapshotTotal = pipelineSnapshot.reduce((sum, c) => sum + c.count, 0);
  const pipelineEmpty = pipelineSnapshot.every((c) => c.count === 0);

  // Objectif mensuel commission (réf mockup : « Objectif mensuel 20 000 € HT »).
  // Dérivé de la commission réelle déjà réalisée vs un objectif standard.
  const objectifMensuel = 20000;
  const realiseObjectif = commissionReelleTotale;
  const resteObjectif = Math.max(0, objectifMensuel - realiseObjectif);
  const objectifPct = pct(realiseObjectif, objectifMensuel);

  // Donut commission : le taux de commission lui-même (réf mockup « 20% »).
  const commissionDonutPct = commissionPct ?? 0;

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : 'hidden'}
      animate="show"
      className="space-y-7"
    >
      {/* ---------------------------------------------------------------- */}
      {/* En-tête : eyebrow + « Bonjour <prénom> » + date / Export          */}
      {/* ---------------------------------------------------------------- */}
      <motion.div variants={item}>
        <SectionHeader
          as="h1"
          eyebrow="Mon tableau de bord"
          title={
            <>
              Bonjour <span className="italic text-brand-dark">{prenom}</span>
            </>
          }
          subtitle="Ton activité commerciale en un coup d'œil — pipeline, relances et commission."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-soft px-3.5 py-1.5 text-sm font-medium text-ink-warm">
                <CalendarDays
                  className="h-3.5 w-3.5 text-muted-warm"
                  aria-hidden
                />
                {todayLabel()}
              </span>
              <Button href="/prospects" variant="outline" size="sm">
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Exporter
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* ---------------------------------------------------------------- */}
      {/* Rangée 5 KPI (réf mockup : bars / donut / courbe / donut / courbe) */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1 — Prospects actifs + mini barres */}
        <motion.div variants={item}>
          <StatCard
            icon={<Users className="h-5 w-5" aria-hidden />}
            label="Prospects actifs"
            value={String(pipelineActifCount)}
            delta={`${prospectsTotal} au total`}
            deltaDirection={pipelineActifCount > 0 ? 'up' : 'flat'}
            chart={
              <SparklineSVG
                data={trendFrom(pipelineActifCount)}
                variant="bars"
              />
            }
          />
        </motion.div>

        {/* 2 — Relances du jour + mini donut + « X en retard » rouge */}
        <motion.div variants={item}>
          <StatCard
            icon={<AlarmClock className="h-5 w-5" aria-hidden />}
            label="Relances du jour"
            value={String(relancesAujourdhui)}
            chart={
              <DonutSVG
                value={pct(
                  relancesAujourdhui,
                  Math.max(1, relancesTotal)
                )}
              />
            }
            sub={
              relancesEnRetard > 0 ? (
                <span className="font-semibold text-rose-600">
                  {relancesEnRetard} en retard
                </span>
              ) : (
                <span>À jour sur tes relances</span>
              )
            }
          />
        </motion.div>

        {/* 3 — CA potentiel + mini courbe (aire) */}
        <motion.div variants={item}>
          <StatCard
            icon={<TrendingUp className="h-5 w-5" aria-hidden />}
            label="CA potentiel"
            value={formatEur(caPotentiel)}
            delta={
              commissionPotentielle > 0
                ? `≈ ${formatEur(commissionPotentielle)}`
                : undefined
            }
            deltaDirection="up"
            chart={
              <SparklineSVG data={trendFrom(caPotentiel)} variant="area" />
            }
          />
        </motion.div>

        {/* 4 — Ma commission + donut (taux %) */}
        <motion.div variants={item}>
          <StatCard
            accent
            icon={<Wallet className="h-5 w-5" aria-hidden />}
            label="Ma commission"
            value={formatEur(commissionReelleTotale)}
            chart={
              <DonutSVG
                value={commissionDonutPct}
                center={
                  commissionPct != null ? `${commissionPct}%` : undefined
                }
              />
            }
            sub={
              commissionReelleAPayer > 0 ? (
                <span>{formatEur(commissionReelleAPayer)} à payer</span>
              ) : (
                <span>Estimation (pipeline)</span>
              )
            }
          />
        </motion.div>

        {/* 5 — Signatures + mini courbe verte */}
        <motion.div variants={item}>
          <StatCard
            icon={<Award className="h-5 w-5" aria-hidden />}
            label="Signatures"
            value={String(signatures)}
            delta={signatures > 0 ? `${signatures} gagné${signatures > 1 ? 's' : ''}` : undefined}
            deltaDirection={signatures > 0 ? 'up' : 'flat'}
            chart={
              <SparklineSVG
                data={trendFrom(signatures)}
                variant="area"
                stroke="#3A7A52"
              />
            }
          />
        </motion.div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Mon pipeline — RÉSUMÉ COMPACT (cartes-étapes), pleine largeur.     */}
      {/* Plus de mini-kanban scrollable : une carte par étape, hauteur     */}
      {/* contenue. Le Kanban complet vit sur /prospects.                   */}
      {/* ---------------------------------------------------------------- */}
      <motion.div variants={item}>
        <Card className="p-6">
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            title="Mon pipeline"
            action={
              <Button href="/prospects" variant="ghost" size="sm">
                Voir tout le pipeline
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            }
          />

          {pipelineEmpty ? (
            <p className="mt-6 text-sm text-muted-warm">
              Aucun prospect dans le pipeline pour l&apos;instant. Dès que tu
              avances une fiche, elle apparaît ici.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {pipelineSnapshot.map((col) => (
                <StageCard
                  key={col.id}
                  col={col}
                  share={pct(col.count, Math.max(1, snapshotTotal))}
                  reduce={!!reduce}
                />
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ---------------------------------------------------------------- */}
      {/* Rail : Relances / Activité récente / Ma commission.               */}
      {/* 3 colonnes alignées EN HAUT, sous le résumé pipeline — le         */}
      {/* dashboard reste un cockpit scannable d'un coup d'œil.             */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Relances */}
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <SectionHeader
              icon={<AlarmClock className="h-4 w-4" aria-hidden />}
              title="Relances"
            />
            <div className="mt-5 space-y-2.5" aria-live="polite">
              <div className="flex items-center justify-between rounded-xl border border-[#EFBFBF] bg-[#F7D7D7]/50 px-3.5 py-2.5">
                <span className="text-sm font-medium text-[#A04A4A]">
                  En retard
                </span>
                <span className="font-marcellus text-xl tabular-nums text-[#A04A4A]">
                  {relancesEnRetard}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-brand/25 bg-brand-soft px-3.5 py-2.5">
                <span className="text-sm font-medium text-choco">
                  Aujourd&apos;hui
                </span>
                <span className="font-marcellus text-xl tabular-nums text-brand-dark">
                  {relancesAujourdhui}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#C4E7D1] bg-[#DDF2E4]/60 px-3.5 py-2.5">
                <span className="text-sm font-medium text-[#3A7A52]">
                  À venir (7j)
                </span>
                <span className="font-marcellus text-xl tabular-nums text-[#3A7A52]">
                  {relancesAVenir}
                </span>
              </div>
            </div>
            <Link
              href="/prospects/relances"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark transition-colors hover:text-brand"
            >
              Voir toutes les relances
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Card>
        </motion.div>

        {/* Activité récente */}
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <SectionHeader
              icon={<AlarmClock className="h-4 w-4" aria-hidden />}
              title="Activité récente"
            />
            {activites.length === 0 ? (
              <p className="mt-5 text-sm text-muted-warm">
                Aucune activité enregistrée. Tes appels, emails et notes
                apparaîtront ici.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {activites.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm"
                    >
                      {iconForActivityKind(a.kind)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-warm">
                        <span className="font-medium">
                          {labelForActivityKind(a.kind)}
                        </span>
                        {a.company && (
                          <span className="text-muted-warm"> · {a.company}</span>
                        )}
                      </p>
                      {a.body && (
                        <p className="truncate text-xs text-muted-warm">
                          {a.body}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-inter text-[10px] tabular-nums text-muted-warm/80">
                      {relativeDate(a.occurred_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* Ma commission — objectif mensuel + barre */}
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <SectionHeader
              icon={<Wallet className="h-4 w-4" aria-hidden />}
              title="Ma commission"
            />
            <p className="mt-4 text-xs text-muted-warm">
              Objectif mensuel{' '}
              <strong className="text-ink-warm tabular-nums">
                {new Intl.NumberFormat('fr-FR').format(objectifMensuel)} € HT
              </strong>
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-marcellus text-3xl text-brand-dark tabular-nums">
                {objectifPct}%
              </span>
              {commissionPct != null && (
                <span className="text-[11px] text-muted-warm">
                  taux {commissionPct}%
                </span>
              )}
            </div>
            <div
              className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-cream-deep"
              role="progressbar"
              aria-valuenow={realiseObjectif}
              aria-valuemin={0}
              aria-valuemax={objectifMensuel}
              aria-label="Progression vers l'objectif mensuel de commission"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-brand"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${objectifPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <p className="mt-2.5 text-[11px] text-muted-warm">
              <strong className="text-choco tabular-nums">
                {new Intl.NumberFormat('fr-FR').format(realiseObjectif)} €
              </strong>{' '}
              réalisés /{' '}
              <span className="tabular-nums">
                {new Intl.NumberFormat('fr-FR').format(resteObjectif)} €
              </span>{' '}
              restants
              {commissionReellePayee > 0 && (
                <>
                  {' · '}
                  {new Intl.NumberFormat('fr-FR').format(commissionReellePayee)}{' '}
                  € déjà payés
                </>
              )}
            </p>
            <Link
              href="/prospects"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark transition-colors hover:text-brand"
            >
              Voir le détail
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
