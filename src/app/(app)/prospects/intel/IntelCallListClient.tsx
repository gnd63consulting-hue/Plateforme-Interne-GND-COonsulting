'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Globe,
  ChevronRight,
} from 'lucide-react';
import {
  emailStatusTone,
  emailStatusLabel,
  statusTone,
  statusLabel,
  confidenceTone,
  telHref,
  type PresenceDigitale,
} from '@/lib/prospect-intel';
import { labelForStatus, toneForStatus } from '@/lib/prospects';

export type IntelRowVM = {
  id: string;
  company: string;
  dirigeant: string | null;
  tel: string | null;
  email: string | null;
  emailStatus: string | null;
  city: string | null;
  sector: string | null;
  status: string | null;
  enrichStatus: string | null;
  angle: string | null;
  signal: string | null;
  presence: PresenceDigitale | null;
  confidence: string | null;
  sourceCount: number;
  hasIntel: boolean;
};

type Filter = 'all' | 'enrichi' | 'with_email' | 'phone_only';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'enrichi', label: 'Enrichis' },
  { value: 'with_email', label: 'Email verifie' },
  { value: 'phone_only', label: 'Tel seul' },
];

export default function IntelCallListClient({ rows }: { rows: IntelRowVM[] }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const stats = useMemo(() => {
    const withTel = rows.filter((r) => r.tel).length;
    const withValidEmail = rows.filter(
      (r) => r.email && r.emailStatus === 'valid'
    ).length;
    const enrichi = rows.filter((r) => r.enrichStatus === 'enrichi').length;
    return { total: rows.length, withTel, withValidEmail, enrichi };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const validEmail = !!(r.email && r.emailStatus === 'valid');
      if (filter === 'enrichi' && r.enrichStatus !== 'enrichi') return false;
      if (filter === 'with_email' && !validEmail) return false;
      if (filter === 'phone_only' && (validEmail || !r.tel)) return false;
      if (!needle) return true;
      return [r.company, r.dirigeant, r.city, r.sector, r.angle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* En-tete */}
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-brand-dark" aria-hidden />
          <h1 className="font-marcellus text-2xl text-choco">Liste d&apos;appel</h1>
        </div>
        <p className="mt-1 text-sm text-muted-warm">
          Prospects enrichis par l&apos;IA (cascade FR). Le telephone couvre la
          quasi-totalite de la base, l&apos;email environ un tiers : on appelle
          d&apos;abord, l&apos;email vient en complement.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <StatChip label="Prospects" value={stats.total} />
          <StatChip label="Avec tel" value={stats.withTel} tone="emerald" />
          <StatChip label="Email verifie" value={stats.withValidEmail} tone="amber" />
          <StatChip label="Enrichis" value={stats.enrichi} tone="bronze" />
        </div>
      </header>

      {/* Recherche + filtres */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm/60" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une entreprise, un dirigeant, une ville..."
            className="w-full rounded-xl border border-border-soft bg-white py-2 pl-9 pr-3 text-sm text-ink-warm placeholder:text-muted-warm/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.value
                  ? 'bg-brand text-choco'
                  : 'border border-border-soft bg-white text-ink-warm hover:bg-cream-deep'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-border-soft bg-white p-8 text-center text-sm text-muted-warm shadow-soft">
          {rows.length === 0
            ? "Aucun prospect pour le moment. L'enrichissement Atlas remplira cette liste."
            : 'Aucun prospect ne correspond a ce filtre.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <IntelCard key={r.id} r={r} />
          ))}
        </ul>
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
  tone?: 'slate' | 'emerald' | 'amber' | 'bronze';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    bronze: 'bg-cream-deep text-brand-dark ring-1 ring-gnd-bronze/15',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${tones[tone]}`}>
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function IntelCard({ r }: { r: IntelRowVM }) {
  const href = telHref(r.tel);
  const presenceChips: string[] = [];
  if (r.presence) {
    if (r.presence.site === false) presenceChips.push('Pas de site');
    if (r.presence.techno) presenceChips.push(r.presence.techno);
    if (r.presence.mobile === false) presenceChips.push('Pas mobile');
    if (r.presence.https === false) presenceChips.push('Pas HTTPS');
    if (r.presence.social_actif) presenceChips.push('Social actif');
  }

  return (
    <li className="rounded-3xl border border-border-soft bg-white p-4 shadow-soft">
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
            {r.enrichStatus && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(r.enrichStatus)}`}>
                {statusLabel(r.enrichStatus)}
              </span>
            )}
            {r.status && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneForStatus(r.status)}`}>
                {labelForStatus(r.status)}
              </span>
            )}
            {r.confidence && (
              <span
                title="Confiance globale de l'enrichissement"
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceTone(r.confidence)}`}
              >
                <ShieldCheck className="h-3 w-3" aria-hidden />
                {r.confidence}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-warm">
            {r.dirigeant && <span className="font-semibold text-ink-warm">{r.dirigeant}</span>}
            {r.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {r.city}
              </span>
            )}
            {r.sector && <span className="truncate">{r.sector}</span>}
          </div>

          {/* Angle GND = le pitch pret a l'emploi */}
          {r.angle && (
            <div className="mt-2 rounded-2xl bg-cream-deep/60 p-2.5 ring-1 ring-gnd-bronze/8">
              <p className="flex items-start gap-1.5 text-xs text-ink-warm">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" aria-hidden />
                <span>
                  <span className="font-semibold">Angle : </span>
                  {r.angle}
                  {r.signal ? <span className="text-muted-warm"> &mdash; {r.signal}</span> : null}
                </span>
              </p>
            </div>
          )}

          {/* Email + presence */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {r.email ? (
              <a
                href={`mailto:${r.email}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-white px-2 py-1 font-medium text-ink-warm hover:bg-cream-deep"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {r.email}
              </a>
            ) : null}
            {r.email && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${emailStatusTone(r.emailStatus)}`}>
                {emailStatusLabel(r.emailStatus)}
              </span>
            )}
            {presenceChips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600"
              >
                <Globe className="h-3 w-3" aria-hidden />
                {c}
              </span>
            ))}
            {r.sourceCount > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-warm/70">
                <ExternalLink className="h-3 w-3" aria-hidden />
                {r.sourceCount} source{r.sourceCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
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
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500">
              <Phone className="h-4 w-4" aria-hidden />
              Pas de tel
            </span>
          )}
          <Link
            href={`/prospects/${r.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-soft bg-white px-3 py-2 text-xs font-semibold text-ink-warm hover:bg-cream-deep"
          >
            Fiche
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}
