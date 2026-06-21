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
      <div className="relative mb-8 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-10 select-none font-marcellus text-[120px] leading-none text-choco/[0.04]"
        >
          Relances
        </span>
        <SectionHeader
          as="h1"
          eyebrow="Mon pipeline · Relances"
          title={
            <>
              Mes <span className="italic text-brand-dark">relances</span>
            </>
          }
          subtitle="Tes prospects avec une date de relance posée. En retard d'abord, puis aujourd'hui, puis les 7 prochains jours. Triés par date."
        />
      </div>

      {/* Stats — cartes au nouveau système */}
      <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
        <RelanceStat label="En retard" value={overdue.length} tone="rose" />
        <RelanceStat label="Aujourd'hui" value={today.length} tone="amber" />
        <RelanceStat label="À venir (7j)" value={upcoming.length} tone="emerald" />
      </div>

      {rows.length === 0 ? (
        <div className="surface-ceramic flex flex-col items-center justify-center rounded-3xl p-16 text-center">
          <span
            aria-hidden
            className="orange-glow mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-pale text-brand-dark"
          >
            <AlarmClock className="h-7 w-7" />
          </span>
          <p className="font-marcellus text-2xl text-choco">
            Aucune relance planifiée.
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-warm">
            Pose une date de relance depuis la fiche d&apos;un prospect (bouton
            notes) pour la voir apparaître ici.
          </p>
          <Button href="/prospects" variant="primary" size="sm" className="mt-6">
            Voir mes prospects
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="space-y-7">
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
    <div className="surface-ceramic rounded-3xl p-5">
      <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
        {label}
      </p>
      <p className={`mt-1.5 font-marcellus text-3xl tabular-nums ${valueClass}`}>
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
        <h2 className="font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">
          {title} ({rows.length})
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 pl-4 text-xs text-muted-warm">
          <CalendarClock className="h-3.5 w-3.5 text-muted-warm/70" aria-hidden />
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/prospects/${r.id}`}
              className="surface-ceramic card-hover group flex items-center gap-4 rounded-2xl p-4"
            >
              <span
                className={`shrink-0 font-inter text-xs font-semibold tabular-nums ${dateClass}`}
              >
                {fmt(new Date(r.next_action_at))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-marcellus text-base text-choco">
                  {r.company_name}
                </p>
                <p className="truncate text-sm text-muted-warm">
                  {r.contact_name ?? '—'}
                  {r.phone && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-brand-dark">
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
