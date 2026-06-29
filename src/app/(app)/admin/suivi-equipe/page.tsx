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
import {
  buildRepActivity,
  buildRepConnections,
  startOfWeekWindow,
  type ActivityRow,
  type DoneTaskRow,
  type LoginSessionRow,
} from '@/lib/team-activity';
import { ActivityPanel, ConnectionsPanel } from './TeamActivityPanels';

export const dynamic = 'force-dynamic';


/**
 * /admin/suivi-equipe (Sprint 20) — couche MANAGER.
 *
 * Vue admin : pour CHAQUE commercial, ses relances + tâches en retard /
 * aujourd'hui, triées par criticité. Permet de ne laisser personne sans suivi.
 *
 * Enrichi (Sprint connexions) : (a) activité réelle par commercial (timeline
 * `activities` + tâches cochées) sur aujourd'hui / 7 jours ; (b) connexions
 * équipe (table `login_sessions`, sans IP).
 *
 * Données via service-role (les tâches/activités/sessions sont RLS owner — un
 * admin ne les verrait pas autrement). Accès gardé par la permission `suivi`.
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
  // Bornes pour les agrégats activité (7 jours glissants) — on filtre côté
  // requête pour ne pas tirer tout l'historique.
  const weekStartIso = startOfWeekWindow(now).toISOString();

  const [
    { data: usersRaw },
    { data: prosRaw },
    { data: tasksRaw },
    { data: actsRaw },
    { data: sessionsRaw },
  ] = await Promise.all([
    admin.from('users').select('id, full_name, email, role, active'),
    admin
      .from('prospects')
      .select(
        'id, company_name, status, next_action_at, assigned_to, created_by'
      )
      .not('next_action_at', 'is', null)
      .lte('next_action_at', endIso),
    admin.from('tasks').select(TASK_SELECT_COLUMNS).eq('done', false),
    admin
      .from('activities')
      .select('kind, owner_id, occurred_at')
      .gte('occurred_at', weekStartIso),
    admin
      .from('login_sessions')
      .select('user_id, started_at, last_seen_at'),
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

  // Pour l'activité : on a besoin des tâches FAITES aujourd'hui/7j → requête
  // dédiée (la requête ci-dessus ne tire que les tâches non-faites).
  const { data: doneTasksRaw } = await admin
    .from('tasks')
    .select('owner_id, done, done_at')
    .eq('done', true)
    .gte('done_at', weekStartIso);

  // Liste { id, name } des membres suivis pour seeder activité + connexions.
  const nameOf = (u: (typeof tracked)[number]) =>
    u.full_name ?? (u.email ? u.email.split('@')[0] : '—');
  const trackedLite = tracked.map((u) => ({ id: u.id, name: nameOf(u) }));

  const activity = buildRepActivity(
    trackedLite,
    (actsRaw ?? []) as ActivityRow[],
    (doneTasksRaw ?? []) as DoneTaskRow[],
    now
  );

  const connections = buildRepConnections(
    trackedLite,
    (sessionsRaw ?? []) as LoginSessionRow[],
    now
  );

  const flagged = summaries.filter((s) => s.overdueTotal > 0);
  const totalOverdue = flagged.reduce((a, s) => a + s.overdueTotal, 0);
  const totalToday = summaries.reduce(
    (a, s) => a + s.relancesToday + s.tasksToday,
    0
  );

  return (
    <div className="mx-auto max-w-5xl px-7 pb-16 pt-10">
      <header className="relative mb-7 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[120px] leading-none text-choco/[0.04]"
        >
          Équipe
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Admin · Pilotage
          </span>
        </span>
        <h1 className="mt-3 font-marcellus text-[34px] leading-[1.1] tracking-tight text-choco">
          Suivi équipe
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#6F5A50]">
          Qui a des relances ou des tâches en retard, pour ne laisser personne
          sans suivi. Relances <em>et</em> tâches confondues, triées par
          criticité. Lecture seule, temps réel.
        </p>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Actions en retard" value={totalOverdue} tone="danger" />
        <Stat label="Commerciaux en retard" value={flagged.length} tone="warn" />
        <Stat label="Dues aujourd'hui" value={totalToday} tone="ok" />
        <Stat label="Commerciaux suivis" value={summaries.length} tone="ink" />
      </div>

      {summaries.length === 0 ? (
        <div className="panel flex items-center gap-4 p-4">
          <span
            aria-hidden
            className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.6}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-marcellus text-base text-choco">
              Aucun commercial à suivre pour l&apos;instant.
            </p>
            <p className="mt-0.5 text-[13px] text-muted-warm">
              Dès qu&apos;une équipe commerciale sera active, son suivi apparaîtra
              ici en temps réel.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel overflow-hidden p-0">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Commercial', 'Relances retard', 'Tâches retard', "Aujourd'hui", 'Plus vieux retard'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt ${
                      i === 0 ? 'text-left' : 'text-center'
                    }`}
                    style={{ borderBottom: '1px solid rgba(74,36,26,0.10)' }}
                  >
                    {h}
                  </th>
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

      {/* Activité réelle par commercial (timeline + tâches faites) */}
      <ActivityPanel reps={activity} />

      {/* Connexions équipe (login_sessions, sans IP) */}
      <ConnectionsPanel reps={connections} nowIso={now.toISOString()} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'warn' | 'ok' | 'ink';
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-danger-fg'
      : tone === 'warn'
        ? 'text-brand-dark'
        : tone === 'ok'
          ? 'text-ok-fg'
          : 'text-choco';
  return (
    <div className="panel p-4">
      <p className="label-eyebrow">{label}</p>
      <p className={`mt-2 font-num text-3xl tabular-nums leading-none ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function Cell({ n, danger }: { n: number; danger?: boolean }) {
  return (
    <td
      className={`px-4 py-2.5 text-center font-num text-sm font-bold tabular-nums ${
        n === 0 ? 'text-muted-warm' : danger ? 'text-danger-fg' : 'text-ink-warm'
      }`}
    >
      {n}
    </td>
  );
}

function Row({ s, now }: { s: RepSummary; now: Date }) {
  const age = overdueAgeDays(s.oldestOverdueIso, now);
  const ageLabel = age == null ? '—' : age === 0 ? "auj." : `${age} j`;
  const clean = s.overdueTotal === 0;
  return (
    <tr
      className="divider-warm transition-colors hover:bg-cream-deep/40"
    >
      <td className="px-4 py-2.5 font-semibold text-ink-warm">
        <Link
          href={`/admin/commercial/${s.userId}`}
          className="text-choco underline decoration-[rgba(83,36,24,0.25)] underline-offset-2 transition-colors hover:decoration-brand"
        >
          {s.name}
        </Link>
        {clean && (
          <span className="ml-2 inline-flex items-center rounded-full bg-ok-bg px-2 py-0.5 text-[10px] font-semibold text-ok-fg">
            à jour
          </span>
        )}
      </td>
      <Cell n={s.relancesOverdue} danger />
      <Cell n={s.tasksOverdue} danger />
      <td
        className={`px-4 py-2.5 text-center font-num text-[13px] tabular-nums ${
          s.relancesToday + s.tasksToday > 0 ? 'text-brand-dark' : 'text-muted-warm'
        }`}
      >
        {s.relancesToday + s.tasksToday}
      </td>
      <td
        className={`px-4 py-2.5 text-center font-num text-xs font-semibold tabular-nums ${
          age && age > 0 ? 'text-danger-fg' : 'text-muted-warm'
        }`}
      >
        {ageLabel}
      </td>
    </tr>
  );
}
