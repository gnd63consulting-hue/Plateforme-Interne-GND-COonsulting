import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { labelForStatus } from '@/lib/prospects';

export const dynamic = 'force-dynamic';

// Palette claire gnd-* (cohérente avec /prospects, thème clair commercial).
type Row = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  status: string;
  next_action_at: string;
};

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export default async function MesRelancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS owner-based : un commercial ne récupère que ses prospects
  // (created_by/assigned_to). On garde le .or() pour rester explicite et
  // cohérent avec la page /prospects.
  const { data: prospectsRaw } = await supabase
    .from('prospects')
    .select('id, company_name, contact_name, phone, status, next_action_at')
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .not('next_action_at', 'is', null)
    .order('next_action_at', { ascending: true });

  const rows = (prospectsRaw ?? []) as Row[];

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);

  const overdue: Row[] = [];
  const today: Row[] = [];
  const upcoming: Row[] = [];
  for (const r of rows) {
    const d = new Date(r.next_action_at);
    if (d < startToday) overdue.push(r);
    else if (d < endToday) today.push(r);
    else if (d < endWeek) upcoming.push(r);
    // > 7 jours : hors scope "à venir (7j)", volontairement non listé.
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-8 bg-gnd-amber" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
            Mon pipeline · Relances
          </span>
        </div>
        <h1 className="font-display text-display-md font-medium leading-[0.95] tracking-tight text-gnd-bronze sm:text-4xl">
          Mes <span className="italic text-gnd-amber">relances</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-gnd-bronze-soft sm:text-base">
          Tes prospects avec une date de relance posée. En retard d&apos;abord,
          puis aujourd&apos;hui, puis les 7 prochains jours. Triés par date.
        </p>
      </header>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatCard label="En retard" value={overdue.length} tone="rose" />
        <StatCard label="Aujourd'hui" value={today.length} tone="amber" />
        <StatCard label="À venir (7j)" value={upcoming.length} tone="emerald" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-16 text-center shadow-warm">
          <p className="font-display text-xl text-gnd-bronze">
            Aucune relance planifiée.
          </p>
          <p className="mt-2 text-sm text-gnd-bronze-soft">
            Pose une date de relance depuis la fiche d&apos;un prospect (bouton
            notes) pour la voir apparaître ici.
          </p>
          <Link
            href="/prospects"
            className="mt-5 inline-flex items-center rounded-full bg-gnd-bronze px-5 py-2.5 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink"
          >
            Voir mes prospects
          </Link>
        </div>
      ) : (
        <div className="space-y-7">
          <Group
            title="En retard"
            dotClass="bg-rose-500"
            dateClass="text-rose-600"
            rows={overdue}
            emptyText="Aucun retard. 👌"
          />
          <Group
            title="Aujourd'hui"
            dotClass="bg-gnd-amber"
            dateClass="text-gnd-amber-dim"
            rows={today}
            emptyText="Rien à rappeler aujourd'hui."
          />
          <Group
            title="À venir (7 jours)"
            dotClass="bg-emerald-500"
            dateClass="text-emerald-600"
            rows={upcoming}
            emptyText="Rien de planifié dans les 7 prochains jours."
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'rose' | 'amber' | 'emerald';
}) {
  const valueClass =
    tone === 'rose'
      ? 'text-rose-600'
      : tone === 'amber'
        ? 'text-gnd-amber'
        : 'text-emerald-600';
  return (
    <div className="rounded-2xl border border-gnd-bronze/8 bg-gnd-paper p-4 shadow-warm">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-gnd-bronze-faded">
        {label}
      </p>
      <p
        className={`mt-1.5 font-display text-3xl font-medium tabular-nums ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function Group({
  title,
  rows,
  dotClass,
  dateClass,
  emptyText,
}: {
  title: string;
  rows: Row[];
  dotClass: string;
  dateClass: string;
  emptyText: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-bronze">
          {title} ({rows.length})
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="pl-4 text-xs text-gnd-bronze-faded">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/prospects/${r.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-gnd-bronze/8 bg-gnd-paper p-4 shadow-warm transition-all hover:-translate-y-0.5 hover:border-gnd-amber/30 hover:shadow-warm-lg"
            >
              <span
                className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${dateClass}`}
              >
                {fmt(new Date(r.next_action_at))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-medium text-gnd-bronze">
                  {r.company_name}
                </p>
                <p className="truncate text-sm text-gnd-bronze-soft">
                  {r.contact_name ?? '—'}
                  {r.phone && (
                    <span className="ml-2 font-mono text-xs text-gnd-amber-dim">
                      {r.phone}
                    </span>
                  )}
                </p>
              </div>
              <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-gnd-bronze-soft sm:inline">
                {labelForStatus(r.status)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
