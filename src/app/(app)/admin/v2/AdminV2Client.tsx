'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Prospect } from '@/lib/prospects';
import { labelForStatus } from '@/lib/prospects';
import { formatEur } from '@/lib/ca-utils';
import type { AdminV2Data, CommercialStats } from './page';

// ─────────────────────────────────────────────────────────────────────
// Status & classification config
// ─────────────────────────────────────────────────────────────────────

type StatusKey =
  | 'a_contacter'
  | 'contacte'
  | 'rdv_pris'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu'
  | 'archived'
  | 'prospecte';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  a_contacter: {
    label: 'À contacter',
    bg: 'rgba(138,109,107,0.15)',
    color: '#A88E8B',
    border: 'rgba(138,109,107,0.3)',
  },
  contacte: {
    label: 'Contacté',
    bg: 'rgba(91,138,184,0.15)',
    color: '#6FA1CC',
    border: 'rgba(91,138,184,0.3)',
  },
  rdv_pris: {
    label: 'RDV pris',
    bg: 'rgba(123,112,196,0.15)',
    color: '#9087D1',
    border: 'rgba(123,112,196,0.3)',
  },
  devis_envoye: {
    label: 'Devis envoyé',
    bg: 'rgba(196,154,60,0.15)',
    color: '#D4B45D',
    border: 'rgba(196,154,60,0.3)',
  },
  gagne: {
    label: 'Devis signé',
    bg: 'rgba(90,138,63,0.15)',
    color: '#7BA85B',
    border: 'rgba(90,138,63,0.3)',
  },
  perdu: {
    label: 'Perdu',
    bg: 'rgba(181,66,31,0.15)',
    color: '#C76943',
    border: 'rgba(181,66,31,0.3)',
  },
  archived: {
    label: 'Archivé',
    bg: 'rgba(138,109,107,0.10)',
    color: '#8A6D6B',
    border: 'rgba(138,109,107,0.2)',
  },
  prospecte: {
    label: 'Prospecté',
    bg: 'rgba(138,109,107,0.15)',
    color: '#A88E8B',
    border: 'rgba(138,109,107,0.3)',
  },
};

const CLASSIF_CONFIG: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  '🔥 Chaud': {
    bg: 'rgba(232,133,61,0.12)',
    color: '#FFA060',
    border: 'rgba(232,133,61,0.30)',
  },
  '🌡️ Tiède': {
    bg: 'rgba(212,115,42,0.12)',
    color: '#E69947',
    border: 'rgba(212,115,42,0.30)',
  },
  '❄️ Froid': {
    bg: 'rgba(91,138,184,0.12)',
    color: '#7BA1C7',
    border: 'rgba(91,138,184,0.25)',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.a_contacter;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontFamily: 'var(--font-geist-mono, ui-monospace), monospace',
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

function ClassifBadge({ classification }: { classification: string | null }) {
  if (!classification) return null;
  const cfg = CLASSIF_CONFIG[classification];
  if (!cfg) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-geist-mono, ui-monospace), monospace',
          fontSize: 9,
          color: 'rgba(253,246,238,0.4)',
          letterSpacing: '0.12em',
        }}
      >
        {classification}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontFamily: 'var(--font-geist-mono, ui-monospace), monospace',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.15em',
        whiteSpace: 'nowrap',
      }}
    >
      {classification}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color =
    s >= 8 ? '#FFA060' : s >= 6 ? '#D4B45D' : s > 0 ? '#A88E8B' : '#5C504D';
  const bg =
    s >= 8
      ? 'rgba(232,133,61,0.12)'
      : s >= 6
      ? 'rgba(196,154,60,0.10)'
      : 'rgba(138,109,107,0.10)';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 1,
        background: bg,
        borderRadius: 8,
        padding: '4px 8px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: 18,
          fontWeight: 500,
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {s || '—'}
      </span>
      {s > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-geist-mono, ui-monospace), monospace',
            fontSize: 9,
            color: 'rgba(253,246,238,0.35)',
          }}
        >
          /10
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CompactSpeedometer
// ─────────────────────────────────────────────────────────────────────

