'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ShieldQuestion,
  Phone,
  Mail,
  MapPin,
  Search,
  ExternalLink,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Building2,
  Clock,
} from 'lucide-react';
import {
  emailStatusTone,
  emailStatusLabel,
  confidenceTone,
  telHref,
} from '@/lib/prospect-intel';
import { labelForStatus, toneForStatus } from '@/lib/prospects';

export type AVerifierRowVM = {
  id: string;
  company: string;
  dirigeant: string | null;
  dirigeantRole: string | null;
  tel: string | null;
  email: string | null;
  emailStatus: string | null;
  city: string | null;
  sector: string | null;
  status: string | null;
  siret: string | null;
  angle: string | null;
  signal: string | null;
  confidence: string | null;
  sourceCount: number;
  reasons: string[];
  enrichedAt: string | null;
};

/** Date courte FR (ex: 12 juin) ou null si non parsable. */
function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(t));
  } catch {
    return null;
  }
}

export default function AVerifierClient({ rows }: { rows: AVerifierRowVM[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.company, r.dirigeant, r.city, r.sector, r.email, r.siret, r.angle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, q]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* En-tete */}
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5 text-brand-dark" aria-hidden />
          <h1 className="font-marcellus text-2xl text-choco">A verifier</h1>
        </div>
        <p className="mt-1 text-sm text-muted-warm">
          Prospects enrichis par l&apos;IA (cascade FR) que l&apos;agent Atlas a
          marques <span className="font-semibold">a verifier</span> : match SIRENE
          faible ou email non confirme. Un coup d&apos;oeil humain suffit a
          valider la fiche, puis elle disparait de cette file.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 font-semibold text-brand-dark ring-1 ring-[rgba(74,36,26,0.12)]/15">
            A verifier
            <span className="tabular-nums">{rows.length}</span>
          </span>
        </div>
      </header>

      {/* Recherche */}
      <div className="mb-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm/60" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une entreprise, un dirigeant, un SIRET..."
            className="w-full rounded-xl border border-border-soft bg-white py-2 pl-9 pr-3 text-sm text-ink-warm placeholder:text-muted-warm/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-border-soft bg-white p-8 text-center text-sm text-muted-warm shadow-soft">
          {rows.length === 0
            ? "Rien a verifier pour le moment. Les enrichissements marques 'a verifier' par Atlas apparaitront ici."
            : 'Aucune fiche ne correspond a cette recherche.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <AVerifierCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AVerifierCard({ r }: { r: AVerifierRowVM }) {
  const href = telHref(r.tel);
  const enrichedAt = shortDate(r.enrichedAt);

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
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <ShieldQuestion className="h-3 w-3" aria-hidden />
              A verifier
            </span>
            {r.status && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneForStatus(r.status)}`}>
                {labelForStatus(r.status)}
              </span>
            )}
            {r.confidence && (
              <span
                title="Confiance globale de l'enrichissement"
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceTone(r.confidence)}`}
              >
                {r.confidence}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-warm">
            {r.dirigeant && (
              <span className="font-semibold text-ink-warm">
                {r.dirigeant}
                {r.dirigeantRole ? (
                  <span className="font-normal text-muted-warm"> &middot; {r.dirigeantRole}</span>
                ) : null}
              </span>
            )}
            {r.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {r.city}
              </span>
            )}
            {r.sector && <span className="truncate">{r.sector}</span>}
          </div>

          {/* Pourquoi a verifier : raisons lisibles */}
          {r.reasons.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {r.reasons.map((reason) => (
                <li
                  key={reason}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200/60"
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          )}

          {/* Donnees cles d'enrichissement */}
          {r.angle && (
            <div className="mt-2 rounded-2xl bg-cream-deep/60 p-2.5 ring-1 ring-[rgba(74,36,26,0.12)]/8">
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

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {r.email ? (
              <a
                href={`mailto:${r.email}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-white px-2 py-1 font-medium text-ink-warm hover:bg-cream-deep"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {r.email}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2 py-0.5 font-medium text-[#6F5A50]">
                <Mail className="h-3 w-3" aria-hidden />
                Pas d&apos;email
              </span>
            )}
            {r.email && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${emailStatusTone(r.emailStatus)}`}>
                {emailStatusLabel(r.emailStatus)}
              </span>
            )}
            {r.siret && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2 py-0.5 font-medium text-[#6F5A50]">
                <Building2 className="h-3 w-3" aria-hidden />
                SIRET {r.siret}
              </span>
            )}
            {r.sourceCount > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-warm/70">
                <ExternalLink className="h-3 w-3" aria-hidden />
                {r.sourceCount} source{r.sourceCount > 1 ? 's' : ''}
              </span>
            )}
            {enrichedAt && (
              <span className="inline-flex items-center gap-1 text-muted-warm/70">
                <Clock className="h-3 w-3" aria-hidden />
                Enrichi le {enrichedAt}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
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
          <Link
            href={`/prospects/${r.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border-soft bg-white px-3 py-2 text-xs font-semibold text-ink-warm hover:bg-cream-deep"
          >
            Ouvrir la fiche
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}
