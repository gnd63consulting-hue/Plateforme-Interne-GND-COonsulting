'use client';

import { useMemo } from 'react';
import {
  Database,
  GitBranch,
  Sparkles,
  ShieldAlert,
  PhoneCall,
} from 'lucide-react';

/* Design System creme/orange (valeurs verrouillees — alignees reporting/commissions). */
const CHOCO = '#532418';
const INK = '#2A2320';
const INK_SOFT = '#7B665C';
const INK_FAINT = '#9B8A7E';
const BRAND = '#F39253';
const BRAND_DARK = '#B5601C';
const GREEN = '#4F7A38';
const ROSE = '#B5485B';

export type PilotageData = {
  adminName: string;
  baseTotale: number;
  repartition: { status: string; label: string; count: number; pct: number }[];
  highlights: {
    aContacter: number;
    contacte: number;
    rdvPris: number;
    gagne: number;
    perdu: number;
  };
  enrichissement: {
    distincts: number;
    enrichis: number;
    aVerifier: number;
    autre: number;
  };
  qualite: {
    sansTel: number;
    sansEmail: number;
    nonAssignes: number;
    avecTel: number;
  };
  phoneFirst: {
    avecTel: number;
    pctTel: number;
    emailValide: number;
    pctEmailValide: number;
    emailEnrichmentDispo: boolean;
  };
};