function CompactSpeedometer({
  value,
  size = 88,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const angle = -135 + (v / 100) * 270;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'conic-gradient(from 90deg, #3D1F1E, #A0735C, #FDF6EE, #A0735C, #3D1F1E)',
          padding: 3,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 30%, #2A1311 0%, #0E0807 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="rgba(232,133,61,0.12)"
              strokeWidth="2.5"
              strokeDasharray="179"
              strokeDashoffset="60"
              transform="rotate(135 50 50)"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke={`url(#csg-${size})`}
              strokeWidth="2.5"
              strokeDasharray={`${(v / 100) * 179 * 0.665} 999`}
              transform="rotate(135 50 50)"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id={`csg-${size}`} x1="0" x2="1">
                <stop offset="0" stopColor="#D4732A" />
                <stop offset="1" stopColor="#FFA060" />
              </linearGradient>
            </defs>
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: size > 100 ? 28 : 20,
                fontWeight: 500,
                color: '#FDF6EE',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(v)}
              <span style={{ color: '#E8853D', fontSize: size > 100 ? 16 : 12 }}>%</span>
            </div>
            {label && (
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 8,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: '#E8853D',
                  marginTop: 4,
                }}
              >
                {label}
              </div>
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 2.5,
              height: size * 0.36,
              background:
                'linear-gradient(180deg,transparent 8%,#FDF6EE 12%,#FDF6EE 80%,#E8853D 100%)',
              borderRadius: 1,
              transformOrigin: '50% 100%',
              transform: `translate(-50%,-100%) rotate(${angle + 90}deg)`,
              transition: 'transform 1s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 8,
              height: 8,
              borderRadius: 999,
              background: 'radial-gradient(circle,#FDF6EE,#A0735C)',
              transform: 'translate(-50%,-50%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CompactRocket
// ─────────────────────────────────────────────────────────────────────

function CompactRocket({ palier, total = 5 }: { palier: number; total?: number }) {
  const safePalier = Math.max(0, Math.min(total, palier));
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'rgba(253,246,238,0.35)',
        }}
      >
        STRATO.
      </div>
      <div
        style={{
          position: 'relative',
          height: 90,
          width: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 1,
            background:
              'linear-gradient(180deg,rgba(232,133,61,0.4),rgba(232,133,61,0.1))',
            transform: 'translateX(-50%)',
          }}
        />
        {Array.from({ length: total }).map((_, i) => {
          const reached = total - 1 - i < safePalier;
          const isActive = total - 1 - i === safePalier - 1 && safePalier > 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${(i / (total - 1)) * 80}%`,
                left: '50%',
                transform: 'translate(-50%,-50%)',
                zIndex: 2,
              }}
            >
              {isActive ? (
                <svg
                  width="16"
                  height="22"
                  viewBox="0 0 44 64"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(232,133,61,0.8))' }}
                >
                  <path
                    d="M22 4 L30 18 L30 36 L14 36 L14 18 Z"
                    fill="#FDF6EE"
                    stroke="#A0735C"
                    strokeWidth="0.8"
                  />
                  <path d="M22 4 L30 18 L14 18 Z" fill="#E8853D" />
                  <circle cx="22" cy="24" r="4" fill="#E8853D" />
                  <path d="M14 30 L8 42 L14 36 Z" fill="#D4732A" />
                  <path d="M30 30 L36 42 L30 36 Z" fill="#D4732A" />
                  <path d="M16 36 Q20 44 22 40 Q24 44 28 36 Z" fill="#FFA060" />
                </svg>
              ) : (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: reached ? '#E8853D' : 'rgba(253,246,238,0.10)',
                    boxShadow: reached ? '0 0 6px rgba(232,133,61,0.5)' : 'none',
                    border: reached
                      ? '1px solid rgba(232,133,61,0.6)'
                      : '1px solid rgba(253,246,238,0.15)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'rgba(253,246,238,0.25)',
        }}
      >
        ATTERR.
      </div>
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#E8853D',
          marginTop: 2,
        }}
      >
        {safePalier}/{total}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CommercialCard
// ─────────────────────────────────────────────────────────────────────

function CommercialCard({ c }: { c: CommercialStats }) {
  return (
    <div
      style={{
        background: 'rgba(253,246,238,0.03)',
        border: '1px solid rgba(232,133,61,0.10)',
        borderRadius: 20,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            flexShrink: 0,
            background:
              'linear-gradient(135deg,rgba(232,133,61,0.25),rgba(196,154,60,0.15))',
            border: '1px solid rgba(232,133,61,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 18,
            fontWeight: 500,
            color: '#E8853D',
          }}
        >
          {c.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 18,
              fontWeight: 500,
              color: '#FDF6EE',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'rgba(232,133,61,0.7)',
              marginTop: 4,
            }}
          >
            {c.role_label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(253,246,238,0.3)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {c.email}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 14,
          padding: '14px 10px',
          border: '1px solid rgba(232,133,61,0.07)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CompactSpeedometer value={c.conversion} size={88} />
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'rgba(232,133,61,0.6)',
            }}
          >
            CONVERSION
          </div>
        </div>
        <div style={{ width: 1, height: 80, background: 'rgba(232,133,61,0.10)' }} />
        <CompactRocket palier={c.palier} total={5} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { label: 'PROSPECTS', value: c.total },
          { label: '🔥 CHAUDS', value: c.chauds },
          { label: 'RDV', value: c.rdv },
          { label: 'SIGNÉS', value: c.signatures },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              textAlign: 'center',
              background: 'rgba(253,246,238,0.03)',
              borderRadius: 10,
              padding: '8px 4px',
              border: '1px solid rgba(232,133,61,0.07)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: 22,
                fontWeight: 500,
                color: '#FDF6EE',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'rgba(253,246,238,0.3)',
                marginTop: 4,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {c.ca_signe > 0 && (
        <div
          style={{
            background: 'rgba(90,138,63,0.08)',
            border: '1px solid rgba(90,138,63,0.20)',
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'rgba(123,168,91,0.9)',
            }}
          >
            CA SIGNÉ
          </span>
          <span
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 16,
              fontWeight: 500,
              color: '#7BA85B',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatEur(c.ca_signe)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// AdminProspectsTable
// ─────────────────────────────────────────────────────────────────────

type SortKey = 'company_name' | 'classification' | 'status' | 'updated_at';

function AdminProspectsTable({
  prospects,
  commerciaux,
}: {
  prospects: Prospect[];
  commerciaux: { id: string; label: string; initials: string }[];
}) {
  const [sortCol, setSortCol] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    return [...prospects].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortCol === 'updated_at') {
        va = a.updated_at ?? '';
        vb = b.updated_at ?? '';
      } else {
        va = ((a as unknown as Record<string, unknown>)[sortCol] as string) ?? '';
        vb = ((b as unknown as Record<string, unknown>)[sortCol] as string) ?? '';
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      const d = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? d : -d;
    });
  }, [prospects, sortCol, sortDir]);

  const findCommercial = (id: string | null) =>
    id ? commerciaux.find((c) => c.id === id) : null;

  const cols: { key: SortKey | 'decisionnaire' | 'commercial'; label: string }[] = [
    { key: 'company_name', label: 'PROSPECT' },
    { key: 'classification', label: 'CLASSIF.' },
    { key: 'status', label: 'STATUT' },
    { key: 'decisionnaire', label: 'DÉCISIONNAIRE' },
    { key: 'commercial', label: 'COMMERCIAL' },
    { key: 'updated_at', label: 'MAJ' },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: 800,
        }}
      >
        <thead>
          <tr style={{ background: 'rgba(26,15,14,0.95)' }}>
            {cols.map((c) => {
              const sortable = (['company_name', 'classification', 'status', 'updated_at'] as string[]).includes(c.key);
              return (
                <th
                  key={c.key}
                  onClick={() => sortable && handleSort(c.key as SortKey)}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    cursor: sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    whiteSpace: 'nowrap',
                    color: sortCol === c.key ? '#E8853D' : 'rgba(253,246,238,0.35)',
                    borderBottom: `1px solid ${
                      sortCol === c.key
                        ? 'rgba(232,133,61,0.25)'
                        : 'rgba(232,133,61,0.08)'
                    }`,
                  }}
                >
                  {c.label}{' '}
                  {sortable && sortCol === c.key
                    ? sortDir === 'asc'
                      ? '↑'
                      : '↓'
                    : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const isArchived = p.status === 'archived';
            const commercial = findCommercial(p.assigned_to);
            return (
              <tr
                key={p.id}
                style={{
                  borderBottom: '1px solid rgba(232,133,61,0.06)',
                  opacity: isArchived ? 0.4 : 1,
                  background: i % 2 === 0 ? 'transparent' : 'rgba(253,246,238,0.01)',
                }}
              >
                <td style={{ padding: '11px 14px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-fraunces), Georgia, serif',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#FDF6EE',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {p.company_name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: 'rgba(253,246,238,0.28)',
                      marginTop: 2,
                    }}
                  >
                    {p.city ?? '—'}
                    {p.postal_code ? ` · ${p.postal_code}` : ''}
                  </div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <ClassifBadge classification={p.classification} />
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                      fontSize: 13,
                      color: 'rgba(253,246,238,0.7)',
                    }}
                  >
                    {p.prenom_contact || p.contact_name || '—'}
                  </div>
                  {p.role_contact && (
                    <div
                      style={{
                        fontFamily:
                          'var(--font-geist-mono), ui-monospace, monospace',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'rgba(253,246,238,0.28)',
                        marginTop: 2,
                      }}
                    >
                      {p.role_contact}
                    </div>
                  )}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {commercial ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          flexShrink: 0,
                          background:
                            'linear-gradient(135deg,rgba(232,133,61,0.25),rgba(196,154,60,0.15))',
                          border: '1px solid rgba(232,133,61,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-fraunces), Georgia, serif',
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#E8853D',
                        }}
                      >
                        {commercial.initials}
                      </div>
                      <span
                        style={{
                          fontFamily:
                            'var(--font-geist-sans), system-ui, sans-serif',
                          fontSize: 12,
                          color: 'rgba(253,246,238,0.6)',
                        }}
                      >
                        {commercial.label.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'rgba(253,246,238,0.25)',
                      }}
                    >
                      — non assigné
                    </span>
                  )}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      color: 'rgba(253,246,238,0.4)',
                    }}
                  >
                    {p.updated_at
                      ? new Date(p.updated_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(232,133,61,0.08)',
          background: 'rgba(26,15,14,0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'rgba(253,246,238,0.25)',
          }}
        >
          {prospects.filter((p) => p.status !== 'archived').length} ACTIFS /{' '}
          {prospects.length} TOTAL
        </span>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'rgba(232,133,61,0.35)',
          }}
        >
          GND PIPELINE · ADMIN V2
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SyncPanel
// ─────────────────────────────────────────────────────────────────────

function SyncPanel({
  commerciaux,
}: {
  commerciaux: { id: string; label: string; initials: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [target, setTarget] = useState<string>(commerciaux[0]?.id ?? '');
  const [lastResult, setLastResult] = useState<{
    inserted: number;
    updated: number;
    deleted: number;
    skipped: number;
    at: string | null;
  }>({ inserted: 0, updated: 0, deleted: 0, skipped: 0, at: null });

  const doSync = async () => {
    if (!target || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: target }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastResult({
          inserted: data.inserted ?? 0,
          updated: data.updated ?? 0,
          deleted: data.deleted ?? 0,
          skipped: data.skipped ?? 0,
          at: new Date().toISOString(),
        });
        startTransition(() => router.refresh());
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Erreur de sync : ${err.error ?? res.statusText}`);
      }
    } catch (e) {
      alert(`Erreur réseau : ${e instanceof Error ? e.message : 'inconnue'}`);
    } finally {
      setSyncing(false);
    }
  };

  const relativeSync = () => {
    if (!lastResult.at) return 'Pas encore syncé dans cette session';
    const diff = Date.now() - new Date(lastResult.at).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'Il y a quelques secondes';
    if (mins < 60) return `Il y a ${mins} min`;
    return `Il y a ${Math.floor(mins / 60)}h`;
  };

  return (
    <div
      style={{
        background: 'rgba(253,246,238,0.03)',
        border: '1px solid rgba(232,133,61,0.10)',
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ display: 'inline-block', width: 24, height: 1, background: '#E8853D' }} />
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: '#E8853D',
          }}
        >
          SYNC NOTION
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(253,246,238,0.3)',
          }}
        >
          {relativeSync()}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(253,246,238,0.3)',
            alignSelf: 'center',
            marginRight: 4,
          }}
        >
          Cible :
        </span>
        {commerciaux.map((c) => (
          <button
            key={c.id}
            onClick={() => setTarget(c.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              background:
                target === c.id ? 'rgba(232,133,61,0.15)' : 'rgba(253,246,238,0.04)',
              border: `1px solid ${
                target === c.id ? 'rgba(232,133,61,0.30)' : 'rgba(253,246,238,0.08)'
              }`,
              color: target === c.id ? '#E8853D' : 'rgba(253,246,238,0.4)',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            {c.label.split(' ')[0]}
          </button>
        ))}
      </div>

      <button
        onClick={doSync}
        disabled={syncing || isPending || !target}
        style={{
          width: '100%',
          padding: '11px 0',
          borderRadius: 12,
          cursor: syncing || isPending || !target ? 'not-allowed' : 'pointer',
          background:
            syncing || isPending
              ? 'rgba(232,133,61,0.08)'
              : 'linear-gradient(90deg,#D4732A,#E8853D,#FFA060)',
          border: syncing || isPending ? '1px solid rgba(232,133,61,0.18)' : 'none',
          color: syncing || isPending ? '#E8853D' : '#3D1F1E',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          boxShadow: syncing || isPending ? 'none' : '0 0 20px rgba(232,133,61,0.25)',
          marginBottom: 14,
        }}
      >
        {syncing ? 'SYNCHRONISATION EN COURS…' : 'Synchroniser Notion → Prospects'}
      </button>

      <div
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 10,
          padding: 12,
          border: '1px solid rgba(232,133,61,0.08)',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 10,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'INSERTED', value: lastResult.inserted, color: '#7BA85B' },
            { label: 'UPDATED', value: lastResult.updated, color: '#E8853D' },
            { label: 'DELETED', value: lastResult.deleted, color: '#C76943' },
            { label: 'SKIPPED', value: lastResult.skipped, color: 'rgba(253,246,238,0.3)' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 6,
                background: 'rgba(253,246,238,0.02)',
              }}
            >
              <span
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  fontSize: 9,
                  color: 'rgba(253,246,238,0.35)',
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: item.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────────────────────────────

