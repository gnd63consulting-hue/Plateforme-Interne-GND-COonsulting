'use client';

export type ActivityLogEntry = {
  date: string;
  type: string;
  company: string;
  detail: string;
  user: string;
  userInitials?: string;
};

const TYPE_COLOR: Record<string, string> = {
  'STATUT CHANGED': '#9087D1',
  'NOTE ADDED': 'rgba(253,246,238,0.5)',
  'DEVIS SENT': '#7BA85B',
  'SYNC NOTION': 'rgba(232,133,61,0.7)',
  'PROSPECT UPDATED': '#E69947',
};

export default function ActivityTimeline({
  logs,
  filterUser,
}: {
  logs: ActivityLogEntry[];
  filterUser?: string;
}) {
  const filtered = filterUser
    ? logs.filter((l) => l.user === filterUser || l.user === 'system')
    : logs;

  if (filtered.length === 0) {
    return (
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: 'rgba(253,246,238,0.4)',
          padding: '20px 0',
          textAlign: 'center',
        }}
      >
        Aucune activité récente
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {filtered.map((log, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            padding: '10px 0',
            borderBottom:
              i < filtered.length - 1
                ? '1px solid rgba(232,133,61,0.06)'
                : 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(253,246,238,0.3)',
              whiteSpace: 'nowrap',
              minWidth: 95,
              paddingTop: 1,
            }}
          >
            {log.date}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontFamily:
                  'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: TYPE_COLOR[log.type] ?? 'rgba(253,246,238,0.4)',
                marginRight: 8,
              }}
            >
              {log.type}
            </span>
            <span
              style={{
                fontFamily:
                  'var(--font-geist-sans), system-ui, sans-serif',
                fontSize: 12,
                color: 'rgba(253,246,238,0.7)',
              }}
            >
              {log.company}
            </span>
            {log.detail && (
              <div
                style={{
                  fontFamily:
                    'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'rgba(253,246,238,0.3)',
                  marginTop: 3,
                }}
              >
                {log.detail}
              </div>
            )}
          </div>
          {log.user !== 'system' && (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                flexShrink: 0,
                background: 'rgba(232,133,61,0.12)',
                border: '1px solid rgba(232,133,61,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: 9,
                fontWeight: 600,
                color: '#E8853D',
              }}
            >
              {log.userInitials ?? log.user[0]?.toUpperCase()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
