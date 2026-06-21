'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Globe,
  ChevronRight,
  Flame,
  Target,
  Users,
  CalendarClock,
  Download,
} from 'lucide-react';
import {
  emailStatusTone,
  emailStatusLabel,
  statusTone,
  statusLabel,
  confidenceTone,
  tierTone,
  telHref,
  type PresenceDigitale,
} from '@/lib/prospect-intel';
import { labelForStatus, toneForStatus, formatDate } from '@/lib/prospects';
import LogCallDialog from './LogCallDialog';

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
  nextActionAt: string | null;
  enrichStatus: string | null;
  angle: string | null;
  signal: string | null;
  presence: PresenceDigitale | null;
  confidence: string | null;
  sourceCount: number;
  hasIntel: boolean;
  // Scoring Selene (priorisation appel)
  score: number | null;
  tier: 'A' | 'B' | 'C' | null;
  prioriteAppel: number | null;
  opportuniteWeb: boolean;
  scoreLabel: string | null;
  hasScore: boolean;
  // Pitch-helper Selene (quoi dire) — tous optionnels.
  angleSelene: string | null;
  raisons: string[];
  persona: string | null;
  fenetreAchat: string | null;
};

type Filter = 'callable' | 'all' | 'enrichi' | 'with_email' | 'phone_only';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'callable', label: 'A appeler' },
  { value: 'all', label: 'Tous' },
  { value: 'enrichi', label: 'Enrichis' },
  { value: 'with_email', label: 'Email verifie' },
  { value: 'phone_only', label: 'Tel seul' },
];

/**
 * Statuts encore travaillables par un commercial : la fiche reste dans la liste
 * d'appel tant qu'elle porte un de ces statuts. Toute fiche reconciliee en
 * statut terminal/traite (contacte, rdv_pris, devis_envoye, gagne, perdu,
 * archived, pas_interesse, coordonnees_invalides, ne_plus_demarcher,
 * processus_termine) sort automatiquement de la vue "A appeler". 'prospecte'
 * (legacy) est tolere comme appelable. Aligne sur l'enum de src/lib/prospects.ts.
 */
const CALLABLE_STATUSES = new Set<string>([
  'a_contacter',
  'tentative_appel',
  'a_rappeler',
  'a_recontacter',
  'en_attente_retour',
  'en_discussion',
  'prospecte',
]);

function isCallable(status: string | null): boolean {
  // Sans statut, on garde la fiche visible (cas d'import brut a traiter).
  if (!status) return true;
  return CALLABLE_STATUSES.has(status);
}

/* -------------------------------------------------------------------------- */
/* Export CSV (client-side, aucune requete serveur)                           */
/* -------------------------------------------------------------------------- */

const CSV_HEADERS = [
  'Societe',
  'Contact',
  'Telephone',
  'Email',
  'Ville',
  'Secteur',
  'Statut',
  'Score Selene',
  'Tier',
  'Angle Selene',
  'Prochain rappel',
] as const;

/**
 * Echappe une valeur pour un champ CSV : on quote systematiquement et on double
 * les guillemets internes. Couvre virgules, guillemets et sauts de ligne.
 */
function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Construit la chaine CSV des prospects deja filtres + tries (vue courante). */
function buildCsv(rows: IntelRowVM[]): string {
  const lines: string[] = [];
  lines.push(CSV_HEADERS.map(csvCell).join(','));
  for (const r of rows) {
    lines.push(
      [
        r.company,
        r.dirigeant,
        r.tel,
        r.email,
        r.city,
        r.sector,
        labelForStatus(r.status),
        r.score,
        r.tier,
        r.angleSelene,
        r.nextActionAt ? formatDate(r.nextActionAt) : '',
      ]
        .map(csvCell)
        .join(',')
    );
  }
  // CRLF : maximise la compatibilite tableurs (Excel FR notamment).
  return lines.join('\r\n');
}

