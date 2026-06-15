'use client';

import {
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  ArrowRight,
  Users,
  TrendingUp,
  BadgeEuro,
  Wallet,
  AlarmClock,
  Trophy,
  Activity as ActivityIcon,
  CheckCircle2,
  Flame,
  CheckSquare,
  Award,
} from 'lucide-react';
import { formatEur } from '@/lib/ca-utils';
import {
  iconForActivityKind,
  labelForActivityKind,
} from '@/lib/activities';
import {
  Card,
  StatCard,
  GaugeSVG,
  SectionHeader,
  Button,
  QuickAccessCard,
} from '@/components/ui';
import { BONUS_TIERS, type MonTableauData } from './types';

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

/**
 * Détermine la progression vers les paliers bonus.
 */
function bonusProgress(signatures: number) {
  const tiers = BONUS_TIERS;
  const next = tiers.find((t) => signatures < t.contrats) ?? null;
  const reached = tiers.filter((t) => signatures >= t.contrats);
  const lastReached = reached.length > 0 ? reached[reached.length - 1] : null;
  const target = next ?? tiers[tiers.length - 1];
  const base = lastReached ? lastReached.contrats : 0;
  const span = Math.max(1, target.contrats - base);
  const progressInSpan = pct(Math.max(0, signatures - base), span);
  return { next, lastReached, target, progressInSpan, allReached: next == null };
}

/**
 * Mini-série illustrative DÉTERMINISTE dérivée d'une valeur réelle (aucune
 * donnée supplémentaire n'est fetchée). Sert uniquement de micro-tendance
 * décorative dans les StatCards — montée douce vers la valeur courante.
 */
function trendFrom(value: number, points = 7): number[] {
  if (value <= 0) return Array(points).fill(0);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // courbe lissée 0.45→1.0 + ondulation déterministe légère
    const ease = 0.45 + 0.55 * t;
    const wave = 1 + 0.08 * Math.sin(i * 1.3);
    out.push(Math.max(0, value * ease * wave));
  }
  return out;
}