/** Statuts mis en avant dans la barre de tete (lecture rapide du funnel). */
const HIGHLIGHT_STATUSES = new Set(['a_contacter', 'contacte', 'rdv_pris', 'gagne', 'perdu']);

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function PilotageClient({ data }: { data: PilotageData }) {
  const { baseTotale, repartition, highlights, enrichissement, qualite, phoneFirst } = data;

  const maxRepart = useMemo(
    () => Math.max(1, ...repartition.map((r) => r.count)),
    [repartition]
  );

  const pctEnrichis =
    baseTotale > 0 ? enrichissement.distincts / baseTotale : 0;

  return (
    <div className="mx-auto max-w-[1040px] px-7 pb-16 pt-10 text-ink-warm">
      {/* Header */}
      <header className="relative mb-9 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[120px] leading-none"
        >
          Live
        </span>
        <div className="relative">
          <span className="label-eyebrow text-[11px] uppercase tracking-[0.14em] text-brand-burnt">
            Admin · Pilotage live
          </span>
          <h1 className="mt-3 font-marcellus text-[34px] font-medium leading-[1.08] tracking-[-0.01em] text-choco">
            Pilotage du carnet
          </h1>
          <p className="mt-3 max-w-[680px] text-sm leading-[1.55] text-[#6F5A50]">
            Lecture de pilotage recalculee a chaque chargement directement depuis
            la base : volume, repartition par statut, enrichissement Atlas, qualite
            de la donnee et lecture phone-first. Tout est en nombres et en
            pourcentages, jamais en euros. C&apos;est le rapport que produit
            l&apos;agent, disponible sans l&apos;agent.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Base totale" value={String(baseTotale)} color={CHOCO} hint="Fiches maitres (hors fusionnees)" />
            <Stat label="A contacter" value={String(highlights.aContacter)} color={BRAND_DARK} hint="Pas encore approches" />
            <Stat label="Enrichis Atlas" value={String(enrichissement.distincts)} color={GREEN} hint={pct(pctEnrichis) + ' de la base'} />
            <Stat label="Non assignes" value={String(qualite.nonAssignes)} color={qualite.nonAssignes > 0 ? ROSE : INK_FAINT} hint="Sans commercial" />
          </div>
        </div>
      </header>

      {/* Bloc 1 — Repartition par statut */}
      <Section icon={GitBranch} eyebrow="Bloc 1" title="Repartition par statut">
        <p className="mb-5 text-[13px] leading-[1.5] text-[#6F5A50]">
          Nombre de prospects par statut et part de la base totale. Les statuts
          du debut de funnel (a contacter, contacte) face aux issues (devis
          signe, perdu) donnent l&apos;etat d&apos;avancement du carnet.
        </p>
        <div className="flex flex-col gap-2.5">
          {repartition.map((r) => {
            const widthPct = Math.max(2, Math.round((r.count / maxRepart) * 100));
            const isHi = HIGHLIGHT_STATUSES.has(r.status);
            return (
              <div key={r.status} className="flex items-center gap-3.5">
                <div
                  className="w-[150px] shrink-0 font-inter text-[12.5px] sm:w-[184px]"
                  style={{ fontWeight: isHi ? 700 : 600, color: isHi ? CHOCO : INK }}
                >
                  {r.label}
                </div>
                <div className="relative h-7 flex-1">
                  <div className="absolute inset-0 rounded-lg bg-cream-deep" />
                  <div
                    className="absolute bottom-0 left-0 top-0 flex min-w-[30px] items-center justify-end rounded-lg pr-2.5"
                    style={{
                      width: `${widthPct}%`,
                      background: isHi
                        ? `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})`
                        : 'linear-gradient(90deg, #E8C9A8, #C99A6E)',
                      boxShadow: isHi ? '0 1px 6px rgba(243,146,83,0.35)' : 'none',
                    }}
                  >
                    <span className="font-inter text-[11.5px] font-bold tabular-nums text-[#2A1810]">
                      {r.count}
                    </span>
                  </div>
                </div>
                <div
                  className="w-[52px] shrink-0 text-right font-inter text-[11.5px] font-semibold tabular-nums text-muted-warm"
                  title="Part de la base totale"
                >
                  {pct(r.pct)}
                </div>
              </div>
            );
          })}
          {repartition.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[rgba(74,36,26,0.10)] bg-cream/60 px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-pale text-brand-dark">
                <GitBranch size={20} strokeWidth={1.8} />
              </span>
              <div className="text-[13px] text-muted-warm">Aucun prospect dans la base.</div>
            </div>
          )}
        </div>
      </Section>

      {/* Bloc 2 — Enrichissement Atlas */}
      <Section icon={Sparkles} eyebrow="Bloc 2" title="Enrichissement Atlas" accent>
        <p className="mb-5 text-[13px] leading-[1.5] text-cream/80">
          Prospects ayant une fiche d&apos;enrichissement Atlas (cascade FR), en
          ne gardant que la version la plus recente par prospect. Split selon le
          statut de l&apos;enrichissement.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <MiniCard label="Prospects enrichis" value={String(enrichissement.distincts)} sub={pct(pctEnrichis) + ' de la base'} color={CHOCO} onDark />
          <MiniCard label="Enrichi" value={String(enrichissement.enrichis)} sub="Donnees confirmees" color={GREEN} onDark />
          <MiniCard label="A verifier (humain)" value={String(enrichissement.aVerifier)} sub="Revue manuelle requise" color={BRAND_DARK} onDark />
          {enrichissement.autre > 0 && (
            <MiniCard label="Autre statut" value={String(enrichissement.autre)} sub="Statut intel non standard" color={INK_FAINT} onDark />
          )}
        </div>
      </Section>

      {/* Bloc 3 — Qualite data */}
      <Section icon={ShieldAlert} eyebrow="Bloc 3" title="Qualite de la donnee">
        <p className="mb-5 text-[13px] leading-[1.5] text-[#6F5A50]">
          Trous de donnees qui freinent le demarchage. Chaque chiffre est un
          nombre de fiches a corriger ou a assigner.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <MiniCard
            label="Sans telephone"
            value={String(qualite.sansTel)}
            sub={baseTotale > 0 ? pct(qualite.sansTel / baseTotale) + ' de la base' : 'n/a'}
            color={qualite.sansTel > 0 ? ROSE : GREEN}
          />
          <MiniCard
            label="Sans email"
            value={String(qualite.sansEmail)}
            sub={baseTotale > 0 ? pct(qualite.sansEmail / baseTotale) + ' de la base' : 'n/a'}
            color={qualite.sansEmail > 0 ? BRAND_DARK : GREEN}
          />
          <MiniCard
            label="Non assignes"
            value={String(qualite.nonAssignes)}
            sub={baseTotale > 0 ? pct(qualite.nonAssignes / baseTotale) + ' de la base' : 'n/a'}
            color={qualite.nonAssignes > 0 ? ROSE : GREEN}
          />
        </div>
      </Section>

      {/* Bloc 4 — Lecture phone-first */}
      <Section icon={PhoneCall} eyebrow="Bloc 4" title="Lecture phone-first">
        <p className="mb-5 text-[13px] leading-[1.5] text-[#6F5A50]">
          Le demarchage GND est d&apos;abord telephonique. On compare la part de
          la base joignable par telephone a la part avec un email valide
          {phoneFirst.emailEnrichmentDispo
            ? ' (statut valid cote enrichissement Atlas).'
            : " (a defaut d'enrichissement : email renseigne)."}
        </p>
        <div className="flex flex-col gap-4">
          <Gauge
            label="Joignables par telephone"
            count={phoneFirst.avecTel}
            total={baseTotale}
            ratio={phoneFirst.pctTel}
            color={BRAND_DARK}
          />
          <Gauge
            label={phoneFirst.emailEnrichmentDispo ? 'Email valide (Atlas)' : 'Email renseigne'}
            count={phoneFirst.emailValide}
            total={baseTotale}
            ratio={phoneFirst.pctEmailValide}
            color={GREEN}
          />
        </div>
        {!phoneFirst.emailEnrichmentDispo && (
          <p className="mt-4 rounded-2xl border border-[rgba(74,36,26,0.10)] bg-cream/50 px-4 py-3 text-xs leading-[1.5] text-muted-warm">
            Repli : aucune ligne d&apos;enrichissement Atlas trouvee, l&apos;email
            valide est approxime par le nombre de fiches avec un email renseigne.
            Le chiffre se precisera des qu&apos;Atlas aura tourne sur la base.
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  children,
  accent = false,
}: {
  icon: typeof Database;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={
        accent
          ? 'surface-chocolate mb-6 rounded-3xl p-7'
          : 'surface-ceramic mb-6 rounded-3xl p-7'
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={
            accent
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/20 text-brand p-2.5'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-dark p-2.5'
          }
        >
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div>
          <div
            className={
              accent
                ? 'font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand'
                : 'font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-burnt'
            }
          >
            {eyebrow}
          </div>
          <h2
            className={
              accent
                ? 'font-marcellus text-[21px] font-medium leading-none text-cream'
                : 'font-marcellus text-[21px] font-medium leading-none text-choco'
            }
          >
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className="surface-ceramic rounded-3xl p-6">
      <div className="font-inter text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-burnt">
        {label}
      </div>
      <div
        className="mt-2 font-marcellus text-[30px] font-medium leading-none tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 font-inter text-[11px] text-muted-warm">{hint}</div>
      )}
    </div>
  );
}

