'use client';

export type FunnelStage = {
  status: string;
  label: string;
  count: number;
};

export default function FunnelSection({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));

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
          FUNNEL DE CONVERSION
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stages.map((stage, i) => {
          const widthPct = (stage.count / max) * 100;
          const prev = i > 0 ? stages[i - 1].count : null;
          const conv = prev && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
          const intensity = i / Math.max(1, stages.length - 1);
          return (
            <div
              key={stage.status}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  width: 130,
                  flexShrink: 0,
                  fontFamily:
                    'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'rgba(253,246,238,0.7)',
                }}
              >
                {stage.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 26,
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 6,
                  border: '1px solid rgba(232,133,61,0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${Math.max(2, widthPct)}%`,
                    background: `linear-gradient(90deg, #D4732A ${
                      30 + intensity * 30
                    }%, #E8853D, #FFA060)`,
                    borderRadius: 5,
                    boxShadow: '0 0 8px rgba(232,133,61,0.4)',
                    transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 12,
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FDF6EE',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}
                >
                  {stage.count}
                </div>
              </div>
              <div
                style={{
                  width: 64,
                  textAlign: 'right',
                  fontFamily:
                    'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: conv != null ? '#E8853D' : 'rgba(253,246,238,0.25)',
                }}
              >
                {conv != null ? `${conv}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(232,133,61,0.08)',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'rgba(253,246,238,0.3)',
        }}
      >
        % indique le passage depuis l'étape précédente · perdu/archivé exclus
      </div>
    </div>
  );
}