export default function AdminV2Client({ data }: { data: AdminV2Data }) {
  const [commercialFilter, setCommercialFilter] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const filteredProspects = useMemo(() => {
    return data.prospects.filter((p) => {
      if (!showArchived && p.status === 'archived') return false;
      if (commercialFilter.length > 0 && !commercialFilter.includes(p.assigned_to ?? ''))
        return false;
      return true;
    });
  }, [data.prospects, commercialFilter, showArchived]);

  const adminFirstName = data.current_admin.name.split(/[\s.]+/)[0];

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#1A0F0E 0%,#100A09 100%)',
        minHeight: '100vh',
        margin: '-1.5rem -1rem',
      }}
    >
      {/* Hero */}
      <header
        style={{
          position: 'relative',
          padding: '32px 40px 28px',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(232,133,61,0.08)',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: -20,
            top: -40,
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 200,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'rgba(232,133,61,0.04)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Pipeline.
        </span>
        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 28, height: 1, background: '#E8853D' }} />
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.22em',
                  color: '#E8853D',
                }}
              >
                VUE ADMIN V2 · LIVE
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#E8853D',
                  boxShadow: '0 0 8px rgba(232,133,61,0.8)',
                  display: 'inline-block',
                  marginLeft: 4,
                }}
              />
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 52,
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: '#FDF6EE',
              margin: '0 0 10px',
            }}
          >
            Notre <span style={{ fontStyle: 'italic', color: '#E8853D' }}>pipeline</span>,{' '}
            {adminFirstName}.
          </h1>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'rgba(253,246,238,0.4)',
              marginBottom: 22,
            }}
          >
            GND CONSULTING · ADMIN GLOBAL ·{' '}
            {new Date()
              .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              .toUpperCase()}{' '}
            · {data.commerciaux.length} COMMERCIAL{data.commerciaux.length > 1 ? 'AUX' : ''} ACTIF
            {data.commerciaux.length > 1 ? 'S' : ''}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'PROSPECTS LIVE', value: data.kpi.live, sub: 'ACTIONNABLES' },
              {
                label: '🔥 CHAUDS',
                value: data.kpi.chauds,
                sub: 'PRIORITÉ HAUTE',
                accent: '#FFA060',
              },
              {
                label: 'SIGNATURES MOIS',
                value: data.kpi.signatures_mois,
                sub: new Date()
                  .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  .toUpperCase(),
                accent: '#7BA85B',
              },
              {
                label: 'CA SIGNÉ TOTAL',
                value: formatEur(data.kpi.ca_signe),
                sub: 'EUROS · TTC',
                accent: '#7BA85B',
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 16,
                  padding: '14px 18px',
                  border: '1px solid rgba(232,133,61,0.10)',
                  backgroundImage:
                    'radial-gradient(circle at 20% 0%,rgba(232,133,61,0.10) 0%,transparent 55%),linear-gradient(135deg,#3D1F1E 0%,#1A0F0E 100%)',
                  minWidth: 160,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    color: '#E8853D',
                    marginBottom: 8,
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: 36,
                    fontWeight: 500,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: k.accent ?? '#FDF6EE',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {k.value}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'rgba(253,246,238,0.35)',
                    marginTop: 8,
                  }}
                >
                  {k.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div
        style={{
          padding: '28px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Section commerciaux */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <span style={{ display: 'inline-block', width: 24, height: 1, background: '#E8853D' }} />
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: '#E8853D',
              }}
            >
              PERFORMANCE PAR COMMERCIAL
            </span>
          </div>
          {data.commerciaux.length === 0 ? (
            <div
              style={{
                background: 'rgba(253,246,238,0.03)',
                border: '1px solid rgba(232,133,61,0.10)',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: 16,
                color: 'rgba(253,246,238,0.5)',
              }}
            >
              Aucun commercial freelance enregistré.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(320px, 1fr))`,
                gap: 16,
              }}
            >
              {data.commerciaux.map((c) => (
                <CommercialCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>

        {/* Section pipeline complet */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 24, height: 1, background: '#E8853D' }} />
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.22em',
                  color: '#E8853D',
                }}
              >
                PIPELINE COMPLET
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginLeft: 'auto',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'rgba(253,246,238,0.3)',
                  marginRight: 4,
                }}
              >
                Filtrer :
              </span>
              {data.commerciaux.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setCommercialFilter((prev) =>
                      prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                    )
                  }
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: commercialFilter.includes(c.id)
                      ? 'rgba(232,133,61,0.15)'
                      : 'rgba(253,246,238,0.04)',
                    border: `1px solid ${
                      commercialFilter.includes(c.id)
                        ? 'rgba(232,133,61,0.30)'
                        : 'rgba(253,246,238,0.08)'
                    }`,
                    color: commercialFilter.includes(c.id)
                      ? '#E8853D'
                      : 'rgba(253,246,238,0.4)',
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                  }}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
              <button
                onClick={() => setShowArchived((v) => !v)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: showArchived
                    ? 'rgba(232,133,61,0.12)'
                    : 'rgba(253,246,238,0.04)',
                  border: `1px solid ${
                    showArchived ? 'rgba(232,133,61,0.25)' : 'rgba(253,246,238,0.08)'
                  }`,
                  color: showArchived ? '#E8853D' : 'rgba(253,246,238,0.4)',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                {showArchived ? '⊙' : '○'} Archivés
              </button>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(253,246,238,0.02)',
              border: '1px solid rgba(232,133,61,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <AdminProspectsTable
              prospects={filteredProspects}
              commerciaux={data.commercialOptions}
            />
          </div>
        </section>

        {/* Section sync */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 20,
          }}
        >
          <SyncPanel commerciaux={data.commercialOptions} />
        </section>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'rgba(253,246,238,0.25)',
            paddingTop: 8,
          }}
        >
          {labelForStatus('a_contacter') /* tree-shake guard */ ? '' : ''}
          GND CONSULTING · PLATEFORME INTERNE · ADMIN V2
        </div>
      </div>
    </div>
  );
}
