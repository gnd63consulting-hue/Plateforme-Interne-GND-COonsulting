'use client';

import { formatEur } from '@/lib/ca-utils';

export type CommercialRank = {
  id: string;
  name: string;
  initials: string;
  prospects: number;
  signatures: number;
  ca: number;
};

export default function ClassementSection({
  ranking,
}: {
  ranking: CommercialRank[];
}) {
  if (ranking.length === 0) return null;

  const max = Math.max(1, ...ranking.map((r) => r.ca));

  return (
    <div
      style={{
        background: 'rgba(253,246,238,0.03)',
        border: '1px solid rgba(232,133,61,0.10)',
        borderRadius: 18,
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 1,
            background: '#E8853D',
          }}
        />
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
          CLASSEMENT COMMERCIAUX
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
          tri par CA pipeline
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranking.map((r, i) => {
          const ratio = r.ca / max;
          const isFirst = i === 0;
          return (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px auto 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 12,
                background: isFirst
                  ? 'rgba(232,133,61,0.08)'
                  : 'rgba(0,0,0,0.15)',
                border: `1px solid ${
                  isFirst ? 'rgba(232,133,61,0.25)' : 'rgba(232,133,61,0.08)'
                }`,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 22,
                  fontWeight: 500,
                  color: isFirst ? '#FFA060' : 'rgba(253,246,238,0.4)',
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {isFirst ? '🏆' : `#${i + 1}`}
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background:
                    'linear-gradient(135deg, rgba(232,133,61,0.30), rgba(196,154,60,0.18))',
                  border: '1px solid rgba(232,133,61,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#E8853D',
                }}
              >
                {r.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#FDF6EE',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginTop: 4,
                    fontFamily:
                      'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'rgba(253,246,238,0.4)',
                  }}
                >
                  <span>{r.prospects} prospects</span>
                  <span>·</span>
                  <span>{r.signatures} sign.</span>
                </div>
                <div
                  style={{
                    height: 4,
                    marginTop: 8,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(2, ratio * 100)}%`,
                      background:
                        'linear-gradient(90deg, #D4732A, #E8853D, #FFA060)',
                      borderRadius: 999,
                      transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 18,
                  fontWeight: 500,
                  color: '#E8853D',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatEur(r.ca)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
