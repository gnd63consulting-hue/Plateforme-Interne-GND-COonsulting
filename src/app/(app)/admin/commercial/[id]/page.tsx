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
      <Link
        href="/admin/suivi-equipe"
        className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-warm hover:text-brand-burnt"
      >
        &larr; Suivi equipe
      </Link>

      {/* En-tete cockpit chocolat */}
      <div className="surface-chocolate relative mt-3 overflow-hidden rounded-[16px] p-5 sm:p-6">
        <span className="font-marcellus pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none text-[110px] leading-none text-cream/[0.08]">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="relative">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-[#E0A572]">
              Suivi d&apos;activite
            </span>
          </span>
          <h1 className="font-marcellus mt-2 text-3xl text-cream">{name}</h1>
          <p className="font-num mt-1 text-sm text-cream/55">{commercial.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cream/10 px-3 py-1 font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em] text-cream/75">
              {commercial.role}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                commercial.active === false
                  ? 'bg-danger-bg text-danger-fg'
                  : 'bg-ok-bg text-ok-fg'
              }`}
            >
              {commercial.active === false ? 'Inactif' : 'Actif'}
            </span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Prospects assignes" value={total} tone="neutral" />
        <Kpi label="Rappels en retard" value={overdue.length} tone="danger" />
        <Kpi label="Rappels a venir" value={upcoming.length} tone="warn" />
        <Kpi label="Actions (20 dern.)" value={acts.length} tone="ok" />
      </div>

      {/* Repartition par statut */}
      <section className="panel mt-5 p-4">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Repartition par statut
          </span>
        </span>
        {byStatus.length === 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">&#9737;</span>
            <p className="text-sm text-muted-warm">Aucun prospect assigne.</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {byStatus.map(([status, n]) => (
              <span
                key={status || 'none'}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${toneForStatus(status)}`}
              >
                {labelForStatus(status)}
                <span className="font-num tabular-nums font-semibold">{n}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Rappels */}
      <section className="mt-5 grid gap-3 md:grid-cols-2">
        <RecallList title="En retard" rows={overdue} tone="rose" />
        <RecallList title="A venir" rows={upcoming.slice(0, 12)} tone="amber" />
      </section>

      {/* Dernieres activites */}
      <section className="panel mt-5 p-4">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Dernieres actions
          </span>
        </span>
        {acts.length === 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">&#9737;</span>
            <p className="text-sm text-muted-warm">Aucune activite enregistree.</p>
          </div>
        ) : (
          <ul className="mt-2">
            {acts.map((a) => (
              <li
                key={a.id}
                className="divider-warm card-hover flex items-start gap-3 rounded-lg px-2 py-2.5 text-sm"
              >
                <span className="mt-0.5 shrink-0 rounded-md bg-cream-deep px-2 py-0.5 font-grotesk text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6F5A50]">
                  {KIND_LABEL[a.kind ?? ''] ?? a.kind ?? '--'}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/prospects/${a.prospect_id}`}
                    className="font-medium text-choco hover:underline"
                  >
                    {(a.prospect_id && companyById.get(a.prospect_id)) || 'Prospect'}
                  </Link>
                  {a.body && <span className="text-muted-warm"> &mdash; {a.body}</span>}
                  <div className="font-num mt-0.5 text-xs text-muted-warm">{formatDate(a.occurred_at)}</div>
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
  tone: 'neutral' | 'danger' | 'warn' | 'ok';
}) {
  const tones: Record<string, string> = {
    neutral: 'text-choco',
    danger: 'text-danger-fg',
    warn: 'text-warn-fg',
    ok: 'text-ok-fg',
  };
  return (
    <div className="panel p-4">
      <div className={`font-num tabular-nums text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="font-grotesk mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-warm">{label}</div>
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
  const dot = tone === 'rose' ? 'text-danger-fg' : 'text-warn-fg';
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Rappels {title}
          </span>
        </span>
        <span className="font-num tabular-nums text-xs font-semibold text-muted-warm">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">&#9737;</span>
          <p className="text-sm text-muted-warm">Aucun.</p>
        </div>
      ) : (
        <ul className="mt-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className="divider-warm card-hover flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-sm"
            >
              <Link
                href={`/prospects/${p.id}`}
                className="truncate font-medium text-choco hover:underline"
              >
                {p.company_name ?? '--'}
              </Link>
              <span className={`font-num tabular-nums shrink-0 text-xs ${dot}`}>
                {formatDate(p.next_action_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
