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
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* En-tete editorial */}
      <header className="relative mb-6 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[120px] leading-none"
        >
          File
        </span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" aria-hidden />
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
                File de controle qualite
              </span>
            </span>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-2xl bg-brand-pale p-2.5 text-brand-dark">
                <ShieldQuestion className="h-5 w-5" aria-hidden />
              </span>
              <h1 className="font-marcellus text-3xl tracking-tight text-choco">A verifier</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6F5A50]">
              Prospects enrichis par l&apos;IA (cascade FR) que l&apos;agent Atlas a
              marques <span className="font-semibold text-ink-warm">a verifier</span> : match SIRENE
              faible ou email non confirme. Un coup d&apos;oeil humain suffit a
              valider la fiche, puis elle disparait de cette file.
            </p>
          </div>
          <span className="panel-accent inline-flex shrink-0 items-baseline gap-1.5 rounded-full px-4 py-2">
            <span className="font-num tabular-nums text-lg font-semibold text-[#3A2017]">{rows.length}</span>
            <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5C3A2C]">a verifier</span>
          </span>
        </div>
      </header>

      {/* Recherche */}
      <div className="panel mb-5 rounded-2xl p-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-burnt/60" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une entreprise, un dirigeant, un SIRET..."
            className="w-full rounded-2xl border border-border-soft bg-cream/60 py-2.5 pl-11 pr-3 text-sm text-ink-warm placeholder:text-muted-warm/50 transition focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
        </label>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="panel flex items-center gap-3 rounded-2xl p-4">
          <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-pale p-2.5 text-brand-burnt">
            <ShieldQuestion className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm leading-snug text-[#6F5A50]">
            {rows.length === 0
              ? "Rien a verifier pour le moment. Les enrichissements marques 'a verifier' par Atlas apparaitront ici."
              : 'Aucune fiche ne correspond a cette recherche.'}
          </p>
        </div>
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
    <li className="panel card-hover rounded-[14px] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Infos */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/prospects/${r.id}`}
              className="font-marcellus text-xl text-choco underline-offset-2 transition hover:underline"
            >
              {r.company}
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-0.5 text-[11px] font-semibold text-warn-fg">
              <ShieldQuestion className="h-3 w-3" aria-hidden />
              A verifier
            </span>
            {r.status && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${toneForStatus(r.status)}`}>
                {labelForStatus(r.status)}
              </span>
            )}
            {r.confidence && (
              <span
                title="Confiance globale de l'enrichissement"
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-num tabular-nums text-[11px] font-semibold ${confidenceTone(r.confidence)}`}
              >
                {r.confidence}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6F5A50]">
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
                <MapPin className="h-3.5 w-3.5 text-brand-burnt/70" aria-hidden />
                {r.city}
              </span>
            )}
            {r.sector && <span className="truncate">{r.sector}</span>}
          </div>

          {/* Pourquoi a verifier : probleme principal mis en avant (statut chaud) */}
          {r.reasons.length > 0 && (
            <div className="panel-accent mt-3 rounded-2xl p-3">
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" aria-hidden />
                <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
                  Pourquoi a verifier
                </span>
              </span>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {r.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-0.5 text-[11px] font-medium text-warn-fg ring-1 ring-[rgba(74,36,26,0.10)]"
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Donnees cles d'enrichissement */}
          {r.angle && (
            <div className="mt-3 rounded-2xl bg-cream-deep/60 p-3 ring-1 ring-[rgba(74,36,26,0.10)]">
              <p className="flex items-start gap-1.5 text-xs text-ink-warm">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" aria-hidden />
                <span>
                  <span className="font-semibold text-brand-burnt">Angle : </span>
                  {r.angle}
                  {r.signal ? <span className="text-muted-warm"> &middot; {r.signal}</span> : null}
                </span>
              </p>
            </div>
          )}

          {/* Sources / qualite : rangee compacte */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {r.email ? (
              <a
                href={`mailto:${r.email}`}
                className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-white px-2.5 py-1 font-medium text-ink-warm transition hover:bg-cream-deep"
              >
                <Mail className="h-3.5 w-3.5 text-brand-burnt/70" aria-hidden />
                {r.email}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-0.5 font-medium text-[#6F5A50]">
                <Mail className="h-3 w-3" aria-hidden />
                Pas d&apos;email
              </span>
            )}
            {r.email && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold ${emailStatusTone(r.emailStatus)}`}>
                {emailStatusLabel(r.emailStatus)}
              </span>
            )}
            {r.siret && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-0.5 font-medium text-[#6F5A50]">
                <Building2 className="h-3 w-3" aria-hidden />
                SIRET <span className="font-num tabular-nums">{r.siret}</span>
              </span>
            )}
            {r.sourceCount > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-warm/70">
                <ExternalLink className="h-3 w-3" aria-hidden />
                <span className="font-num tabular-nums">{r.sourceCount}</span> source{r.sourceCount > 1 ? 's' : ''}
              </span>
            )}
            {enrichedAt && (
              <span className="inline-flex items-center gap-1 text-muted-warm/70">
                <Clock className="h-3 w-3" aria-hidden />
                Enrichi le <span className="font-num tabular-nums">{enrichedAt}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
          <Link
            href={`/prospects/${r.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] shadow-[0_6px_18px_-6px_rgba(243,146,83,0.7)] transition-colors hover:bg-brand-dark"
          >
            Ouvrir la fiche
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
          {href ? (
            <a
              href={href}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border-soft bg-white px-4 py-2 text-xs font-semibold text-choco transition hover:bg-cream-deep"
            >
              <Phone className="h-3.5 w-3.5 text-brand-burnt" aria-hidden />
              <span className="font-num tabular-nums">{r.tel}</span>
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-deep px-4 py-2 text-xs font-medium text-muted-warm">
              <Phone className="h-3.5 w-3.5" aria-hidden />
              Pas de tel
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
