import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { effectivePerms, allows } from '@/lib/permissions';
import { labelForStatus } from '@/lib/prospects';
import ProspectQuickEdit from './ProspectQuickEdit';

export const dynamic = 'force-dynamic';


type Row = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  status: string;
  next_action_at: string;
  assigned_to: string | null;
};

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default async function RelancesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('role, permissions')
    .eq('id', user.id)
    .maybeSingle();
  if (!me) redirect('/dashboard');
  const perms = effectivePerms(me.role, me.permissions);
  if (!allows(perms, 'relances', 'view')) redirect('/dashboard');

  const [{ data: prospectsRaw }, { data: usersRaw }] = await Promise.all([
    supabase
      .from('prospects')
      .select('id, company_name, contact_name, phone, status, next_action_at, assigned_to')
      .not('next_action_at', 'is', null)
      .order('next_action_at', { ascending: true }),
    supabase.from('users').select('id, full_name, email'),
  ]);

  const rows = (prospectsRaw ?? []) as Row[];
  const userName = new Map<string, string>();
  for (const u of (usersRaw ?? []) as { id: string; full_name: string | null; email: string }[]) {
    userName.set(u.id, u.full_name ?? u.email.split('@')[0]);
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const overdue: Row[] = [];
  const today: Row[] = [];
  const upcoming: Row[] = [];
  for (const r of rows) {
    const d = new Date(r.next_action_at);
    if (d < startToday) overdue.push(r);
    else if (d < endToday) today.push(r);
    else upcoming.push(r);
  }

  const perCommercial = new Map<string, number>();
  for (const r of rows) {
    const name = r.assigned_to ? userName.get(r.assigned_to) ?? '—' : 'Non assigné';
    perCommercial.set(name, (perCommercial.get(name) ?? 0) + 1);
  }
  const recap = [...perCommercial.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-5xl px-7 pb-16 pt-10">
      <header className="relative mb-7 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[120px] leading-none text-choco/[0.04]"
        >
          Relances
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Admin · Pilotage
          </span>
        </span>
        <h1 className="mt-3 font-marcellus text-[34px] leading-[1.1] tracking-tight text-choco">
          Relances à venir
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#6F5A50]">
          Qui doit rappeler quel prospect et quand, posé par les commerciaux sur
          leurs fiches. Les retards sont signalés en rouge. Mets à jour le statut
          ou reporte une relance via le bouton « Mettre à jour ».
        </p>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="En retard" value={overdue.length} tone="danger" />
        <Stat label="Aujourd'hui" value={today.length} tone="warn" />
        <Stat label="À venir" value={upcoming.length} tone="ok" />
        <Stat label="Total relances" value={rows.length} tone="ink" />
      </div>

      {recap.length > 0 && (
        <section className="mb-7">
          <SectionLabel>Par commercial</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {recap.map(([name, n]) => (
              <span
                key={name}
                className="card-hover inline-flex items-center gap-2 rounded-full border border-border-soft bg-cream/60 px-3.5 py-1.5 text-[13px] text-ink-warm"
              >
                {name}
                <span className="font-num font-semibold tabular-nums text-brand-burnt">{n}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <div className="panel flex items-center gap-4 p-4">
          <span
            aria-hidden
            className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.6}>
              <path d="M8 2v4M16 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="3" y="4" width="18" height="18" rx="2" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-marcellus text-base text-choco">
              Aucune relance planifiée pour l&apos;instant.
            </p>
            <p className="mt-0.5 text-[13px] text-muted-warm">
              Les dates posées par les commerciaux apparaîtront ici, du plus urgent
              au plus lointain.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Group title="En retard" rows={overdue} tone="danger" userName={userName} emptyText="Aucun retard. 👌" />
          <Group title="Aujourd'hui" rows={today} tone="warn" userName={userName} emptyText="Rien à rappeler aujourd'hui." />
          <Group title="À venir" rows={upcoming} tone="ok" userName={userName} emptyText="Rien de planifié à venir." />
        </>
      )}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="label-eyebrow mb-3.5">{children}</div>;
}

function Group({
  title,
  rows,
  tone,
  userName,
  emptyText,
}: {
  title: string;
  rows: Row[];
  tone: 'danger' | 'warn' | 'ok';
  userName: Map<string, string>;
  emptyText: string;
}) {
  const dotClass =
    tone === 'danger' ? 'bg-danger-fg' : tone === 'warn' ? 'bg-brand' : 'bg-ok-fg';
  const dateClass =
    tone === 'danger' ? 'text-danger-fg' : tone === 'warn' ? 'text-brand-dark' : 'text-ok-fg';
  return (
    <section className="mb-7">
      <div className="label-eyebrow mb-3.5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        {title} ({rows.length})
      </div>
      {rows.length === 0 ? (
        <p className="pl-4 text-[13px] text-muted-warm">{emptyText}</p>
      ) : (
        <div className="panel overflow-hidden p-0">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Date', 'Commercial', 'Prospect', 'Contact', 'Statut', 'Action'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
                    style={{ borderBottom: '1px solid rgba(74,36,26,0.10)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name = r.assigned_to ? userName.get(r.assigned_to) ?? '—' : 'Non assigné';
                return (
                  <tr
                    key={r.id}
                    className="divider-warm transition-colors hover:bg-cream-deep/40"
                  >
                    <td className={`whitespace-nowrap px-4 py-2.5 font-num text-xs font-semibold tabular-nums ${dateClass}`}>
                      {fmt(new Date(r.next_action_at))}
                    </td>
                    <td className="px-4 py-2.5 text-ink-warm">{name}</td>
                    <td className="px-4 py-2.5 font-marcellus text-ink-warm">{r.company_name}</td>
                    <td className="px-4 py-2.5 text-[#6F5A50]">
                      {r.contact_name ?? '—'}
                      {r.phone && <span className="block font-num text-[11px] text-brand-dark">{r.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-info-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-info-fg">
                        {labelForStatus(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <ProspectQuickEdit prospectId={r.id} currentStatus={r.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
