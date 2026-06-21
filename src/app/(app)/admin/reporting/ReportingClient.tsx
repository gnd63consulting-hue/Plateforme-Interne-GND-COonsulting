'use client';

import { useMemo, useState } from 'react';
import { Download, TrendingUp, GitBranch, CalendarRange, Filter } from 'lucide-react';
import { formatEur } from '@/lib/ca-utils';
import { formatDeltaPct } from '@/lib/reporting';
import { labelForStatus } from '@/lib/prospects';
import type { ReportingPageData } from './page';

/* Design System crème/orange (valeurs verrouillées — alignées commissions/v2). */
const SERIF = 'var(--font-marcellus), Georgia, serif';
const SANS = 'var(--font-inter), system-ui, sans-serif';
const CHOCO = '#532418';
const INK = '#2A2320';
const INK_SOFT = '#7B665C';
const INK_FAINT = '#9B8A7E';
const BRAND = '#F39253';
const BRAND_DARK = '#B5601C';
const GREEN = '#4F7A38';
const ROSE = '#B5485B';
const CARD_BG = '#FFFFFF';
const CREAM_HEAD = '#FBF7F2';
const BORDER = '#E2D5C3';

/** Une ligne d'export prospect (commercial-facing → SANS montants). */
export type ProspectExportRow = {
  entreprise: string;
  contact: string;
  email: string;
  statut: string;
  commercial: string;
  date: string;
};

const CSV_HEADERS: { key: keyof ProspectExportRow; label: string }[] = [
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'contact', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'statut', label: 'Statut' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'date', label: 'Date' },
];

