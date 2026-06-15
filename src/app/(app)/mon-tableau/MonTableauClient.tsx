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
  TrendingUp,
  BadgeEuro,
  Wallet,
  AlarmClock,
  Trophy,
  Activity as ActivityIcon,
} from 'lucide-react';
import { formatEur } from '@/lib/ca-utils';
import {
  iconForActivityKind,
  labelForActivityKind,
} from '@/lib/activities';
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
 * Retourne le prochain palier non atteint (ou le dernier si tout atteint)
 * et le palier précédent comme base de la barre.
 */
function bonusProgress(signatures: number) {
  const tiers = BONUS_TIERS;
  const next = tiers.find((t) => signatures < t.contrats) ?? null;
  const reached = tiers.filter((t) => signatures >= t.contrats);
  const lastReached = reached.length > 0 ? reached[reached.length - 1] : null;
  const target = next ?? tiers[tiers.length - 1];
  const base = lastReached ? lastReached.contrats : 0;
  const span = Math.max(1, target.contrats - base);
  const progressInSpan = pct(
    Math.max(0, signatures - base),
    span
  );
  return { next, lastReached, target, progressInSpan, allReached: next == null };
}

/* ---------- variants (respectés si pas reduced-motion) ---------- */
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
/*  KPI card                                                     */
/* ============================================================ */
function KpiCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={item}
      className={
        'rounded-3xl border p-5 shadow-warm ' +
        (accent
          ? 'border-gnd-amber/30 bg-gnd-amber/[0.07]'
          : 'border-gnd-bronze/8 bg-gnd-paper')
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className={
            'flex h-8 w-8 items-center justify-center rounded-xl ' +
            (accent
              ? 'bg-gnd-amber/15 text-gnd-amber'
              : 'bg-gnd-bronze/8 text-gnd-bronze')
          }
        >
          {icon}
        </span>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gnd-bronze-faded">
          {label}
        </p>
      </div>
      <p
        className={
          'font-display text-3xl font-medium tabular-nums leading-none ' +
          (accent ? 'text-gnd-amber' : 'text-gnd-bronze')
        }
      >
        {value}
      </p>
      {sub && (
        <div className="mt-2 text-xs text-gnd-bronze-soft">{sub}</div>
      )}
    </motion.div>
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
    statusBreakdown,
    caPotentiel,
    caRealise,
    commissionRealisee,
    commissionPotentielle,
    signatures,
    relancesEnRetard,
    relancesAujourdhui,
    activites,
  } = data;

  const maxFunnelValeur = Math.max(
    1,
    ...statusBreakdown.map((s) => s.valeur)
  );
  const bonus = bonusProgress(signatures);
  const relancesTotal = relancesEnRetard + relancesAujourdhui;

  return (
    <motion.div
      className="mx-auto max-w-5xl"
      variants={container}
      initial={reduce ? false : 'hidden'}
      animate="show"
    >
      {/* ---- En-tête ---- */}
      <motion.header variants={item} className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-8 bg-gnd-amber" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
            Mon tableau de bord
          </span>
        </div>
        <h1 className="font-display text-display-md font-medium leading-[0.95] tracking-tight text-gnd-bronze sm:text-4xl">
          Bonjour <span className="italic text-gnd-amber">{prenom}</span>.
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {commissionPct != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gnd-amber/25 bg-gnd-amber/10 px-3.5 py-1.5 text-sm font-semibold text-gnd-amber tabular-nums">
              Ta commission&nbsp;: {commissionPct}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gnd-bronze/15 bg-white px-3.5 py-1.5 text-sm font-medium text-gnd-bronze-soft">
              Taux de commission non défini
            </span>
          )}
          <Link
            href="/prospects"
            className="group inline-flex items-center gap-1.5 rounded-full border border-gnd-bronze/15 bg-white px-3.5 py-1.5 text-sm font-medium text-gnd-bronze transition-all hover:border-gnd-bronze/30 hover:shadow-warm"
          >
            {prospectsTotal} prospect{prospectsTotal > 1 ? 's' : ''}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </motion.header>

      {/* ---- Cartes KPI ---- */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" aria-hidden />}
          label="Mes prospects"
          value={String(prospectsTotal)}
          sub={
            <span>
              {pipelineActifCount} actif{pipelineActifCount > 1 ? 's' : ''} en
              pipeline
            </span>
          }
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
          label="Mon pipeline"
          value={formatEur(caPotentiel)}
          sub={<span>CA potentiel (prix service GND)</span>}
        />
        <KpiCard
          icon={<BadgeEuro className="h-4 w-4" aria-hidden />}
          label="CA réalisé"
          value={formatEur(caRealise)}
          sub={
            <span>
              {signatures} contrat{signatures > 1 ? 's' : ''} signé
              {signatures > 1 ? 's' : ''}
            </span>
          }
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" aria-hidden />}
          label="Ma commission"
          value={formatEur(commissionRealisee)}
          accent
          sub={
            <span>
              réalisée · <strong>{formatEur(commissionPotentielle)}</strong>{' '}
              potentielle
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---- Mon pipeline par statut ---- */}
        <motion.section
          variants={item}
          aria-label="Mon pipeline par statut"
          className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium text-gnd-bronze">
            <TrendingUp className="h-4 w-4 text-gnd-amber" aria-hidden />
            Mon pipeline
          </h2>
          {statusBreakdown.every((s) => s.count === 0) ? (
            <p className="text-sm text-gnd-bronze-soft">
              Aucun prospect dans le pipeline pour l&apos;instant. Dès que tu
              avances une fiche, elle apparaît ici.
            </p>
          ) : (
            <ul className="space-y-3">
              {statusBreakdown.map((s) => (
                <li key={s.status}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span
                      className={
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        s.tone
                      }
                    >
                      {s.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-gnd-bronze-soft">
                      {s.count} · {formatEur(s.valeur)}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-gnd-bronze/8"
                    role="progressbar"
                    aria-valuenow={s.valeur}
                    aria-valuemin={0}
                    aria-valuemax={maxFunnelValeur}
                    aria-label={`${s.label} : ${formatEur(s.valeur)}`}
                  >
                    <motion.div
                      className="h-full rounded-full bg-gnd-amber"
                      initial={reduce ? false : { width: 0 }}
                      animate={{
                        width: `${pct(s.valeur, maxFunnelValeur)}%`,
                      }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* ---- Mes relances ---- */}
        <motion.section
          variants={item}
          aria-label="Mes relances"
          className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium text-gnd-bronze">
            <AlarmClock className="h-4 w-4 text-gnd-amber" aria-hidden />
            Mes relances
          </h2>
          <div className="grid grid-cols-2 gap-3" aria-live="polite">
            <div className="rounded-2xl border border-gnd-bronze/8 bg-white p-4">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-gnd-bronze-faded">
                En retard
              </p>
              <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-rose-600">
                {relancesEnRetard}
              </p>
            </div>
            <div className="rounded-2xl border border-gnd-bronze/8 bg-white p-4">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-gnd-bronze-faded">
                Aujourd&apos;hui
              </p>
              <p className="mt-1.5 font-display text-3xl font-medium tabular-nums text-gnd-amber">
                {relancesAujourdhui}
              </p>
            </div>
          </div>
          {relancesTotal === 0 && (
            <p className="mt-3 text-xs text-gnd-bronze-soft">
              Rien à relancer dans l&apos;immédiat. 👌
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/prospects/relances"
              className="group inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-all hover:bg-gnd-ink"
            >
              Voir mes relances
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/prospects/taches"
              className="inline-flex items-center rounded-full border border-gnd-bronze/15 bg-white px-4 py-2 text-sm font-semibold text-gnd-bronze transition-all hover:border-gnd-bronze/30 hover:shadow-warm"
            >
              Mes tâches
            </Link>
          </div>
        </motion.section>

        {/* ---- Paliers bonus ---- */}
        <motion.section
          variants={item}
          aria-label="Paliers bonus"
          className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium text-gnd-bronze">
            <Trophy className="h-4 w-4 text-gnd-amber" aria-hidden />
            Paliers bonus
          </h2>
          <p className="mb-3 text-sm text-gnd-bronze">
            <strong className="tabular-nums">{signatures}</strong> contrat
            {signatures > 1 ? 's' : ''} signé{signatures > 1 ? 's' : ''}
            {bonus.allReached ? (
              <span className="text-emerald-600">
                {' '}— tous les paliers atteints 🎉
              </span>
            ) : (
              <span className="text-gnd-bronze-soft">
                {' '}— prochain palier à{' '}
                <strong>{bonus.target.contrats}</strong> (
                {bonus.target.bonus}€)
              </span>
            )}
          </p>

          {/* Barre vers le prochain palier */}
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-gnd-bronze/8"
            role="progressbar"
            aria-valuenow={signatures}
            aria-valuemin={0}
            aria-valuemax={bonus.target.contrats}
            aria-label={`Progression vers le palier ${bonus.target.contrats} contrats`}
          >
            <motion.div
              className="h-full rounded-full bg-gnd-amber"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${bonus.progressInSpan}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>

          {/* Jalons */}
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
                        ? 'border border-gnd-amber/40 bg-gnd-amber/10 text-gnd-amber'
                        : 'border border-gnd-bronze/12 bg-white text-gnd-bronze-soft')
                  }
                >
                  {t.contrats} contrats → <strong>{t.bonus}€</strong>
                  {reached && <span aria-hidden> ✓</span>}
                </span>
              );
            })}
          </div>
        </motion.section>

        {/* ---- Activité récente ---- */}
        <motion.section
          variants={item}
          aria-label="Activité récente"
          className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium text-gnd-bronze">
            <ActivityIcon className="h-4 w-4 text-gnd-amber" aria-hidden />
            Activité récente
          </h2>
          {activites.length === 0 ? (
            <p className="text-sm text-gnd-bronze-soft">
              Aucune activité enregistrée pour l&apos;instant. Tes appels,
              emails et notes apparaîtront ici.
            </p>
          ) : (
            <ul className="space-y-3">
              {activites.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gnd-bronze/8 text-sm"
                  >
                    {iconForActivityKind(a.kind)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gnd-bronze">
                      <span className="font-medium">
                        {labelForActivityKind(a.kind)}
                      </span>
                      {a.company && (
                        <span className="text-gnd-bronze-soft">
                          {' '}· {a.company}
                        </span>
                      )}
                    </p>
                    {a.body && (
                      <p className="truncate text-xs text-gnd-bronze-soft">
                        {a.body}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-gnd-bronze-faded">
                    {relativeDate(a.occurred_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
