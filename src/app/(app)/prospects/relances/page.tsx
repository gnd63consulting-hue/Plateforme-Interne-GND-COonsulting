import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, AlarmClock, CalendarClock, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { SectionHeader, StatusBadge, Button } from '@/components/ui';

export const dynamic = 'force-dynamic';

// Nouveau langage Sprint 10 (cartes/badges/arrondis cohérents avec le mockup).
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
      {/* En-tete editorial */}
      <div className="relative mb-6 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[120px] leading-none text-choco/[0.04]"
        >
          Relances
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="h-px w-4 bg-gradient-to-r from-brand to-transparent"
          />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Mon pipeline · Relances
          </span>
        </span>
        <h1 className="mt-2 font-marcellus text-3xl text-choco">
          Mes <span className="italic text-brand-dark">relances</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#6F5A50]">
          Tes prospects avec une date de relance posée. En retard d&apos;abord,
          puis aujourd&apos;hui, puis les 7 prochains jours. Triés par date.
        </p>
      </div>

      {/* KPI compacts — matiere + chiffres mono */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <RelanceStat label="En retard" value={overdue.length} tone="rose" />
        <RelanceStat label="Aujourd'hui" value={today.length} tone="amber" />
        <RelanceStat label="À venir (7j)" value={upcoming.length} tone="emerald" />
      </div>

      {rows.length === 0 ? (
        <div className="panel flex items-center gap-4 p-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt"
          >
            <AlarmClock className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-marcellus text-lg text-choco">
              Aucune relance planifiée.
            </p>
            <p className="mt-0.5 text-sm text-[#6F5A50]">
              Pose une date de relance depuis la fiche d&apos;un prospect (bouton
              notes) pour la voir apparaître ici.
            </p>
          </div>
          <Button
            href="/prospects"
            variant="primary"
            size="sm"
            className="shrink-0"
          >
            Voir mes prospects
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Group
            title="En retard"
            dotClass="bg-[#A04A4A]"
            dateClass="text-[#A04A4A]"
            rows={overdue}
            emptyText="Aucun retard. 👌"
          />
          <Group
            title="Aujourd'hui"
            dotClass="bg-brand"
            dateClass="text-brand-dark"
            rows={today}
            emptyText="Rien à rappeler aujourd'hui."
          />
          <Group
            title="À venir (7 jours)"
            dotClass="bg-[#3A7A52]"
            dateClass="text-[#3A7A52]"
            rows={upcoming}
            emptyText="Rien de planifié dans les 7 prochains jours."
          />
        </div>
      )}
    </div>
  );
}

function RelanceStat({
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
      ? 'text-[#A04A4A]'
      : tone === 'amber'
        ? 'text-brand-dark'
        : 'text-[#3A7A52]';
  return (
    <div className="panel p-4">
      <p className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-warm">
        {label}
      </p>
      <p className={`mt-1.5 font-num text-3xl tabular-nums ${valueClass}`}>
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
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        <h2 className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">
          {title}
        </h2>
        <span className="font-num text-[11px] tabular-nums text-muted-warm">
          ({rows.length})
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 pl-4 text-xs text-muted-warm">
          <CalendarClock className="h-3.5 w-3.5 text-muted-warm/70" aria-hidden />
          {emptyText}
        </p>
      ) : (
        <div className="panel overflow-hidden p-0">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/prospects/${r.id}`}
              className="card-hover group flex items-center gap-4 px-4 py-2.5 [&:not(:first-child)]:divider-warm"
            >
              <span
                className={`shrink-0 font-num text-xs font-semibold tabular-nums ${dateClass}`}
              >
                {fmt(new Date(r.next_action_at))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-choco">
                  {r.company_name}
                </p>
                <p className="truncate text-sm text-muted-warm">
                  {r.contact_name ?? '—'}
                  {r.phone && (
                    <span className="ml-2 inline-flex items-center gap-1 font-num text-xs tabular-nums text-brand-dark">
                      <Phone className="h-3 w-3" aria-hidden />
                      {r.phone}
                    </span>
                  )}
                </p>
              </div>
              <StatusBadge
                status={r.status}
                size="sm"
                className="hidden shrink-0 sm:inline-flex"
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
