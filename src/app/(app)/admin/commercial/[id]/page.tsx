import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { labelForStatus, toneForStatus, formatDate } from '@/lib/prospects';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type ProspectLite = {
  id: string;
  company_name: string | null;
  status: string | null;
  next_action_at: string | null;
  updated_at: string | null;
  city: string | null;
  phone: string | null;
};

type ActivityLite = {
  id: string;
  kind: string | null;
  body: string | null;
  occurred_at: string | null;
  prospect_id: string | null;
};

const KIND_LABEL: Record<string, string> = {
  call: 'Appel',
  email: 'Email',
  meeting: 'RDV',
  note: 'Note',
  status_change: 'Changement statut',
  task: 'Tache',
};

/**
 * Fiche de suivi d'un commercial (admin only). Vue d'activite : volume de
 * prospects, repartition par statut, rappels, dernieres actions. AUCUNE donnee
 * financiere (cloisonnement) : c'est une vue de performance d'activite, pas de
 * chiffre d'affaires.
 */
export default async function CommercialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const adminClient = createAdminClient();

  const { data: commercial } = await adminClient
    .from('users')
    .select('id, full_name, email, role, active')
    .eq('id', id)
    .maybeSingle();
  if (!commercial) notFound();

  const [{ data: prospectsRaw }, { data: actsRaw }] = await Promise.all([
    adminClient
      .from('prospects')
      .select('id, company_name, status, next_action_at, updated_at, city, phone')
      .eq('assigned_to', id)
      .is('merged_into', null)
      .order('updated_at', { ascending: false }),
    adminClient
      .from('activities')
      .select('id, kind, body, occurred_at, prospect_id')
      .eq('owner_id', id)
      .order('occurred_at', { ascending: false })
      .limit(20),
  ]);

  const prospects = (prospectsRaw ?? []) as ProspectLite[];
  const acts = (actsRaw ?? []) as ActivityLite[];
  const companyById = new Map(prospects.map((p) => [p.id, p.company_name]));

  const total = prospects.length;
  const counts = new Map<string, number>();
  for (const p of prospects) {
    const k = p.status ?? '';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const byStatus = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  const now = Date.now();
  const withRecall = prospects.filter((p) => p.next_action_at);
  const overdue = withRecall
    .filter((p) => new Date(p.next_action_at as string).getTime() < now)
    .sort(
      (a, b) =>
        new Date(a.next_action_at as string).getTime() -
        new Date(b.next_action_at as string).getTime()
    );
  const upcoming = withRecall
    .filter((p) => new Date(p.next_action_at as string).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.next_action_at as string).getTime() -
        new Date(b.next_action_at as string).getTime()
    );

  const name = commercial.full_name ?? commercial.email?.split('@')[0] ?? '--';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/admin/suivi-equipe" className="text-sm text-slate-500 hover:text-slate-700">
        &larr; Suivi equipe
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">{name}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {commercial.role}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            commercial.active === false
              ? 'bg-rose-100 text-rose-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {commercial.active === false ? 'Inactif' : 'Actif'}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{commercial.email}</p>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Prospects assignes" value={total} tone="slate" />
        <Kpi label="Rappels en retard" value={overdue.length} tone="rose" />
        <Kpi label="Rappels a venir" value={upcoming.length} tone="amber" />
        <Kpi label="Actions (20 dern.)" value={acts.length} tone="emerald" />
      </div>

      {/* Repartition par statut */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Repartition par statut
        </h2>
        {byStatus.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucun prospect assigne.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {byStatus.map(([status, n]) => (
              <span
                key={status || 'none'}
                className={`rounded-full px-3 py-1 text-xs font-medium ${toneForStatus(status)}`}
              >
                {labelForStatus(status)} : {n}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Rappels */}
      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <RecallList title="En retard" rows={overdue} tone="rose" />
        <RecallList title="A venir" rows={upcoming.slice(0, 12)} tone="amber" />
      </section>

      {/* Dernieres activites */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dernieres actions
        </h2>
        {acts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucune activite enregistree.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {acts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {KIND_LABEL[a.kind ?? ''] ?? a.kind ?? '--'}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/prospects/${a.prospect_id}`}
                    className="font-medium text-slate-700 hover:underline"
                  >
                    {(a.prospect_id && companyById.get(a.prospect_id)) || 'Prospect'}
                  </Link>
                  {a.body && <span className="text-slate-500"> &mdash; {a.body}</span>}
                  <div className="text-xs text-slate-400">{formatDate(a.occurred_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'rose' | 'amber' | 'emerald';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className={`rounded-lg p-3 text-center ${tones[tone]}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function RecallList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ProspectLite[];
  tone: 'rose' | 'amber';
}) {
  const dot = tone === 'rose' ? 'text-rose-500' : 'text-amber-500';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Rappels {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Aucun.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/prospects/${p.id}`}
                className="truncate font-medium text-slate-700 hover:underline"
              >
                {p.company_name ?? '--'}
              </Link>
              <span className={`shrink-0 text-xs ${dot}`}>
                {formatDate(p.next_action_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
