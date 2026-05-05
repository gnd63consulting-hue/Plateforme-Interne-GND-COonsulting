'use client';

export type Palier = {
  niveau: number;
  label: string;
  icon: string;
  signatures: number;
  bonus: number;
  color: string;
};

export type CommercialPalier = {
  id: string;
  name: string;
  initials: string;
  signatures: number;
  palier: number;
};

const DEFAULT_PALIERS: Palier[] = [
  { niveau: 1, label: 'Bronze', icon: '🥉', signatures: 1, bonus: 200, color: '#A0735C' },
  { niveau: 2, label: 'Argent', icon: '🥈', signatures: 3, bonus: 500, color: '#8A9DB5' },
  { niveau: 3, label: 'Or', icon: '🥇', signatures: 5, bonus: 1000, color: '#C49A3C' },
  { niveau: 4, label: 'Platine', icon: '💎', signatures: 8, bonus: 2500, color: '#7B70C4' },
  { niveau: 5, label: 'Stratosphère', icon: '🚀', signatures: 12, bonus: 5000, color: '#E8853D' },
];

export default function PaliersSection({
  paliers = DEFAULT_PALIERS,
  commerciaux,
}: {
  paliers?: Palier[];
  commerciaux: CommercialPalier[];
}) {
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
          marginBottom: 22,
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
          PALIERS BONUS
        </span>
      </div>

      {/* Trajectoire 5 noeuds */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          marginBottom: 26,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '10%',
            right: '10%',
            top: 22,
            height: 1,
            background:
              'linear-gradient(90deg, rgba(160,115,92,0.3), rgba(232,133,61,0.6))',
            zIndex: 0,
          }}
        />
        {paliers.map((p) => (
          <div
            key={p.niveau}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: 'rgba(0,0,0,0.4)',
                border: `2px solid ${p.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: `0 0 12px ${p.color}40`,
              }}
            >
              {p.icon}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: 13,
                fontWeight: 500,
                color: p.color,
              }}
            >
              {p.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(253,246,238,0.4)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {p.signatures} SIGN.
              <br />
              <span style={{ color: '#E8853D' }}>+{p.bonus}€</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cards par commercial */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        {commerciaux.map((c) => {
          const currentPalier = paliers.find((p) => p.niveau === c.palier);
          const nextPalier = paliers.find((p) => p.niveau === c.palier + 1);
          const target = nextPalier?.signatures ?? currentPalier?.signatures ?? 1;
          const progress = Math.min(100, (c.signatures / target) * 100);
          return (
            <div
              key={c.id}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(232,133,61,0.10)',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background:
                      'linear-gradient(135deg, rgba(232,133,61,0.25), rgba(196,154,60,0.15))',
                    border: '1px solid rgba(232,133,61,0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#E8853D',
                  }}
                >
                  {c.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-fraunces), Georgia, serif',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#FDF6EE',
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontFamily:
                        'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: 'rgba(253,246,238,0.4)',
                      marginTop: 2,
                    }}
                  >
                    {currentPalier?.label ?? 'Palier 0'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: 999,
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: currentPalier?.color ?? '#A0735C',
                    borderRadius: 999,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily:
                    'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'rgba(253,246,238,0.4)',
                }}
              >
                <span>
                  {c.signatures} / {target} sign.
                </span>
                {nextPalier && (
                  <span style={{ color: '#E8853D' }}>
                    → {nextPalier.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