/** Échappe une valeur pour le CSV (guillemets, virgules, retours ligne). */
function csvCell(value: string): string {
  const v = value ?? '';
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildCsv(rows: ProspectExportRow[]): string {
  const head = CSV_HEADERS.map((h) => csvCell(h.label)).join(',');
  const body = rows
    .map((r) =>
      CSV_HEADERS.map((h) => {
        if (h.key === 'statut') return csvCell(labelForStatus(r.statut));
        if (h.key === 'date' && r.date) {
          // ISO → JJ/MM/AAAA pour lisibilité tableur FR.
          const d = new Date(r.date);
          return Number.isFinite(d.getTime())
            ? csvCell(
                `${String(d.getDate()).padStart(2, '0')}/${String(
                  d.getMonth() + 1
                ).padStart(2, '0')}/${d.getFullYear()}`
              )
            : csvCell(r.date);
        }
        return csvCell(r[h.key]);
      }).join(',')
    )
    .join('\n');
  return `${head}\n${body}`;
}

export default function ReportingClient({ data }: { data: ReportingPageData }) {
  const { funnel, forecast, compare, periodLabels, exportRows, totals } = data;

  const [exporting, setExporting] = useState(false);

  const maxFunnel = useMemo(
    () => Math.max(1, ...funnel.map((s) => s.count)),
    [funnel]
  );
  const maxForecast = useMemo(
    () => Math.max(1, ...forecast.breakdown.map((b) => b.weightedAmount)),
    [forecast]
  );

  function handleExport() {
    setExporting(true);
    try {
      // BOM ﻿ → Excel FR ouvre l'UTF-8 correctement (accents).
      const csv = '﻿' + buildCsv(exportRows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gnd-prospects-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 64px', color: INK }}>
      {/* Header — ancre cockpit chocolat */}
      <header
        className="surface-chocolate relative overflow-hidden"
        style={{ borderRadius: 16, padding: '22px 24px', marginBottom: 22 }}
      >
        <span
          aria-hidden
          className="font-marcellus"
          style={{
            position: 'absolute',
            top: -22,
            right: -6,
            fontSize: 110,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: 'rgba(251,247,241,0.08)',
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Reporting
        </span>
        <div style={{ position: 'relative' }}>
          <span className="inline-flex items-center gap-2" style={{ marginBottom: 10 }}>
            <span
              aria-hidden
              style={{ width: 16, height: 1, background: 'linear-gradient(90deg, #F39253, transparent)', display: 'inline-block' }}
            />
            <span
              className="font-grotesk"
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.13em',
                color: '#E0A572',
              }}
            >
              Admin · Reporting avancé
            </span>
          </span>
          <h1
            className="font-marcellus"
            style={{
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              color: '#FBF7F1',
              margin: 0,
              lineHeight: 1.08,
            }}
          >
            Reporting avancé
          </h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(251,247,241,0.55)', marginTop: 10, maxWidth: 620 }}>
            Funnel de conversion, prévision de chiffre d&apos;affaires pondérée par le
            pipeline, comparaison de périodes et export du carnet de prospects.
            Les montants sont réservés à cette console admin.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            <Stat label="Prospects" value={String(totals.prospects)} />
            <Stat label="Deals ouverts" value={String(totals.openDeals)} />
            <Stat label="Avec montant" value={String(totals.withAmount)} />
          </div>
        </div>
      </header>

      {/* Bloc 1 — Funnel de conversion */}
      <Section icon={GitBranch} eyebrow="BLOC 1" title="Funnel de conversion">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Nombre de prospects par étape du pipeline et taux de passage d&apos;une
          étape à la suivante. Les sorties (perdu / ne plus démarcher) sont
          exclues.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funnel.map((stage) => {
            const widthPct = Math.max(2, Math.round((stage.count / maxFunnel) * 100));
            return (
              <div key={stage.columnId} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 168,
                    flexShrink: 0,
                    fontFamily: SANS,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: INK,
                  }}
                >
                  {stage.label}
                </div>
                <div style={{ flex: 1, position: 'relative', height: 34 }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 999,
                      background: '#F4ECE1',
                      boxShadow: 'inset 0 1px 2px rgba(83,36,24,0.05)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${widthPct}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})`,
                      boxShadow: '0 1px 4px rgba(181,96,28,0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 12,
                      minWidth: 38,
                      transition: 'width 0.4s ease',
                    }}
                  >
                    <span
                      className="font-num tabular-nums"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2A1810',
                      }}
                    >
                      {stage.count}
                    </span>
                  </div>
                </div>
                <div
                  className="font-num tabular-nums"
                  style={{
                    width: 64,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color:
                      stage.conversionFromPrev == null
                        ? INK_FAINT
                        : stage.conversionFromPrev >= 0.5
                          ? GREEN
                          : BRAND_DARK,
                  }}
                  title="Taux de conversion depuis l'étape précédente"
                >
                  {stage.conversionFromPrev == null
                    ? '—'
                    : `${Math.round(stage.conversionFromPrev * 100)}%`}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bloc 2 — Forecast pondéré */}
      <Section icon={TrendingUp} eyebrow="BLOC 2" title="Prévision de CA pondérée">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          CA attendu = Σ (montant du deal × probabilité de l&apos;étape) sur les
          deals encore ouverts (hors signés et sorties). Les probabilités par
          défaut sont ajustables dans{' '}
          <code style={{ fontSize: 12, color: CHOCO }}>STAGE_PROBABILITY</code>{' '}
          (src/lib/reporting.ts).
        </p>

        <div
          className="panel-accent"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            alignItems: 'baseline',
            marginBottom: 18,
            padding: 16,
            borderRadius: 14,
          }}
        >
          <div>
            <div
              className="font-grotesk"
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: BRAND_DARK,
                marginBottom: 6,
              }}
            >
              CA pondéré attendu
            </div>
            <div
              className="font-num tabular-nums"
              style={{
                fontSize: 31,
                fontWeight: 600,
                color: BRAND_DARK,
                lineHeight: 1,
              }}
            >
              {formatEur(forecast.total)}
            </div>
          </div>
          <div className="font-num tabular-nums" style={{ color: INK_SOFT, fontSize: 13 }}>
            sur {formatEur(forecast.totalRaw)} de pipeline brut ouvert
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {forecast.breakdown.map((b) => {
            const widthPct = Math.max(2, Math.round((b.weightedAmount / maxForecast) * 100));
            return (
              <div key={b.columnId} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 168,
                    flexShrink: 0,
                    fontFamily: SANS,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: INK,
                  }}
                >
                  {b.label}
                  <span className="font-num tabular-nums" style={{ color: INK_FAINT, fontWeight: 500 }}>
                    {' '}· {Math.round(b.probability * 100)}%
                  </span>
                </div>
                <div style={{ flex: 1, position: 'relative', height: 34 }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 999,
                      background: '#F4ECE1',
                      boxShadow: 'inset 0 1px 2px rgba(83,36,24,0.05)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${widthPct}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})`,
                      boxShadow: '0 1px 4px rgba(181,96,28,0.28)',
                      minWidth: 6,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div
                  className="font-num tabular-nums"
                  style={{
                    width: 150,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: 600,
                    color: INK,
                  }}
                >
                  {formatEur(b.weightedAmount)}
                  <span style={{ color: INK_FAINT, fontWeight: 500 }}>
                    {' '}({b.dealCount})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bloc 3 — Comparaison de périodes */}
      <Section
        icon={CalendarRange}
        eyebrow="BLOC 3"
        title="Comparaison de périodes"
      >
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          <strong style={{ color: CHOCO, textTransform: 'capitalize' }}>{periodLabels.current}</strong>{' '}
          comparé à{' '}
          <strong style={{ color: CHOCO, textTransform: 'capitalize' }}>{periodLabels.previous}</strong>.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
          }}
        >
          <CompareCard
            label="Nouveaux prospects"
            current={String(compare.current.newProspects)}
            previous={String(compare.previous.newProspects)}
            deltaPct={compare.deltas.newProspects.deltaPct}
          />
          <CompareCard
            label="Deals gagnés"
            current={String(compare.current.dealsWon)}
            previous={String(compare.previous.dealsWon)}
            deltaPct={compare.deltas.dealsWon.deltaPct}
          />
          <CompareCard
            label="CA signé"
            current={formatEur(compare.current.caSigned)}
            previous={formatEur(compare.previous.caSigned)}
            deltaPct={compare.deltas.caSigned.deltaPct}
          />
          <CompareCard
            label="Commissions (base)"
            current={formatEur(compare.current.commissions)}
            previous={formatEur(compare.previous.commissions)}
            deltaPct={compare.deltas.commissions.deltaPct}
          />
        </div>
      </Section>

      {/* Bloc 4 — Export CSV */}
      <Section icon={Download} eyebrow="BLOC 4" title="Export CSV">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Export du carnet de prospects ({exportRows.length} lignes) :
          entreprise, contact, email, statut, commercial, date.{' '}
          <strong style={{ color: CHOCO }}>Aucun montant financier</strong> n&apos;est
          inclus (export partageable côté commercial).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || exportRows.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '12px 22px',
              borderRadius: 999,
              border: 'none',
              cursor: exportRows.length === 0 ? 'not-allowed' : 'pointer',
              background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
              color: '#2A1810',
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              opacity: exporting || exportRows.length === 0 ? 0.6 : 1,
              boxShadow: '0 6px 18px rgba(243,146,83,0.30), 0 1px 3px rgba(83,36,24,0.10)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <Download size={16} strokeWidth={2} />
            {exporting ? 'Export…' : 'Exporter le carnet (CSV)'}
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: INK_FAINT }}>
            <Filter size={13} strokeWidth={1.6} />
            {exportRows.length} prospect{exportRows.length > 1 ? 's' : ''}
          </span>
        </div>
      </Section>
    </div>
  );
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 9,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: INK_FAINT,
  marginBottom: 8,
};

