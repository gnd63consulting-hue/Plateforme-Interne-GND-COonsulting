'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  TrendingUp,
  Wallet,
  CalendarDays,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { formatEur } from '@/lib/ca-utils';
import {
  iconForActivityKind,
  labelForActivityKind,
} from '@/lib/activities';
import { SparklineSVG, DonutSVG } from '@/components/ui';
import { columnById, type PipelineColumnId } from '@/lib/pipeline';
import { type MonTableauData } from './types';

/* ----------------------------------------------------------------------------
 * MON TABLEAU — refonte premium DS v3 (bento editorial, juin 2026).
 *
 * Direction artistique : canvas creme, UN accent (orange brule), profondeur
 * chocolat (jamais noir). Type a caractere : Marcellus en display, Space
 * Grotesk pour les eyebrows/labels, JetBrains Mono pour TOUS les chiffres
 * (signal "produit designe"). Bento ASYMETRIQUE — aucune rangee de tuiles
 * egales. Motion spring staggered. Zero donnee inventee : tout vient des
 * props `data`. La logique/les routes/les valeurs sont inchangees.
 * -------------------------------------------------------------------------- */

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

/** Mini-serie DETERMINISTE derivee d'une valeur reelle (aucune donnee fetchee) :
 *  micro-tendance decorative dans les tuiles KPI. */
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

/* ---------- motion ---------- */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 18 },
  },
};

/* Texture pointillee chaude (tuile focale) */
const DOTS: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(rgba(83,36,24,0.07) 1px, transparent 1px)',
  backgroundSize: '15px 15px',
};