function MiniCard({
  label,
  value,
  sub,
  color,
  onDark = false,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  onDark?: boolean;
}) {
  return (
    <div
      className={
        onDark
          ? 'rounded-2xl border border-cream/15 bg-cream/[0.06] p-5'
          : 'rounded-2xl border border-[rgba(74,36,26,0.10)] bg-cream/60 p-5'
      }
    >
      <div
        className={
          onDark
            ? 'font-inter text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/70'
            : 'font-inter text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-burnt'
        }
      >
        {label}
      </div>
      <div
        className="mt-2 font-marcellus text-[26px] font-medium leading-none tabular-nums"
        style={{ color: onDark ? '#FBF7F1' : color }}
      >
        {value}
      </div>
      <div
        className={
          onDark
            ? 'mt-2 font-inter text-[11.5px] text-cream/60'
            : 'mt-2 font-inter text-[11.5px] text-muted-warm'
        }
      >
        {sub}
      </div>
    </div>
  );
}

function Gauge({
  label,
  count,
  total,
  ratio,
  color,
}: {
  label: string;
  count: number;
  total: number;
  ratio: number;
  color: string;
}) {
  const widthPct = Math.max(2, Math.min(100, Math.round(ratio * 100)));
  return (
    <div className="flex items-center gap-3.5">
      <div className="w-[140px] shrink-0 font-inter text-[12.5px] font-semibold text-ink-warm sm:w-[200px]">
        {label}
      </div>
      <div className="relative h-[30px] flex-1">
        <div className="absolute inset-0 rounded-lg bg-cream-deep" />
        <div
          className="absolute bottom-0 left-0 top-0 min-w-[4px] rounded-lg transition-[width] duration-500 ease-out"
          style={{ width: `${widthPct}%`, background: color }}
        />
      </div>
      <div className="w-[110px] shrink-0 text-right font-inter text-xs font-bold tabular-nums text-ink-warm">
        {pct(ratio)}
        <span className="font-medium text-muted-warm">
          {' '}({count}/{total})
        </span>
      </div>
    </div>
  );
}