function Section({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="panel"
      style={{
        position: 'relative',
        padding: 16,
        marginBottom: 16,
      }}
    >
      <span
        aria-hidden
        className="font-num tabular-nums"
        style={{
          position: 'absolute',
          top: 16,
          right: 18,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: BRAND_DARK,
          opacity: 0.4,
        }}
      >
        {eyebrow}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          paddingBottom: 13,
          borderBottom: '1px solid rgba(74,36,26,0.07)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'rgba(243,146,83,0.14)',
            border: '1px solid rgba(243,146,83,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: BRAND_DARK,
            flexShrink: 0,
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
          }}
        >
          <Icon size={17} strokeWidth={1.8} />
        </div>
        <div>
          <span className="inline-flex items-center gap-2" style={{ marginBottom: 3 }}>
            <span
              aria-hidden
              style={{ width: 14, height: 1, background: 'linear-gradient(90deg, #F39253, transparent)', display: 'inline-block' }}
            />
            <span
              className="font-grotesk"
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.13em',
                color: BRAND_DARK,
              }}
            >
              {eyebrow}
            </span>
          </span>
          <h2
            className="font-marcellus"
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: CHOCO,
              margin: 0,
              lineHeight: 1,
            }}
          >
            {title}
          </h2>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 132,
        position: 'relative',
        background: 'rgba(251,247,241,0.06)',
        border: '1px solid rgba(251,247,241,0.12)',
        borderRadius: 13,
        padding: '12px 16px',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 14,
          left: 0,
          width: 3,
          height: 20,
          borderRadius: 2,
          background: BRAND,
        }}
      />
      <div
        className="font-grotesk"
        style={{
          paddingLeft: 12,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'rgba(251,247,241,0.5)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        className="font-num tabular-nums"
        style={{
          paddingLeft: 12,
          fontSize: 26,
          fontWeight: 600,
          color: '#FBF7F1',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CompareCard({
  label,
  current,
  previous,
  deltaPct,
}: {
  label: string;
  current: string;
  previous: string;
  deltaPct: number | null;
}) {
  const positive = deltaPct != null && deltaPct > 0;
  const negative = deltaPct != null && deltaPct < 0;
  const deltaColor = positive ? GREEN : negative ? ROSE : INK_FAINT;
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div
        className="font-grotesk"
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: INK_SOFT,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          className="font-num tabular-nums"
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: CHOCO,
            lineHeight: 1,
          }}
        >
          {current}
        </span>
        <span
          className="font-num tabular-nums"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: deltaColor,
          }}
        >
          {formatDeltaPct(deltaPct)}
        </span>
      </div>
      <div className="font-num tabular-nums" style={{ fontSize: 11.5, color: INK_FAINT, marginTop: 6 }}>
        vs {previous} le mois dernier
      </div>
    </div>
  );
}
