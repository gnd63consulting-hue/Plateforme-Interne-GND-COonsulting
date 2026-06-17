import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  AGENT_SELECT_COLUMNS,
  sortAgents,
  statusMeta,
  formatLastSeen,
  type Agent,
} from '@/lib/agents';

export const dynamic = 'force-dynamic';

/**
 * /admin/agents — Registry des agents IA (Hermès), admin-only.
 *
 * Gate d'accès : FULL-admin (admin / admin_limited), EXACTEMENT comme
 * /admin/reporting et /admin/pipelines. La table `agents` est elle-même
 * protégée par la RLS `agents_admin_all` (migration 0025) via
 * `is_admin_or_limited()` — un admin connecté passe la policy avec le client
 * server RLS-bound, AUCUN service-role n'est nécessaire (lecture seule, page
 * déjà admin-gated).
 *
 * Cloisonnement : ce registre est purement descriptif. Les agents eux-mêmes ne
 * voient JAMAIS le CA (`deal_amount` isolé dans `prospect_finance`, migration
 * 0021 ; les agents passent par les vues scopées `v_agent_prospects`). On
 * matérialise ce périmètre par un badge sur chaque carte.
 */
const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type Me = { id: string; role: string };

// Design System crème/orange — texte FONCÉ sur fond clair (contraste AA).
const INK = '#2A2320';
const SOFT = '#7B665C';
const FAINT = '#9A8A80';
const AMBER = '#B5601C';
const CHOCO = '#532418';
const CARD = '#FFFFFF';
const BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-monospace, monospace';
const SANS = 'var(--font-inter), system-ui, sans-serif';

export default async function AdminAgentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meRaw } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();
  const me = meRaw as Me | null;
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const { data: agentsRaw } = await supabase
    .from('agents')
    .select(AGENT_SELECT_COLUMNS)
    .order('codename', { ascending: true });

  const agents = sortAgents((agentsRaw ?? []) as unknown as Agent[]);

  // Regroupement par db_role (rôle Postgres scopé) pour refléter le
  // cloisonnement : les agents qui partagent un db_role partagent un périmètre.
  const groups = new Map<string, Agent[]>();
  for (const a of agents) {
    const key = a.db_role ?? '—';
    const arr = groups.get(key);
    if (arr) arr.push(a);
    else groups.set(key, [a]);
  }

  const running = agents.filter((a) => a.status === 'running').length;
  const inError = agents.filter((a) => a.status === 'error').length;

  // Console Hermès (dashboard externe) — n'apparaît QUE si la variable d'env
  // publique est définie. Server Component : process.env.NEXT_PUBLIC_* est
  // lisible au render. Tant que le sous-domaine n'existe pas, la variable est
  // absente et le bouton reste invisible (safe par défaut).
  const hermesConsoleUrl = process.env.NEXT_PUBLIC_HERMES_CONSOLE_URL;

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: '40px 28px 64px',
        color: INK,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: AMBER,
            marginBottom: 10,
          }}
        >
          ADMIN · ARMÉE HERMÈS
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
          Registre des agents
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: SOFT,
            marginTop: 12,
            maxWidth: 660,
          }}
        >
          Armée commerciale Hermès — registre des agents IA. Chaque agent a un
          périmètre DB scopé via son rôle Postgres (jamais <code style={{ fontFamily: MONO, fontSize: 13, color: AMBER }}>deal_amount</code>) :
          il lit des vues cloisonnées et n&apos;accède jamais au chiffre
          d&apos;affaires. Lecture seule, temps réel.
        </p>

        {hermesConsoleUrl && (
          <div style={{ marginTop: 18 }}>
            <a
              href={hermesConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: AMBER,
                border: `1px solid ${CHOCO}`,
                borderRadius: 999,
                padding: '9px 18px',
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.01em',
                color: '#FFF8F0',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Ouvrir la console Hermès ↗
            </a>
            <p
              style={{
                fontFamily: SANS,
                fontSize: 11,
                lineHeight: 1.45,
                color: FAINT,
                margin: '8px 0 0',
                maxWidth: 660,
              }}
            >
              Pilote les agents (chat, Kanban, dispatch) sur
              agents.gndconsulting.fr
            </p>
          </div>
        )}
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 32,
        }}
      >
        <Stat label="Agents" value={agents.length} color={INK} />
        <Stat label="En cours" value={running} color={'#4F7A38'} />
        <Stat label="En erreur" value={inError} color={'#A04A4A'} />
        <Stat label="Périmètres DB" value={groups.size} color={AMBER} />
      </div>

      {agents.length === 0 ? (
        <p style={{ fontSize: 14, color: SOFT }}>
          Aucun agent enregistré pour l&apos;instant. Les agents apparaîtront ici
          une fois le socle Hermès provisionné (migration 0025).
        </p>
      ) : (
        [...groups.entries()].map(([dbRole, list]) => (
          <section key={dbRole} style={{ marginBottom: 30 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: AMBER,
                margin: '0 0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>{dbRole}</span>
              <span style={{ color: FAINT, fontWeight: 600 }}>
                ({list.length})
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 14,
              }}
            >
              {list.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        background: CARD,
        border: BORDER,
        borderRadius: 16,
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: FAINT,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 30,
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

function StatusBadge({ agent }: { agent: Agent }) {
  const meta = statusMeta(agent.status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 999,
        padding: '4px 11px',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: meta.fg,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: meta.dot,
          flexShrink: 0,
        }}
      />
      {meta.label}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: FAINT,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: SANS, fontSize: 12, color: INK }}>{value}</span>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <article
      style={{
        background: CARD,
        border: BORDER,
        borderRadius: 18,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Titre + statut */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontFamily: SERIF,
              fontSize: 21,
              fontWeight: 500,
              color: CHOCO,
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {agent.codename}
          </h2>
          {agent.role && (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                color: AMBER,
                marginTop: 4,
              }}
            >
              {agent.role}
            </div>
          )}
        </div>
        <StatusBadge agent={agent} />
      </div>

      {/* Mission */}
      {agent.mission && (
        <p
          style={{
            fontFamily: SANS,
            fontSize: 13,
            lineHeight: 1.5,
            color: SOFT,
            margin: 0,
          }}
        >
          {agent.mission}
        </p>
      )}

      {/* KPI + modèle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <Field label="KPI" value={agent.kpi ?? '—'} />
        <Field label="Modèle" value={agent.model ?? '—'} />
      </div>

      {/* db_role + Telegram + last seen */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(83,36,24,0.08)',
        }}
      >
        <Field label="Rôle DB" value={agent.db_role ?? '—'} />
        <Field
          label="Telegram"
          value={agent.telegram_bot_handle ?? '—'}
        />
        <Field label="Vu" value={formatLastSeen(agent.last_seen_at)} />
      </div>

      {/* Badge cloisonnement */}
      <div
        title={agent.scope_note ?? undefined}
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(83,36,24,0.05)',
          border: '1px solid rgba(83,36,24,0.14)',
          borderRadius: 999,
          padding: '5px 11px',
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: CHOCO,
        }}
      >
        <span aria-hidden>🔒</span>
        Cloisonné — ne voit pas le CA
      </div>

      {/* Note de périmètre (texte du scope_note) */}
      {agent.scope_note && (
        <p
          style={{
            fontFamily: SANS,
            fontSize: 11,
            lineHeight: 1.45,
            color: FAINT,
            margin: 0,
          }}
        >
          {agent.scope_note}
        </p>
      )}
    </article>
  );
}