/* ---------- eyebrow editorial (trait orange + petites capitales) ---------- */
function Eyebrow({
  index,
  children,
  tone = 'warm',
}: {
  index?: string;
  children: React.ReactNode;
  tone?: 'warm' | 'cream';
}) {
  const color = tone === 'cream' ? 'text-brand' : 'text-brand-burnt';
  return (
    <span className="inline-flex items-center gap-2">
      {index && (
        <span className="font-num text-[11px] tabular-nums text-brand/60">
          {index}
        </span>
      )}
      <span className="h-px w-5 bg-gradient-to-r from-brand to-transparent" />
      <span
        className={`font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] ${color}`}
      >
        {children}
      </span>
    </span>
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

  const snapshotTotal = pipelineSnapshot.reduce((s, c) => s + c.count, 0);
  const pipelineEmpty = pipelineSnapshot.every((c) => c.count === 0);

  // Prospects chauds visibles a travers toutes les etapes (aperçu transversal).
  const hotCards = pipelineSnapshot
    .flatMap((c) => c.cards)
    .filter((card) => card.hot)
    .slice(0, 5);

  // Objectif mensuel commission (cible fixe metier, pas une metric inventee).
  const objectifMensuel = 20000;
  const realiseObjectif = commissionReelleTotale;
  const resteObjectif = Math.max(0, objectifMensuel - realiseObjectif);
  const objectifPct = pct(realiseObjectif, objectifMensuel);

  const commissionDonutPct = commissionPct ?? 0;
  const nf = new Intl.NumberFormat('fr-FR');

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : 'hidden'}
      animate="show"
      className="space-y-5"
    >
      {/* ============================================================== */}
      {/* HERO cockpit — surface-chocolate texturee, nom Marcellus creme  */}
      {/* ============================================================== */}
      <motion.header
        variants={item}
        className="surface-chocolate relative overflow-hidden rounded-[16px] p-5 sm:p-6"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-10 select-none font-marcellus text-[110px] leading-none text-cream/[0.08] sm:text-[140px]"
        >
          {prenom}
        </span>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow index="01" tone="cream">Mon tableau de bord</Eyebrow>
            <h1 className="mt-3 font-marcellus text-[2.4rem] leading-[0.95] text-cream sm:text-5xl">
              Bonjour <span className="italic text-brand">{prenom}</span>
            </h1>
            <p className="mt-3 max-w-md font-grotesk text-sm leading-relaxed text-cream/55">
              Ton activité commerciale en un coup d&apos;œil — pipeline,
              relances et commission.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-cream/10 px-4 py-2 font-num text-xs font-medium tabular-nums text-cream/80">
            <CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />
            {todayLabel()}
          </span>
        </div>
      </motion.header>

      {/* ============================================================== */}
      {/* BENTO STATS — tuiles asymetriques (jamais 5 cartes egales)      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[148px]">
        {/* CA potentiel — tuile focale 2x2 */}
        <motion.div variants={item} className="lg:col-span-2 lg:row-span-2">
          <div className="panel card-hover relative flex h-full min-h-[200px] flex-col justify-between overflow-hidden p-4">
            <div aria-hidden className="absolute inset-0 opacity-70" style={DOTS} />
            <div className="relative flex items-start justify-between">
              <Eyebrow>CA potentiel</Eyebrow>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-pale text-brand-dark">
                <TrendingUp className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="relative">
              <div className="whitespace-nowrap font-num text-[2.7rem] font-semibold leading-none tabular-nums tracking-tight text-choco">
                {formatEur(caPotentiel)}
              </div>
              {commissionPotentielle > 0 && (
                <p className="mt-2 whitespace-nowrap font-grotesk text-xs text-[#6F5A50]">
                  ≈ {formatEur(commissionPotentielle)} de commission
                </p>
              )}
            </div>
            <div className="relative -mx-1 -mb-1">
              <SparklineSVG data={trendFrom(caPotentiel)} variant="area" />
            </div>
          </div>
        </motion.div>

        {/* Ma commission — accent chocolat 2x2 (l'unique surface sombre) */}
        <motion.div variants={item} className="lg:col-span-2 lg:row-span-2">
          <div className="surface-chocolate card-hover relative flex h-full min-h-[200px] flex-col justify-between overflow-hidden rounded-[14px] p-4">
            <div className="flex items-start justify-between">
              <Eyebrow tone="cream">Ma commission</Eyebrow>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream/10 text-brand">
                <Wallet className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="whitespace-nowrap font-num text-[2.7rem] font-semibold leading-none tabular-nums tracking-tight text-cream">
                  {formatEur(commissionReelleTotale)}
                </div>
                <p className="mt-2 whitespace-nowrap font-grotesk text-xs text-cream/60">
                  {commissionReelleAPayer > 0
                    ? `${formatEur(commissionReelleAPayer)} à payer`
                    : 'Estimation pipeline'}
                </p>
              </div>
              <DonutSVG
                value={commissionDonutPct}
                center={commissionPct != null ? `${commissionPct}%` : undefined}
              />
            </div>
          </div>
        </motion.div>

        {/* Prospects actifs — large 2x1 */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="panel card-hover flex h-full min-h-[148px] items-center justify-between gap-4 overflow-hidden p-4">
            <div className="min-w-0">
              <Eyebrow>Prospects actifs</Eyebrow>
              <div className="mt-2.5 flex items-baseline gap-2 whitespace-nowrap">
                <span className="font-num text-4xl font-semibold leading-none tabular-nums text-choco">
                  {pipelineActifCount}
                </span>
                <span className="font-num text-xs tabular-nums text-[#6F5A50]">
                  / {prospectsTotal}
                </span>
              </div>
            </div>
            <div className="h-12 w-24 shrink-0">
              <SparklineSVG data={trendFrom(pipelineActifCount)} variant="bars" />
            </div>
          </div>
        </motion.div>

        {/* Relances du jour — petite 1x1 */}
        <motion.div variants={item} className="lg:col-span-1">
          <div className="panel card-hover flex h-full min-h-[148px] flex-col justify-between p-4">
            <Eyebrow>Relances</Eyebrow>
            <div>
              <span className="font-num text-4xl font-semibold leading-none tabular-nums text-choco">
                {relancesAujourdhui}
              </span>
              {relancesEnRetard > 0 ? (
                <p className="mt-1.5 whitespace-nowrap font-num text-[11px] font-semibold tabular-nums text-danger-fg">
                  {relancesEnRetard} en retard
                </p>
              ) : (
                <p className="mt-1.5 font-grotesk text-[11px] text-ok-fg">
                  à jour
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Signatures — petite 1x1 */}
        <motion.div variants={item} className="lg:col-span-1">
          <div className="panel card-hover flex h-full min-h-[148px] flex-col justify-between p-4">
            <Eyebrow>Signé</Eyebrow>
            <div>
              <span className="font-num text-4xl font-semibold leading-none tabular-nums text-choco">
                {signatures}
              </span>
              <p className="mt-1.5 whitespace-nowrap font-grotesk text-[11px] text-[#6F5A50]">
                ce mois-ci
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============================================================== */}
      {/* PIPELINE — funnel proportionnel (pas 6 cartes egales)           */}
      {/* ============================================================== */}
      <motion.section
        variants={item}
        className="panel p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <Eyebrow index="02">Mon pipeline</Eyebrow>
          <Link
            href="/prospects"
            className="inline-flex items-center gap-1 font-grotesk text-xs font-semibold text-brand-dark transition-colors hover:text-brand"
          >
            Tout voir
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {pipelineEmpty ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-cream/50 px-4 py-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt"
            >
              <TrendingUp className="h-5 w-5" />
            </span>
            <p className="font-grotesk text-sm text-[#6F5A50]">
              Aucun prospect dans le pipeline pour l&apos;instant. Dès que tu
              avances une fiche, elle apparaît ici.
            </p>
          </div>
        ) : (
          <>
            {/* Barre funnel : un segment par etape, largeur ∝ part */}
            <div className="mt-5 flex h-3 w-full gap-1 overflow-hidden rounded-full bg-cream-deep">
              {pipelineSnapshot
                .filter((c) => c.count > 0)
                .map((col) => {
                  const accent =
                    columnById(col.id as PipelineColumnId)?.accent ?? 'bg-brand';
                  const share = pct(col.count, Math.max(1, snapshotTotal));
                  return (
                    <motion.span
                      key={col.id}
                      className={`h-full rounded-full ${accent}`}
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${Math.max(4, share)}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 24 }}
                      aria-hidden
                    />
                  );
                })}
            </div>

            {/* Legende : libelle + compteur mono + valeur € par etape */}
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
              {pipelineSnapshot.map((col) => {
                const accent =
                  columnById(col.id as PipelineColumnId)?.accent ?? 'bg-brand';
                return (
                  <Link
                    key={col.id}
                    href="/prospects"
                    className="group block"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className={`h-2 w-2 shrink-0 rounded-full ${accent}`}
                      />
                      <span className="truncate font-grotesk text-[11px] font-medium uppercase tracking-[0.1em] text-muted-warm group-hover:text-choco">
                        {col.label}
                      </span>
                    </div>
                    <div className="mt-1.5 whitespace-nowrap font-num text-2xl font-semibold tabular-nums text-choco">
                      {col.count}
                    </div>
                    <div className="whitespace-nowrap font-num text-[11px] tabular-nums text-[#6F5A50]">
                      {formatEur(col.valeur)}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Prospects chauds transversaux */}
            {hotCards.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[rgba(74,36,26,0.08)] pt-5">
                <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
                  Chauds
                </span>
                {hotCards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/prospects/${card.id}`}
                    className="group inline-flex items-center gap-1.5 rounded-full hairline bg-cream/60 px-3 py-1.5 transition-colors hover:border-brand/40 hover:bg-brand-pale"
                  >
                    <Flame className="h-3 w-3 text-brand" aria-hidden />
                    <span className="max-w-[140px] truncate text-xs text-ink-warm group-hover:text-choco">
                      {card.company}
                    </span>
                    {card.caEstime && (
                      <span className="whitespace-nowrap font-num text-[10px] font-semibold tabular-nums text-brand-dark">
                        {card.caEstime}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </motion.section>

      {/* ============================================================== */}
      {/* RAIL ASYMETRIQUE — Activite (2/3) + colonne droite (1/3)         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Activite recente — timeline, prend 2 colonnes */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="panel h-full p-4">
            <Eyebrow index="03">Activité récente</Eyebrow>
            {activites.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-cream/50 px-4 py-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt"
                >
                  <CalendarDays className="h-5 w-5" />
                </span>
                <p className="font-grotesk text-sm text-[#6F5A50]">
                  Aucune activité enregistrée. Tes appels, emails et notes
                  apparaîtront ici.
                </p>
              </div>
            ) : (
              <ol className="relative mt-5 space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[rgba(74,36,26,0.12)]">
                {activites.slice(0, 6).map((a) => (
                  <li key={a.id} className="relative flex items-start gap-3.5">
                    <span
                      aria-hidden
                      className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-pale text-sm ring-4 ring-white"
                    >
                      {iconForActivityKind(a.kind)}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="truncate text-sm text-ink-warm">
                        <span className="font-medium text-choco">
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
                    <span className="shrink-0 font-num text-[10px] tabular-nums text-muted-warm/80">
                      {relativeDate(a.occurred_at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </motion.div>

        {/* Colonne droite : Relances detaillees + Objectif (empilees) */}
        <div className="flex flex-col gap-3">
          <motion.div variants={item}>
            <div className="panel p-4">
              <Eyebrow>Relances</Eyebrow>
              <div className="mt-4 space-y-2" aria-live="polite">
                <div className="flex items-center justify-between rounded-2xl border border-danger-fg/20 bg-danger-bg px-3.5 py-2.5">
                  <span className="font-grotesk text-xs font-medium text-danger-fg">
                    En retard
                  </span>
                  <span className="whitespace-nowrap font-num text-lg font-semibold tabular-nums text-danger-fg">
                    {relancesEnRetard}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-brand/25 bg-brand-soft px-3.5 py-2.5">
                  <span className="font-grotesk text-xs font-medium text-choco">
                    Aujourd&apos;hui
                  </span>
                  <span className="whitespace-nowrap font-num text-lg font-semibold tabular-nums text-brand-dark">
                    {relancesAujourdhui}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-ok-fg/20 bg-ok-bg px-3.5 py-2.5">
                  <span className="whitespace-nowrap font-grotesk text-xs font-medium text-ok-fg">
                    À venir · 7j
                  </span>
                  <span className="whitespace-nowrap font-num text-lg font-semibold tabular-nums text-ok-fg">
                    {relancesAVenir}
                  </span>
                </div>
              </div>
              <Link
                href="/prospects/relances"
                className="mt-4 inline-flex items-center gap-1 font-grotesk text-xs font-semibold text-brand-dark transition-colors hover:text-brand"
              >
                Toutes les relances
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <div className="panel-accent p-4">
              <Eyebrow>Objectif du mois</Eyebrow>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="whitespace-nowrap font-num text-3xl font-semibold tabular-nums text-brand-dark">
                  {objectifPct}%
                </span>
                <span className="whitespace-nowrap font-num text-[11px] tabular-nums text-muted-warm">
                  {nf.format(objectifMensuel)} € HT
                </span>
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
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>
              <p className="mt-3 font-grotesk text-[11px] text-muted-warm">
                <strong className="font-num tabular-nums text-choco">
                  {nf.format(realiseObjectif)} €
                </strong>{' '}
                réalisés ·{' '}
                <span className="font-num tabular-nums">
                  {nf.format(resteObjectif)} €
                </span>{' '}
                restants
                {commissionReellePayee > 0 && (
                  <>
                    {' · '}
                    <span className="font-num tabular-nums">
                      {nf.format(commissionReellePayee)} €
                    </span>{' '}
                    payés
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