/* ---------- variants ---------- */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 130, damping: 18 },
  },
};

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
    statusBreakdown,
    caPotentiel,
    caRealise,
    commissionPotentielle,
    commissionReelleAPayer,
    commissionReellePayee,
    commissionReelleTotale,
    commissionsCount,
    signatures,
    relancesEnRetard,
    relancesAujourdhui,
    activites,
  } = data;

  const maxFunnelValeur = Math.max(1, ...statusBreakdown.map((s) => s.valeur));
  const bonus = bonusProgress(signatures);
  const relancesTotal = relancesEnRetard + relancesAujourdhui;

  // « Prospects chauds » = fiches en fin de pipeline (rdv / négo / proposition).
  // Dérivé des données déjà présentes (aucun fetch supplémentaire).
  const hotCount = statusBreakdown
    .filter((s) => /rdv|nego|negoci|proposition|devis|relanc/i.test(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : 'hidden'}
      animate="show"
      className="space-y-7"
    >
      {/* ---- En-tête ---- */}
      <motion.div variants={item}>
        <SectionHeader
          as="h1"
          eyebrow="Mon tableau de bord"
          title={
            <>
              Bonjour <span className="italic text-brand-dark">{prenom}</span>.
            </>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {commissionPct != null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-choco tabular-nums">
                  Ta commission&nbsp;: {commissionPct}%
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-border-soft bg-surface-soft px-3.5 py-1.5 text-sm font-medium text-muted-warm">
                  Taux non défini
                </span>
              )}
              <Button href="/prospects" variant="outline" size="sm">
                {prospectsTotal} prospect{prospectsTotal > 1 ? 's' : ''}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* ---- Accès rapide (réf Drive) ---- */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <QuickAccessCard
            featured
            href="/prospects/relances"
            context="À relancer"
            title="Relances du jour"
            icon={<AlarmClock className="h-[18px] w-[18px]" aria-hidden />}
            count={relancesAujourdhui}
          />
          <QuickAccessCard
            href="/prospects"
            context="Pipeline"
            title="Prospects chauds"
            icon={<Flame className="h-[18px] w-[18px]" aria-hidden />}
            count={hotCount}
          />
          <QuickAccessCard
            href="/prospects/taches"
            context="À faire"
            title="Mes tâches"
            icon={<CheckSquare className="h-[18px] w-[18px]" aria-hidden />}
          />
          <QuickAccessCard
            href="/prospects"
            context="Gagnés"
            title="Derniers signés"
            icon={<Award className="h-[18px] w-[18px]" aria-hidden />}
            count={signatures}
          />
        </div>
      </motion.div>

      {/* ---- Rangée de StatCards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <StatCard
            icon={<Users className="h-5 w-5" aria-hidden />}
            label="Mes prospects"
            value={String(prospectsTotal)}
            delta={`${pipelineActifCount} actif${pipelineActifCount > 1 ? 's' : ''}`}
            deltaDirection={pipelineActifCount > 0 ? 'up' : 'flat'}
            sparkline={trendFrom(prospectsTotal)}
            sparklineVariant="bars"
            sub={
              <span>
                {pipelineActifCount} en pipeline en cours
              </span>
            }
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<TrendingUp className="h-5 w-5" aria-hidden />}
            label="Pipeline CA potentiel"
            value={formatEur(caPotentiel)}
            delta={commissionPotentielle > 0 ? `≈ ${formatEur(commissionPotentielle)}` : undefined}
            deltaDirection="up"
            sparkline={trendFrom(caPotentiel)}
            sub={<span>Prix service GND (estimé)</span>}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<BadgeEuro className="h-5 w-5" aria-hidden />}
            label="CA réalisé"
            value={formatEur(caRealise)}
            delta={`${signatures} signé${signatures > 1 ? 's' : ''}`}
            deltaDirection={signatures > 0 ? 'up' : 'flat'}
            sparkline={trendFrom(caRealise)}
            sub={
              <span>
                {signatures} contrat{signatures > 1 ? 's' : ''} gagné
                {signatures > 1 ? 's' : ''}
              </span>
            }
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            accent
            icon={<Wallet className="h-5 w-5" aria-hidden />}
            label="Ma commission réelle"
            value={formatEur(commissionReelleTotale)}
            delta={commissionReelleAPayer > 0 ? `${formatEur(commissionReelleAPayer)} à payer` : undefined}
            deltaDirection={commissionReelleAPayer > 0 ? 'up' : 'flat'}
            sparkline={trendFrom(commissionReelleTotale)}
            sub={
              <span>
                {formatEur(commissionReellePayee)} déjà payée
              </span>
            }
          />
        </motion.div>
      </div>

      {/* ---- Jauge palier + détail commission ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Jauge circulaire — progression palier bonus */}
        <motion.div variants={item}>
          <Card className="flex h-full flex-col items-center p-6 text-center">
            <SectionHeader
              icon={<Trophy className="h-4 w-4" aria-hidden />}
              title="Prochain palier"
              className="w-full"
            />
            <div className="my-5 flex flex-1 items-center justify-center">
              <GaugeSVG
                value={bonus.progressInSpan}
                label={`Progression vers le palier ${bonus.target.contrats} contrats`}
              >
                <span className="font-marcellus text-3xl text-choco tabular-nums">
                  {bonus.progressInSpan}%
                </span>
                <span className="mt-1 text-[11px] font-medium text-muted-warm">
                  {signatures}/{bonus.target.contrats} contrats
                </span>
              </GaugeSVG>
            </div>
            <p className="text-sm text-muted-warm">
              {bonus.allReached ? (
                <span className="font-medium text-emerald-700">
                  Tous les paliers atteints 🎉
                </span>
              ) : (
                <>
                  Plus que{' '}
                  <strong className="text-choco tabular-nums">
                    {bonus.target.contrats - signatures}
                  </strong>{' '}
                  pour débloquer{' '}
                  <strong className="text-brand-dark tabular-nums">
                    {bonus.target.bonus}€
                  </strong>
                </>
              )}
            </p>
          </Card>
        </motion.div>

        {/* Détail commission (réelle vs estimée) */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full p-6">
            <SectionHeader
              icon={<Wallet className="h-4 w-4" aria-hidden />}
              title="Ma commission"
              subtitle="La commission réelle est figée au montant HT signé. L'estimée projette le pipeline encore ouvert."
            />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-brand/25 bg-brand-soft p-4">
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-dark">
                  Réelle à payer
                </p>
                <p className="mt-1.5 font-marcellus text-2xl text-brand-dark tabular-nums">
                  {formatEur(commissionReelleAPayer)}
                </p>
                <p className="mt-1 text-[11px] text-muted-warm">
                  {commissionsCount} commission{commissionsCount > 1 ? 's' : ''}{' '}
                  à la signature
                </p>
              </div>
              <div className="rounded-2xl border border-border-soft/70 bg-cream p-4">
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-warm">
                  Déjà payée
                </p>
                <p className="mt-1.5 font-marcellus text-2xl text-emerald-700 tabular-nums">
                  {formatEur(commissionReellePayee)}
                </p>
                <p className="mt-1 text-[11px] text-muted-warm">
                  Réglée par l&apos;administration
                </p>
              </div>
              <div className="rounded-2xl border border-border-soft/70 bg-cream p-4">
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-warm">
                  Estimée (pipeline)
                </p>
                <p className="mt-1.5 font-marcellus text-2xl text-choco tabular-nums">
                  {formatEur(commissionPotentielle)}
                </p>
                <p className="mt-1 text-[11px] text-muted-warm">
                  Projection indicative
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ---- Pipeline + relances ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mon pipeline par statut */}
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <SectionHeader
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
              title="Mon pipeline"
            />
            {statusBreakdown.every((s) => s.count === 0) ? (
              <p className="mt-5 text-sm text-muted-warm">
                Aucun prospect dans le pipeline pour l&apos;instant. Dès que tu
                avances une fiche, elle apparaît ici.
              </p>
            ) : (
              <ul className="mt-5 space-y-3.5">
                {statusBreakdown.map((s) => (
                  <li key={s.status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                          s.tone
                        }
                      >
                        {s.label}
                      </span>
                      <span className="font-inter text-xs tabular-nums text-muted-warm">
                        {s.count} · {formatEur(s.valeur)}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-cream-deep"
                      role="progressbar"
                      aria-valuenow={s.valeur}
                      aria-valuemin={0}
                      aria-valuemax={maxFunnelValeur}
                      aria-label={`${s.label} : ${formatEur(s.valeur)}`}
                    >
                      <motion.div
                        className="h-full rounded-full bg-gradient-brand"
                        initial={reduce ? false : { width: 0 }}
                        animate={{ width: `${pct(s.valeur, maxFunnelValeur)}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* Mes relances */}
        <motion.div variants={item}>
          <Card className="flex h-full flex-col p-6">
            <SectionHeader
              icon={<AlarmClock className="h-4 w-4" aria-hidden />}
              title="Mes relances"
            />
            <div className="mt-5 grid grid-cols-2 gap-3" aria-live="polite">
              <div className="rounded-2xl border border-border-soft/70 bg-cream p-4">
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-warm">
                  En retard
                </p>
                <p className="mt-1.5 font-marcellus text-3xl text-rose-700 tabular-nums">
                  {relancesEnRetard}
                </p>
              </div>
              <div className="rounded-2xl border border-brand/25 bg-brand-soft p-4">
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-dark">
                  Aujourd&apos;hui
                </p>
                <p className="mt-1.5 font-marcellus text-3xl text-brand-dark tabular-nums">
                  {relancesAujourdhui}
                </p>
              </div>
            </div>
            {relancesTotal === 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-warm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                Rien à relancer dans l&apos;immédiat.
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-3 pt-5">
              <Button href="/prospects/relances" variant="primary" size="sm">
                Voir mes relances
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button href="/prospects/taches" variant="outline" size="sm">
                Mes tâches
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ---- Paliers bonus (barre détaillée) + activité ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Paliers bonus */}
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <SectionHeader
              icon={<Trophy className="h-4 w-4" aria-hidden />}
              title="Paliers bonus"
            />
            <p className="mt-5 mb-3 text-sm text-ink-warm">
              <strong className="tabular-nums">{signatures}</strong> contrat
              {signatures > 1 ? 's' : ''} signé{signatures > 1 ? 's' : ''}
              {bonus.allReached ? (
                <span className="text-emerald-700">
                  {' '}— tous les paliers atteints 🎉
                </span>
              ) : (
                <span className="text-muted-warm">
                  {' '}— prochain à <strong>{bonus.target.contrats}</strong> (
                  {bonus.target.bonus}€)
                </span>
              )}
            </p>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-cream-deep"
              role="progressbar"
              aria-valuenow={signatures}
              aria-valuemin={0}
              aria-valuemax={bonus.target.contrats}
              aria-label={`Progression vers le palier ${bonus.target.contrats} contrats`}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-brand"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${bonus.progressInSpan}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {BONUS_TIERS.map((t) => {
                const reached = signatures >= t.contrats;
                const isNext = bonus.next?.contrats === t.contrats;
                return (
                  <span
                    key={t.contrats}
                    className={
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
                      (reached
                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                        : isNext
                          ? 'border border-brand/40 bg-brand-soft text-choco'
                          : 'border border-border-soft/70 bg-surface-soft text-muted-warm')
                    }
                  >
                    {t.contrats} contrats → <strong>{t.bonus}€</strong>
                    {reached && <span aria-hidden> ✓</span>}
                  </span>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Activité récente */}
        <motion.div variants={item}>
          <Card className="h-full p-6">
            <SectionHeader
              icon={<ActivityIcon className="h-4 w-4" aria-hidden />}
              title="Activité récente"
            />
            {activites.length === 0 ? (
              <p className="mt-5 text-sm text-muted-warm">
                Aucune activité enregistrée pour l&apos;instant. Tes appels,
                emails et notes apparaîtront ici.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {activites.map((a) => (
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
      </div>
    </motion.div>
  );
}
