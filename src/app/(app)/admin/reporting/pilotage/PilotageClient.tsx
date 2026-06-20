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
          ADMIN · PILOTAGE LIVE
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
          Pilotage du carnet
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: INK_SOFT, marginTop: 12, maxWidth: 680 }}>
          Lecture de pilotage recalculee a chaque chargement directement depuis
          la base : volume, repartition par statut, enrichissement Atlas, qualite
          de la donnee et lecture phone-first. Tout est en nombres et en
          pourcentages, jamais en euros. C&apos;est le rapport que produit
          l&apos;agent, disponible sans l&apos;agent.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
          <Stat label="Base totale" value={String(baseTotale)} color={CHOCO} hint="Fiches maitres (hors fusionnees)" />
          <Stat label="A contacter" value={String(highlights.aContacter)} color={BRAND_DARK} hint="Pas encore approches" />
          <Stat label="Enrichis Atlas" value={String(enrichissement.distincts)} color={GREEN} hint={pct(pctEnrichis) + ' de la base'} />
          <Stat label="Non assignes" value={String(qualite.nonAssignes)} color={qualite.nonAssignes > 0 ? ROSE : INK_FAINT} hint="Sans commercial" />
        </div>
      </header>

      {/* Bloc 1 — Repartition par statut */}
      <Section icon={GitBranch} eyebrow="BLOC 1" title="Repartition par statut">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Nombre de prospects par statut et part de la base totale. Les statuts
          du debut de funnel (a contacter, contacte) face aux issues (devis
          signe, perdu) donnent l&apos;etat d&apos;avancement du carnet.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {repartition.map((r) => {
            const widthPct = Math.max(2, Math.round((r.count / maxRepart) * 100));
            const isHi = HIGHLIGHT_STATUSES.has(r.status);
            return (
              <div key={r.status} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 184,
                    flexShrink: 0,
                    fontFamily: SANS,
                    fontSize: 12.5,
                    fontWeight: isHi ? 700 : 600,
                    color: isHi ? CHOCO : INK,
                  }}
                >
                  {r.label}
                </div>
                <div style={{ flex: 1, position: 'relative', height: 28 }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: '#F3EADF' }} />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${widthPct}%`,
                      borderRadius: 8,
                      background: isHi
                        ? `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})`
                        : 'linear-gradient(90deg, #E8C9A8, #C99A6E)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 10,
                      minWidth: 30,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: SANS,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#2A1810',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {r.count}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: 52,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontFamily: SANS,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: INK_FAINT,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  title="Part de la base totale"
                >
                  {pct(r.pct)}
                </div>
              </div>
            );
          })}
          {repartition.length === 0 && (
            <div style={{ fontSize: 13, color: INK_FAINT }}>Aucun prospect dans la base.</div>
          )}
        </div>
      </Section>

      {/* Bloc 2 — Enrichissement Atlas */}
      <Section icon={Sparkles} eyebrow="BLOC 2" title="Enrichissement Atlas">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Prospects ayant une fiche d&apos;enrichissement Atlas (cascade FR), en
          ne gardant que la version la plus recente par prospect. Split selon le
          statut de l&apos;enrichissement.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          <MiniCard label="Prospects enrichis" value={String(enrichissement.distincts)} sub={pct(pctEnrichis) + ' de la base'} color={CHOCO} />
          <MiniCard label="Enrichi" value={String(enrichissement.enrichis)} sub="Donnees confirmees" color={GREEN} />
          <MiniCard label="A verifier (humain)" value={String(enrichissement.aVerifier)} sub="Revue manuelle requise" color={BRAND_DARK} />
          {enrichissement.autre > 0 && (
            <MiniCard label="Autre statut" value={String(enrichissement.autre)} sub="Statut intel non standard" color={INK_FAINT} />
          )}
        </div>
      </Section>

      {/* Bloc 3 — Qualite data */}
      <Section icon={ShieldAlert} eyebrow="BLOC 3" title="Qualite de la donnee">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Trous de donnees qui freinent le demarchage. Chaque chiffre est un
          nombre de fiches a corriger ou a assigner.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
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
      <Section icon={PhoneCall} eyebrow="BLOC 4" title="Lecture phone-first">
        <p style={{ fontSize: 13, color: INK_SOFT, margin: '0 0 18px', lineHeight: 1.5 }}>
          Le demarchage GND est d&apos;abord telephonique. On compare la part de
          la base joignable par telephone a la part avec un email valide
          {phoneFirst.emailEnrichmentDispo
            ? ' (statut valid cote enrichissement Atlas).'
            : " (a defaut d'enrichissement : email renseigne)."}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <p style={{ fontSize: 12, color: INK_FAINT, marginTop: 16, lineHeight: 1.5 }}>
            Repli : aucune ligne d&apos;enrichissement Atlas trouvee, l&apos;email
            valide est approxime par le nombre de fiches avec un email renseigne.
            Le chiffre se precisera des qu&apos;Atlas aura tourne sur la base.
          </p>
        )}
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
  icon: typeof Database;
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
    <div
      style={{
        flex: 1,
        minWidth: 168,
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
      {hint && (
        <div style={{ fontFamily: SANS, fontSize: 11, color: INK_FAINT, marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function MiniCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
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
          fontFamily: SERIF,
          fontSize: 24,
          fontWeight: 500,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 11.5, color: INK_FAINT, marginTop: 6 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 200,
          flexShrink: 0,
          fontFamily: SANS,
          fontSize: 12.5,
          fontWeight: 600,
          color: INK,
        }}
      >
        {label}
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
            background: color,
            minWidth: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <div
        style={{
          width: 120,
          flexShrink: 0,
          textAlign: 'right',
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 700,
          color: INK,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pct(ratio)}
        <span style={{ color: INK_FAINT, fontWeight: 500 }}>
          {' '}({count}/{total})
        </span>
      </div>
    </div>
  );
}
