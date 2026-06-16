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
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: INK }}>
      {/* Header */}
      <header style={{ marginBottom: 30 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: BRAND_DARK,
            marginBottom: 10,
          }}
        >
          ADMIN · REPORTING AVANCÉ
        </div>
        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: CHOCO,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Reporting avancé
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: INK_SOFT, marginTop: 12, maxWidth: 660 }}>
          Funnel de conversion, prévision de chiffre d&apos;affaires pondérée par le
          pipeline, comparaison de périodes et export du carnet de prospects.
          Les montants sont réservés à cette console admin.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
          <Stat label="Prospects" value={String(totals.prospects)} color={CHOCO} />
          <Stat label="Deals ouverts" value={String(totals.openDeals)} color={BRAND_DARK} />
          <Stat label="Avec montant" value={String(totals.withAmount)} color={GREEN} />
        </div>
      </header>

      {/* Bloc 1 — Funnel de conversion */}
      <Section icon={GitBranch} eyebrow="BLOC 1" title="Funnel de conversion">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Nombre de prospects par étape du pipeline et taux de passage d&apos;une
          étape à la suivante. Les sorties (perdu / ne plus démarcher) sont
          exclues.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {funnel.map((stage) => {
            const widthPct = Math.max(2, Math.round((stage.count / maxFunnel) * 100));
            return (
              <div key={stage.columnId} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                <div style={{ flex: 1, position: 'relative', height: 30 }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      background: '#F3EADF',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${widthPct}%`,
                      borderRadius: 8,
                      background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 10,
                      minWidth: 34,
                      transition: 'width 0.4s ease',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: SANS,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2A1810',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stage.count}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 64,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontFamily: SANS,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color:
                      stage.conversionFromPrev == null
                        ? INK_FAINT
                        : stage.conversionFromPrev >= 0.5
                          ? GREEN
                          : BRAND_DARK,
                    fontVariantNumeric: 'tabular-nums',
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
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'baseline',
            marginBottom: 22,
            padding: '16px 18px',
            background: CREAM_HEAD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
          }}
        >
          <div>
            <div style={eyebrowStyle}>CA PONDÉRÉ ATTENDU</div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 30,
                fontWeight: 500,
                color: BRAND_DARK,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatEur(forecast.total)}
            </div>
          </div>
          <div style={{ color: INK_FAINT, fontSize: 13 }}>
            sur {formatEur(forecast.totalRaw)} de pipeline brut ouvert
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {forecast.breakdown.map((b) => {
            const widthPct = Math.max(2, Math.round((b.weightedAmount / maxForecast) * 100));
            return (
              <div key={b.columnId} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                  <span style={{ color: INK_FAINT, fontWeight: 500 }}>
                    {' '}· {Math.round(b.probability * 100)}%
                  </span>
                </div>
                <div style={{ flex: 1, position: 'relative', height: 30 }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: '#F3EADF' }} />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${widthPct}%`,
                      borderRadius: 8,
                      background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})`,
                      minWidth: 4,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 150,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontFamily: SANS,
                    fontSize: 12,
                    fontWeight: 600,
                    color: INK,
                    fontVariantNumeric: 'tabular-nums',
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
              padding: '11px 18px',
              borderRadius: 12,
              border: 'none',
              cursor: exportRows.length === 0 ? 'not-allowed' : 'pointer',
              background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
              color: '#2A1810',
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              opacity: exporting || exportRows.length === 0 ? 0.6 : 1,
              boxShadow: '0 1px 3px rgba(83,36,24,0.10)',
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
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: '24px 26px',
        marginBottom: 22,
        boxShadow: '0 1px 3px rgba(83,36,24,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'rgba(243,146,83,0.14)',
            border: '1px solid rgba(243,146,83,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: BRAND_DARK,
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <div>
          <div style={eyebrowStyle}>{eyebrow}</div>
          <h2
            style={{
              fontFamily: SERIF,
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
      <div style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(83,36,24,0.06)',
      }}
    >
      <div style={eyebrowStyle}>{label}</div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 26,
          fontWeight: 500,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
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
    <div
      style={{
        background: CREAM_HEAD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      <div style={eyebrowStyle}>{label}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 24,
            fontWeight: 500,
            color: CHOCO,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {current}
        </span>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 700,
            color: deltaColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatDeltaPct(deltaPct)}
        </span>
      </div>
      <div style={{ fontFamily: SANS, fontSize: 11.5, color: INK_FAINT, marginTop: 6 }}>
        vs {previous} le mois dernier
      </div>
    </div>
  );
}
