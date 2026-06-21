'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  PhoneCall,
  MapPin,
  CalendarClock,
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Flame,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { tierTone, telHref } from '@/lib/prospect-intel';
import { labelForStatus, toneForStatus } from '@/lib/prospects';
import LogCallDialog from '../intel/LogCallDialog';

export type RappelRowVM = {
  id: string;
  company: string;
  dirigeant: string | null;
  tel: string | null;
  city: string | null;
  sector: string | null;
  status: string | null;
  nextActionAt: string | null;
  // Scoring Selene (chaleur)
  score: number | null;
  tier: 'A' | 'B' | 'C' | null;
  scoreLabel: string | null;
  hasScore: boolean;
  // Pitch-helper Selene (quoi dire) — tous optionnels.
  angleSelene: string | null;
  raisons: string[];
  persona: string | null;
  fenetreAchat: string | null;
};

type Bucket = 'overdue' | 'today' | 'upcoming';

/** Minuit local pour un ISO (compare des jours, pas des heures). */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Nombre de jours calendaires entre aujourd'hui et la date de rappel (signe). */
function dayDelta(iso: string): number {
  const target = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function bucketFor(iso: string | null): Bucket {
  if (!iso) return 'upcoming';
  const delta = dayDelta(iso);
  if (delta < 0) return 'overdue';
  if (delta === 0) return 'today';
  return 'upcoming';
}

/** Date relative en francais : "il y a 2 jours" / "aujourd'hui" / "dans 3 jours". */
function relativeRappel(iso: string | null): string {
  if (!iso) return 'Date inconnue';
  const delta = dayDelta(iso);
  if (delta === 0) return "aujourd'hui";
  if (delta === 1) return 'demain';
  if (delta === -1) return 'hier';
  if (delta < 0) return `il y a ${Math.abs(delta)} jours`;
  return `dans ${delta} jours`;
}

/** Date absolue courte (fr-FR) pour info-bulle / complement. */
function absoluteRappel(iso: string | null): string {
  if (!iso) return '--';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const SECTIONS: {
  bucket: Bucket;
  title: string;
  icon: typeof CalendarClock;
  /** Ton du bandeau de section (palette existante, pas de nouvelle couleur). */
  headerClass: string;
  countClass: string;
  empty: string;
}[] = [
  {
    bucket: 'overdue',
    title: 'En retard',
    icon: AlertTriangle,
    headerClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    countClass: 'bg-rose-100 text-rose-700',
    empty: 'Aucun rappel en retard. Beau travail.',
  },
  {
    bucket: 'today',
    title: "Aujourd'hui",
    icon: CalendarCheck,
    headerClass: 'bg-brand-pale text-brand-dark ring-1 ring-[rgba(74,36,26,0.12)]/15',
    countClass: 'bg-cream-deep text-brand-dark',
    empty: "Aucun rappel prevu aujourd'hui.",
  },
  {
    bucket: 'upcoming',
    title: 'A venir',
    icon: CalendarDays,
    headerClass: 'bg-cream-deep text-ink-warm ring-1 ring-border-soft',
    countClass: 'bg-white text-muted-warm ring-1 ring-border-soft',
    empty: 'Aucun rappel a venir.',
  },
];

export default function RappelsClient({ rows }: { rows: RappelRowVM[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.company, r.dirigeant, r.city, r.sector, r.scoreLabel, r.angleSelene]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map: Record<Bucket, RappelRowVM[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };
    for (const r of filtered) map[bucketFor(r.nextActionAt)].push(r);
    return map;
  }, [filtered]);

  const overdueCount = grouped.overdue.length;
  const todayCount = grouped.today.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* En-tete */}
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-brand-dark" aria-hidden />
          <h1 className="font-marcellus text-2xl text-choco">Rappels</h1>
        </div>
        <p className="mt-1 text-sm text-muted-warm">
          Tous les prospects a rappeler, du plus en retard au plus lointain.
          Quand vous reloguez l&apos;appel, le rappel se met a jour et la fiche
          se deplace ou disparait toute seule.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <StatChip label="En retard" value={overdueCount} tone="rose" />
          <StatChip label="Aujourd'hui" value={todayCount} tone="bronze" />
          <StatChip label="Total" value={rows.length} />
        </div>
      </header>

      {/* Recherche */}
      <div className="mb-4">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm/60"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une entreprise, un dirigeant, une ville..."
            className="w-full rounded-xl border border-border-soft bg-white py-2 pl-9 pr-3 text-sm text-ink-warm placeholder:text-muted-warm/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-border-soft bg-white p-8 text-center text-sm text-muted-warm shadow-soft">
          Aucun rappel pour le moment. Loguez un appel avec l&apos;issue
          &laquo; Rappeler &raquo; depuis la liste d&apos;appel et le prospect
          apparaitra ici.
        </p>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const items = grouped[section.bucket];
            const Icon = section.icon;
            return (
              <section key={section.bucket}>
                <div
                  className={`mb-3 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 ${section.headerClass}`}
                >
                  <span className="flex items-center gap-2 font-inter text-sm font-semibold">
                    <Icon className="h-4 w-4" aria-hidden />
                    {section.title}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${section.countClass}`}
                  >
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border-soft bg-white/60 px-4 py-3 text-center text-xs text-muted-warm">
                    {section.empty}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((r) => (
                      <RappelCard
                        key={r.id}
                        r={r}
                        overdue={section.bucket === 'overdue'}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'rose' | 'bronze';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-cream-deep text-ink-warm',
    rose: 'bg-rose-100 text-rose-700',
    bronze: 'bg-cream-deep text-brand-dark ring-1 ring-[rgba(74,36,26,0.12)]/15',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${tones[tone]}`}
    >
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

/** Badge compact du score Selene : "Score 93 . A". */
function ScoreBadge({ r }: { r: RappelRowVM }) {
  if (!r.hasScore || r.score === null) return null;
  return (
    <span
      title="Score de priorite Selene"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tierTone(r.tier)}`}
    >
      <Flame className="h-3 w-3" aria-hidden />
      Score {r.score}
      {r.tier ? <span className="opacity-80">&middot; {r.tier}</span> : null}
    </span>
  );
}

/**
 * Bloc "Pitch Selene" : ce que Selene recommande de DIRE au prospect avant de
 * le rappeler (angle de pitch + raisons + persona/fenetre). Discret, collapsible.
 * Ne s'affiche que si Selene a propose un angle. Memes champs / meme rendu que
 * la liste d'appel.
 */
function PitchSelene({ r }: { r: RappelRowVM }) {
  const [open, setOpen] = useState(false);
  if (!r.angleSelene) return null;
  const raisons = r.raisons.slice(0, 4);
  return (
    <div className="mt-2 rounded-2xl border border-border-soft bg-cream-deep/40 p-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-1.5 text-left text-xs text-ink-warm"
      >
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-brand-dark">Pitch Selene : </span>
          {r.angleSelene}
        </span>
        <ChevronRight
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-warm transition-transform ${
            open ? 'rotate-90' : ''
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-border-soft pt-2">
          {raisons.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {raisons.map((raison, i) => (
                <li
                  key={i}
                  className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-warm ring-1 ring-[rgba(74,36,26,0.12)]/12"
                >
                  {raison}
                </li>
              ))}
            </ul>
          )}
          {(r.persona || r.fenetreAchat) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-warm">
              {r.persona && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden />
                  {r.persona}
                </span>
              )}
              {r.fenetreAchat && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" aria-hidden />
                  {r.fenetreAchat}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RappelCard({ r, overdue }: { r: RappelRowVM; overdue: boolean }) {
  const href = telHref(r.tel);
  // Statut + rappel locaux : refletent immediatement l'issue d'un appel relogue
  // (optimiste), tout en restant cales sur le serveur au prochain revalidate.
  const [status, setStatus] = useState<string | null>(r.status);
  const [logOpen, setLogOpen] = useState(false);

  return (
    <li
      className={`rounded-3xl border bg-white p-4 shadow-soft ${
        overdue ? 'border-rose-200' : 'border-border-soft'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Infos */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/prospects/${r.id}`}
              className="font-marcellus text-lg text-choco underline-offset-2 hover:underline"
            >
              {r.company}
            </Link>
            <ScoreBadge r={r} />
            {r.scoreLabel && (
              <span className="inline-flex items-center rounded-full bg-cream-deep px-2 py-0.5 text-[11px] font-medium text-brand-dark ring-1 ring-[rgba(74,36,26,0.12)]/12">
                {r.scoreLabel}
              </span>
            )}
            {status && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneForStatus(status)}`}
              >
                {labelForStatus(status)}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-warm">
            {r.dirigeant && (
              <span className="font-semibold text-ink-warm">{r.dirigeant}</span>
            )}
            {r.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {r.city}
              </span>
            )}
            {r.sector && <span className="truncate">{r.sector}</span>}
          </div>

          {/* Date de rappel (relative + absolue) */}
          <div
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              overdue
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                : 'bg-cream-deep/70 text-brand-dark ring-1 ring-[rgba(74,36,26,0.12)]/10'
            }`}
          >
            {overdue ? (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            )}
            <span>
              Rappel {relativeRappel(r.nextActionAt)}
              <span className="ml-1 font-normal opacity-70">
                ({absoluteRappel(r.nextActionAt)})
              </span>
            </span>
          </div>

          {/* Pitch Selene = quoi dire avant de rappeler (scoring Selene) */}
          <PitchSelene r={r} />
        </div>

        {/* Action phone-first */}
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
          {href ? (
            <a
              href={href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-choco transition-colors hover:bg-brand-dark"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {r.tel}
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-cream-deep px-4 py-2.5 text-sm font-medium text-muted-warm">
              <Phone className="h-4 w-4" aria-hidden />
              Pas de tel
            </span>
          )}
          <button
            type="button"
            onClick={() => setLogOpen((v) => !v)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              logOpen
                ? 'bg-brand text-choco'
                : 'border border-border-soft bg-white text-ink-warm hover:bg-cream-deep'
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" aria-hidden />
            Loguer l&apos;appel
          </button>
          <Link
            href={`/prospects/${r.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-soft bg-white px-3 py-2 text-xs font-semibold text-ink-warm hover:bg-cream-deep"
          >
            Fiche
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Panneau de log d'appel (statut + note + rappel) — meme composant que la
          liste d'appel. Re-loguer met a jour next_action_at / le statut cote
          serveur ; au revalidate la fiche change de section ou sort. */}
      {logOpen && (
        <LogCallDialog
          prospectId={r.id}
          company={r.company}
          onClose={() => setLogOpen(false)}
          onLogged={(next) => setStatus(next)}
        />
      )}
    </li>
  );
}
