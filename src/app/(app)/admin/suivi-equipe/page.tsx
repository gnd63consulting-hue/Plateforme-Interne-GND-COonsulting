import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { effectivePerms, allows } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase-admin';
import { TASK_SELECT_COLUMNS, type Task } from '@/lib/tasks';
import { type DigestProspectRow } from '@/lib/digest';
import {
  buildRepSummaries,
  overdueAgeDays,
  type RepSummary,
} from '@/lib/manager-digest';

export const dynamic = 'force-dynamic';

// Design System crème/orange — texte FONCÉ sur fond clair (contraste AA).
const INK = '#2A2320';
const SOFT = '#7B665C';
const FAINT = '#9A8A80';
const AMBER = '#B5601C';
const RED = '#A04A4A';
const GREEN = '#4F7A38';
const CHOCO = '#532418';
const CARD = '#FFFFFF';
const BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-monospace, monospace';
const SANS = 'var(--font-inter), system-ui, sans-serif';


/**
 * /admin/suivi-equipe (Sprint 20) — couche MANAGER.
 *
 * Vue admin : pour CHAQUE commercial, ses relances + tâches en retard /
 * aujourd'hui, triées par criticité. Permet de ne laisser personne sans suivi.
 *
 * Données via service-role (les tâches sont RLS owner — un admin ne les verrait
 * pas autrement). Accès gardé par la permission de section `suivi`.
 */
export default async function SuiviEquipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('users')
    .select('role, permissions')
    .eq('id', user.id)
    .maybeSingle();
  if (!me) redirect('/dashboard');
  const perms = effectivePerms(me.role, me.permissions);
  if (!allows(perms, 'suivi', 'view')) redirect('/dashboard');

  const admin = createAdminClient();
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + 1);
  const endIso = end.toISOString();

  const [{ data: usersRaw }, { data: prosRaw }, { data: tasksRaw }] =
    await Promise.all([
      admin.from('users').select('id, full_name, email, role, active'),
      admin
        .from('prospects')
        .select(
          'id, company_name, status, next_action_at, assigned_to, created_by'
        )
        .not('next_action_at', 'is', null)
        .lte('next_action_at', endIso),
      admin.from('tasks').select(TASK_SELECT_COLUMNS).eq('done', false),
    ]);

  const allUsers = (usersRaw ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    active: boolean | null;
  }[];
  // On suit les commerciaux (et co-admins) ACTIFS : on exclut comptes sans rôle
  // et comptes archivés (active === false).
  const tracked = allUsers.filter((u) => u.role && u.active !== false);

  const summaries = buildRepSummaries(
    tracked,
    (prosRaw ?? []) as unknown as DigestProspectRow[],
    (tasksRaw ?? []) as unknown as Task[],
    now
  );

  const flagged = summaries.filter((s) => s.overdueTotal > 0);
  const totalOverdue = flagged.reduce((a, s) => a + s.overdueTotal, 0);
  const totalToday = summaries.reduce(
    (a, s) => a + s.relancesToday + s.tasksToday,
    0
  );

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: INK }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: AMBER, marginBottom: 10 }}>
          ADMIN · PILOTAGE
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: CHOCO, margin: 0, lineHeight: 1.1 }}>
          Suivi équipe
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: SOFT, marginTop: 12, maxWidth: 640 }}>
          Qui a des relances ou des tâches en retard — pour ne laisser personne sans suivi.
          Relances <em>et</em> tâches confondues, triées par criticité. Lecture seule, temps réel.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <Stat label="Actions en retard" value={totalOverdue} color={RED} />
        <Stat label="Commerciaux en retard" value={flagged.length} color={AMBER} />
        <Stat label="Dues aujourd'hui" value={totalToday} color={GREEN} />
        <Stat label="Commerciaux suivis" value={summaries.length} color={INK} />
      </div>

      {summaries.length === 0 ? (
        <p style={{ fontSize: 14, color: SOFT }}>Aucun commercial à suivre pour l&apos;instant.</p>
      ) : (
        <div style={{ background: CARD, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Commercial', 'Relances retard', 'Tâches retard', "Aujourd'hui", 'Plus vieux retard'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '11px 16px', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: FAINT, borderBottom: '1px solid #E2D5C3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <Row key={s.userId} s={s} now={now} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: CARD, border: BORDER, borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: FAINT, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Cell({ n, danger }: { n: number; danger?: boolean }) {
  return (
    <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: MONO, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: n === 0 ? FAINT : danger ? RED : INK }}>
      {n}
    </td>
  );
}

function Row({ s, now }: { s: RepSummary; now: Date }) {
  const age = overdueAgeDays(s.oldestOverdueIso, now);
  const ageLabel = age == null ? '—' : age === 0 ? "auj." : `${age} j`;
  const clean = s.overdueTotal === 0;
  return (
    <tr style={{ borderBottom: '1px solid rgba(83,36,24,0.07)' }}>
      <td style={{ padding: '12px 16px', fontFamily: SANS, color: INK, fontWeight: 600 }}>
        <Link href={`/admin/commercial/${s.userId}`} style={{ color: CHOCO, textDecoration: 'none', borderBottom: '1px solid rgba(83,36,24,0.25)' }}>
          {s.name}
        </Link>
        {clean && <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 10, color: GREEN }}>à jour</span>}
      </td>
      <Cell n={s.relancesOverdue} danger />
      <Cell n={s.tasksOverdue} danger />
      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: MONO, fontSize: 13, color: s.relancesToday + s.tasksToday > 0 ? AMBER : FAINT }}>
        {s.relancesToday + s.tasksToday}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 600, color: age && age > 0 ? RED : FAINT }}>
        {ageLabel}
      </td>
    </tr>
  );
}