/** Declenche le telechargement client du CSV (BOM UTF-8 pour les accents). */
function downloadCsv(rows: IntelRowVM[]): void {
  const csv = buildCsv(rows);
  const blob = new Blob(['﻿' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `liste-appel-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function IntelCallListClient({ rows }: { rows: IntelRowVM[] }) {
  const [q, setQ] = useState('');
  // Defaut : "A appeler" — on masque d'emblee les fiches terminees/traitees.
  const [filter, setFilter] = useState<Filter>('callable');
  // Toggle "Voir tout mon pipeline" : quand actif, on leve le masque "appelable"
  // (statuts non travaillables compris) tout en restant scope RLS/owner. Vue
  // purement client : la requete serveur ramene deja tous les statuts.
  const [allPipeline, setAllPipeline] = useState(false);

  const stats = useMemo(() => {
    const callable = rows.filter((r) => isCallable(r.status)).length;
    const withTel = rows.filter((r) => r.tel).length;
    const withValidEmail = rows.filter(
      (r) => r.email && r.emailStatus === 'valid'
    ).length;
    const enrichi = rows.filter((r) => r.enrichStatus === 'enrichi').length;
    return { total: rows.length, callable, withTel, withValidEmail, enrichi };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const validEmail = !!(r.email && r.emailStatus === 'valid');
      // "Voir tout mon pipeline" desactive le masque "appelable" du filtre
      // "A appeler". Les autres filtres (enrichi / email / tel) restent actifs.
      if (filter === 'callable' && !allPipeline && !isCallable(r.status))
        return false;
      if (filter === 'enrichi' && r.enrichStatus !== 'enrichi') return false;
      if (filter === 'with_email' && !validEmail) return false;
      if (filter === 'phone_only' && (validEmail || !r.tel)) return false;
      if (!needle) return true;
      return [r.company, r.dirigeant, r.city, r.sector, r.angle, r.angleSelene, r.scoreLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, filter, allPipeline]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* En-tete editorial */}
      <header className="relative mb-6 overflow-hidden">
        <span
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[110px] leading-none"
          aria-hidden
        >
          Appels
        </span>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" aria-hidden />
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
                Priorisation Selene
              </span>
            </span>
            <h1 className="mt-2 font-marcellus text-3xl leading-tight tracking-tight text-choco">
              Liste d&apos;appel
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6F5A50]">
              Prospects priorises par Selene (score de chaleur) et enrichis par
              l&apos;IA. Tries du plus chaud au plus froid ; les fiches traitees
              disparaissent toutes seules.
            </p>
          </div>
          {/* Stats compactes — chiffres en font-num */}
          <div className="flex flex-nowrap items-center gap-x-3 sm:justify-end">
            <Stat label="A appeler" value={stats.callable} accent />
            <Stat label="Prospects" value={stats.total} />
            <Stat label="Avec tel" value={stats.withTel} />
            <Stat label="Email ok" value={stats.withValidEmail} />
            <Stat label="Enrichis" value={stats.enrichi} />
          </div>
        </div>
      </header>

      {/* Recherche + filtres */}
      <div className="panel mb-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm/60" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une entreprise, un dirigeant, une ville..."
            className="w-full rounded-2xl border border-border-soft bg-cream/60 py-2.5 pl-11 pr-3 text-sm text-ink-warm placeholder:text-muted-warm/50 transition focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.value
                  ? 'bg-brand text-[#2A1810] shadow-soft'
                  : 'border border-border-soft bg-white text-ink-warm hover:bg-cream-deep'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle "tout mon pipeline" + export CSV de la vue courante */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label
          className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
            allPipeline
              ? 'border-brand bg-cream-deep text-brand-dark'
              : 'border-border-soft bg-white text-ink-warm hover:bg-cream-deep'
          } ${filter !== 'callable' ? 'opacity-50' : ''}`}
          title={
            filter === 'callable'
              ? 'Afficher aussi les fiches deja traitees (contactees, gagnees, perdues...)'
              : 'Ce filtre montre deja tous les statuts'
          }
        >
          <input
            type="checkbox"
            checked={allPipeline}
            disabled={filter !== 'callable'}
            onChange={(e) => setAllPipeline(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border-soft text-brand focus:ring-brand"
          />
          Voir tout mon pipeline
        </label>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border-soft bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-warm transition hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-50"
          title="Exporter la liste affichee (filtres + tri appliques) au format CSV"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Exporter CSV
          <span className="tabular-nums opacity-70">({filtered.length})</span>
        </button>
      </div>

      {/* Liste — deja triee par score Selene cote serveur (la plus chaude en tete) */}
      {filtered.length === 0 ? (
        <div className="panel flex items-center gap-3 p-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
            <PhoneCall className="h-5 w-5" aria-hidden />
          </span>
          <p className="flex-1 text-sm leading-relaxed text-[#6F5A50]">
            {rows.length === 0
              ? "Aucun prospect pour le moment. L'enrichissement Atlas remplira cette liste."
              : filter === 'callable' && !allPipeline
              ? 'Aucun prospect a appeler. Les fiches traitees sont masquees (active "Voir tout mon pipeline" ou le filtre "Tous").'
              : 'Aucun prospect ne correspond a ce filtre.'}
          </p>
        </div>
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

/** Stat compacte d'en-tete : valeur en font-num, label eyebrow dessous. */
function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col border-l border-[rgba(74,36,26,0.07)] pl-3 first:border-l-0 first:pl-0">
      <span className={`font-num tabular-nums text-lg leading-none ${accent ? 'text-brand-burnt' : 'text-choco'}`}>
        {value}
      </span>
      <span className="mt-1 whitespace-nowrap font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-warm">
        {label}
      </span>
    </div>
  );
}

/** Badge compact du score Selene : "Score 93 . A" + etiquette signal. */
function ScoreBadge({ r }: { r: IntelRowVM }) {
  if (!r.hasScore || r.score === null) return null;
  return (
    <span
      title={
        r.prioriteAppel != null
          ? `Priorite d'appel Selene #${r.prioriteAppel}`
          : 'Score de priorite Selene'
      }
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tierTone(r.tier)}`}
    >
      <Flame className="h-3 w-3" aria-hidden />
      <span className="font-num tabular-nums">{r.score}</span>
      {r.tier ? <span className="font-num tabular-nums opacity-80">&middot; {r.tier}</span> : null}
    </span>
  );
}

/**
 * Bloc "Pitch Selene" : ce que Selene recommande de DIRE au prospect.
 * Distinct de l'angle Atlas (enrichissement cascade FR) affiche au-dessus : ici
 * c'est le scoring Selene (angle de pitch + raisons + persona/fenetre). Discret,
 * collapsible. Ne s'affiche que si Selene a propose un angle.
 */
function PitchSelene({ r }: { r: IntelRowVM }) {
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

function IntelCard({ r }: { r: IntelRowVM }) {
  const href = telHref(r.tel);
  // Statut local : reflete immediatement l'issue d'un appel logue (optimiste),
  // tout en restant cale sur la valeur serveur au prochain revalidate.
  const [status, setStatus] = useState<string | null>(r.status);
  const [logOpen, setLogOpen] = useState(false);

  const presenceChips: string[] = [];
  if (r.presence) {
    if (r.presence.site === false) presenceChips.push('Pas de site');
    if (r.presence.techno) presenceChips.push(r.presence.techno);
    if (r.presence.mobile === false) presenceChips.push('Pas mobile');
    if (r.presence.https === false) presenceChips.push('Pas HTTPS');
    if (r.presence.social_actif) presenceChips.push('Social actif');
  }

  return (
    <li className="panel card-hover p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Infos */}
        <div className="min-w-0 flex-1">
          {/* Ligne 1 : nom + score (la SEULE pile chaude qui ressort en tete) */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link
              href={`/prospects/${r.id}`}
              className="font-marcellus text-lg text-choco underline-offset-4 transition hover:text-brand-dark hover:underline"
            >
              {r.company}
            </Link>
            <ScoreBadge r={r} />
            {status && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneForStatus(status)}`}>
                {labelForStatus(status)}
              </span>
            )}
          </div>

          {/* Ligne 2 : meta serree (dirigeant / ville / secteur) */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-warm">
            {r.dirigeant && <span className="font-medium text-ink-warm">{r.dirigeant}</span>}
            {r.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {r.city}
              </span>
            )}
            {r.sector && <span className="truncate">{r.sector}</span>}
          </div>

          {/* Ligne 3 : meta technique demotee (label + valeur), filet chaud */}
          {(r.scoreLabel || r.enrichStatus || r.confidence) && (
            <div className="divider-warm mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11px]">
              {r.scoreLabel && (
                <span className="text-[#6F5A50]">{r.scoreLabel}</span>
              )}
              {r.enrichStatus && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${statusTone(r.enrichStatus)}`}>
                  {statusLabel(r.enrichStatus)}
                </span>
              )}
              {r.confidence && (
                <span
                  title="Confiance globale de l'enrichissement"
                  className={`inline-flex items-center gap-1 font-semibold ${confidenceTone(r.confidence)}`}
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {r.confidence}
                </span>
              )}
            </div>
          )}

          {/* Angle GND = le pitch pret a l'emploi (enrichissement Atlas) */}
          {r.angle && (
            <div className="panel-accent mt-3 p-3">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-warm">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" aria-hidden />
                <span>
                  <span className="font-semibold text-brand-burnt">Angle : </span>
                  {r.angle}
                  {r.signal ? <span className="text-muted-warm"> &mdash; {r.signal}</span> : null}
                </span>
              </p>
            </div>
          )}

          {/* Pitch Selene = quoi dire (scoring Selene), complement de l'angle Atlas */}
          <PitchSelene r={r} />

          {/* Email + presence — pile chaudes nettoyees */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {r.email ? (
              <a
                href={`mailto:${r.email}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-cream/60 px-2 py-1 font-medium text-ink-warm hover:bg-cream-deep"
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
                className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2 py-0.5 font-medium text-[#6F5A50]"
              >
                <Globe className="h-3 w-3" aria-hidden />
                {c}
              </span>
            ))}
            {r.sourceCount > 0 && (
              <span className="inline-flex items-center gap-1 font-num tabular-nums text-muted-warm/70">
                <ExternalLink className="h-3 w-3" aria-hidden />
                {r.sourceCount} source{r.sourceCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Action phone-first — le CTA telephone ressort, le reste discret */}
        <div className="flex shrink-0 items-center gap-2 sm:w-48 sm:flex-col sm:items-stretch">
          {href ? (
            <a
              href={href}
              className="orange-glow inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-[#3A2017] shadow-soft-md transition hover:bg-brand-dark hover:-translate-y-0.5"
            >
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap font-num tabular-nums">{r.tel}</span>
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-deep px-5 py-2.5 text-sm font-medium text-muted-warm">
              <Phone className="h-5 w-5" aria-hidden />
              Pas de tel
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLogOpen((v) => !v)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                logOpen
                  ? 'bg-brand-pale text-brand-burnt ring-1 ring-[rgba(74,36,26,0.12)]'
                  : 'border border-border-soft bg-white text-[#6F5A50] hover:bg-cream-deep hover:text-choco'
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" aria-hidden />
              Loguer
            </button>
            <Link
              href={`/prospects/${r.id}`}
              className="inline-flex items-center justify-center gap-1 rounded-full border border-border-soft bg-white px-3 py-1.5 text-xs font-semibold text-[#6F5A50] transition hover:bg-cream-deep hover:text-choco"
            >
              Fiche
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* Panneau de log d'appel (statut + note + rappel) */}
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
