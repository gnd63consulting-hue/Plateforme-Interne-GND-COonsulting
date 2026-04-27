import { redirect } from 'next/navigation';
import {
  Activity,
  Banknote,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  FileSignature,
  Filter,
  GraduationCap,
  Layers,
  Mail,
  Medal,
  Phone,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import {
  formatDate,
  labelForStatus,
  toneForStatus,
  PROSPECT_SELECT_COLUMNS,
  type Prospect,
} from '@/lib/prospects';
import { formatEur, sumCaMidpointEur } from '@/lib/ca-utils';
import AdminSyncButton from '@/components/AdminSyncButton';
import AdminProspectsPanel from '@/components/AdminProspectsPanel';

export const dynamic = 'force-dynamic';

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type AdminProgression = {
  user_id: string;
  module_slug: string;
  completed: boolean;
  completed_at: string | null;
};

type FunnelStage = {
  value: string;
  label: string;
  Icon: typeof Mail;
  barClass: string;
  iconBg: string;
  iconColor: string;
  badge: string;
};

const FUNNEL_STAGES: FunnelStage[] = [
  {
    value: 'a_contacter',
    label: 'À contacter',
    Icon: Mail,
    barClass: 'bg-gradient-to-r from-slate-300 to-slate-400',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    badge: 'bg-slate-200 text-slate-700',
  },
  {
    value: 'contacte',
    label: 'Contacté',
    Icon: Phone,
    barClass: 'bg-gradient-to-r from-blue-300 to-blue-500',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-200 text-blue-800',
  },
  {
    value: 'rdv_pris',
    label: 'RDV pris',
    Icon: CalendarCheck,
    barClass: 'bg-gradient-to-r from-indigo-300 to-indigo-500',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badge: 'bg-indigo-200 text-indigo-800',
  },
  {
    value: 'devis_envoye',
    label: 'Devis envoyé',
    Icon: FileSignature,
    barClass: 'bg-gradient-to-r from-amber-300 to-amber-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    badge: 'bg-amber-200 text-amber-900',
  },
  {
    value: 'gagne',
    label: 'Devis signé',
    Icon: CheckCircle2,
    barClass: 'bg-gradient-to-r from-emerald-300 to-emerald-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-200 text-emerald-900',
  },
];

const ACTIVE_PIPELINE_STATUSES = new Set([
  'a_contacter',
  'contacte',
  'rdv_pris',
  'devis_envoye',
  'gagne',
]);

export default async function AdminPage() {
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

  if (me?.role !== 'admin') {
    redirect('/dashboard');
  }

  const [
    { data: usersRaw },
    { data: progressionsRaw },
    { data: prospectsRaw },
  ] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role'),
    supabase
      .from('progressions')
      .select('user_id, module_slug, completed, completed_at'),
    supabase
      .from('prospects')
      .select(PROSPECT_SELECT_COLUMNS)
      .order('updated_at', { ascending: false }),
  ]);

  const users = (usersRaw ?? []) as AdminUser[];
  const progressions = (progressionsRaw ?? []) as AdminProgression[];
  const prospects = (prospectsRaw ?? []) as unknown as Prospect[];

  // -------- Agrégats formation --------
  const completedByUser = new Map<string, Set<string>>();
  const lastByUser = new Map<string, string>();

  for (const p of progressions) {
    if (!p.completed) continue;
    const set = completedByUser.get(p.user_id) ?? new Set<string>();
    set.add(p.module_slug);
    completedByUser.set(p.user_id, set);

    if (p.completed_at) {
      const prev = lastByUser.get(p.user_id);
      if (!prev || p.completed_at > prev) {
        lastByUser.set(p.user_id, p.completed_at);
      }
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? 1 : -1;
    return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
  });

  // -------- Agrégats prospects --------
  const userLabel = (id: string | null): string => {
    if (!id) return '— non assigné';
    const u = users.find((x) => x.id === id);
    return u?.full_name ?? u?.email ?? id.slice(0, 8);
  };

  const byStatus = new Map<string, number>();
  const byAssignee = new Map<string, number>();
  const byClassification = new Map<string, number>();
  const bySector = new Map<string, number>();
  const byBranche = new Map<string, number>();
  let wonCount = 0;
  let rdvCount = 0;
  let contactedCount = 0;

  for (const p of prospects) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    const key = p.assigned_to ?? p.created_by;
    byAssignee.set(key, (byAssignee.get(key) ?? 0) + 1);
    if (p.classification) {
      byClassification.set(
        p.classification,
        (byClassification.get(p.classification) ?? 0) + 1
      );
    }
    if (p.sector) {
      bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + 1);
    }
    if (p.branche) {
      byBranche.set(p.branche, (byBranche.get(p.branche) ?? 0) + 1);
    }
    if (p.status === 'gagne') wonCount++;
    if (p.status === 'rdv_pris') rdvCount++;
    if (
      p.status === 'contacte' ||
      p.status === 'rdv_pris' ||
      p.status === 'devis_envoye' ||
      p.status === 'gagne'
    )
      contactedCount++;
  }

  const activeProspects = prospects.filter((p) =>
    ACTIVE_PIPELINE_STATUSES.has(p.status)
  );
  const wonProspects = prospects.filter((p) => p.status === 'gagne');

  const caPotentielTotal = sumCaMidpointEur(activeProspects);
  const caSigne = sumCaMidpointEur(wonProspects);

  const funnelCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: prospects.filter((p) => p.status === stage.value).length,
  }));
  const funnelMaxCount = Math.max(1, ...funnelCounts.map((s) => s.count));

  const ranking = [...byAssignee.entries()]
    .map(([uid, total]) => {
      const assigned = prospects.filter(
        (p) => (p.assigned_to ?? p.created_by) === uid
      );
      const contacted = assigned.filter(
        (p) =>
          p.status === 'contacte' ||
          p.status === 'rdv_pris' ||
          p.status === 'devis_envoye' ||
          p.status === 'gagne'
      ).length;
      const rdv = assigned.filter((p) => p.status === 'rdv_pris').length;
      const won = assigned.filter((p) => p.status === 'gagne').length;
      const caPotentiel = sumCaMidpointEur(
        assigned.filter((p) => ACTIVE_PIPELINE_STATUSES.has(p.status))
      );
      const caSigneCom = sumCaMidpointEur(
        assigned.filter((p) => p.status === 'gagne')
      );
      return { uid, total, contacted, rdv, won, caPotentiel, caSigneCom };
    })
    .sort((a, b) => {
      if (b.caPotentiel !== a.caPotentiel) return b.caPotentiel - a.caPotentiel;
      return b.total - a.total;
    });

  const rankingMaxCa = Math.max(1, ...ranking.map((r) => r.caPotentiel));

  const commercialOptions = sortedUsers
    .filter((u) => u.role === 'commercial' || u.role === 'admin')
    .map((u) => ({
      id: u.id,
      label: `${u.full_name ?? u.email}${u.role === 'admin' ? ' (admin)' : ''}`,
    }));

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gnd-primary">
          Administration
        </h1>
        <p className="mt-1 text-sm text-gnd-muted">
          Vue globale : progression formation, pipeline prospects, sync Notion.
        </p>
      </header>

      {/* ============================================================== */}
      {/* Sync Notion                                                       */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<BarChart3 className="h-4 w-4" />}
          label="Synchronisation Notion"
        />
        <AdminSyncButton options={commercialOptions} />
      </section>

      {/* ============================================================== */}
      {/* Hero KPI cards                                                   */}
      {/* ============================================================== */}
      <section className="space-y-4">
        <SectionTitle
          icon={<Layers className="h-4 w-4" />}
          label="Vue d'ensemble prospects"
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <HeroKpiCard
            tone="blue"
            label="Total prospects"
            value={String(prospects.length)}
            icon={<Users className="h-5 w-5" />}
            sub="actifs dans le pipeline"
          />
          <HeroKpiCard
            tone="amber"
            label="CA potentiel pipeline"
            value={formatEur(caPotentielTotal)}
            icon={<TrendingUp className="h-5 w-5" />}
            sub="midpoint des fourchettes"
          />
          <HeroKpiCard
            tone="emerald"
            label="CA signé"
            value={formatEur(caSigne)}
            icon={<Banknote className="h-5 w-5" />}
            sub="devis signés"
          />
          <HeroKpiCard
            tone="purple"
            label="Devis signés"
            value={String(wonCount)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            sub={
              prospects.length > 0
                ? `${Math.round((wonCount / prospects.length) * 100)} % du total`
                : '—'
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <SecondaryKpi
            label="Contactés+"
            value={String(contactedCount)}
            icon={<Phone className="h-3.5 w-3.5" />}
          />
          <SecondaryKpi
            label="RDV pris"
            value={String(rdvCount)}
            icon={<CalendarCheck className="h-3.5 w-3.5" />}
          />
          <SecondaryKpi
            label="Taux contact"
            value={
              prospects.length > 0
                ? `${Math.round((contactedCount / prospects.length) * 100)} %`
                : '—'
            }
            icon={<Activity className="h-3.5 w-3.5" />}
          />
          <SecondaryKpi
            label="Taux conversion"
            value={
              prospects.length > 0
                ? `${Math.round((wonCount / prospects.length) * 100)} %`
                : '—'
            }
            icon={<Target className="h-3.5 w-3.5" />}
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* Funnel de conversion                                             */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<Filter className="h-4 w-4" />}
          label="Funnel de conversion"
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            {funnelCounts.map((stage, idx) => {
              const widthPct = (stage.count / funnelMaxCount) * 100;
              const prev = idx > 0 ? funnelCounts[idx - 1].count : null;
              const conversionFromPrev =
                prev && prev > 0
                  ? Math.round((stage.count / prev) * 100)
                  : null;
              return (
                <div
                  key={stage.value}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stage.iconBg} ${stage.iconColor}`}
                  >
                    <stage.Icon className="h-4 w-4" />
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="text-sm font-medium text-slate-800">
                      {stage.label}
                    </div>
                  </div>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100">
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-700 ${stage.barClass}`}
                      style={{ width: `${Math.max(2, widthPct)}%` }}
                    />
                    <div className="relative flex h-full items-center justify-end pr-3 text-sm font-mono font-bold text-slate-800">
                      {stage.count}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    {conversionFromPrev != null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <TrendingUp className="h-3 w-3" />
                        {conversionFromPrev} %
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-gnd-muted">
            Le pourcentage à droite indique le taux de passage depuis l'étape
            précédente. Les statuts <em>perdu</em> et <em>archivé</em> sont
            exclus du funnel.
          </p>
        </div>
      </section>

      {/* ============================================================== */}
      {/* Classement commerciaux (full width, premium row)                  */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<Trophy className="h-4 w-4" />}
          label="Classement commerciaux"
          hint="tri par CA potentiel descendant"
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {ranking.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gnd-muted">
              Aucun prospect assigné pour l'instant.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ranking.map((r, idx) => {
                const label = userLabel(r.uid);
                const caRatio = r.caPotentiel / rankingMaxCa;
                return (
                  <li
                    key={r.uid}
                    className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50"
                  >
                    {/* Avatar + name */}
                    <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                      <RankBadge index={idx} />
                      <UserAvatar name={label} size="md" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gnd-primary">
                          {label}
                        </div>
                        <div className="text-xs text-gnd-muted">
                          {r.total} prospect{r.total > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Stats inline */}
                    <div className="col-span-6 flex items-center gap-4 md:col-span-3">
                      <Stat label="RDV" value={r.rdv} tone="indigo" />
                      <Stat
                        label="Gagné"
                        value={r.won}
                        tone={r.won > 0 ? 'emerald' : 'slate'}
                      />
                    </div>

                    {/* CA potentiel bar */}
                    <div className="col-span-6 md:col-span-5">
                      <div className="flex items-center gap-2">
                        <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-100">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-700"
                            style={{
                              width: `${Math.max(4, caRatio * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="min-w-[60px] text-right font-mono text-xs font-semibold text-amber-800">
                          {formatEur(r.caPotentiel)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                        <span>Signé :</span>
                        <span
                          className={`font-mono ${
                            r.caSigneCom > 0
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatEur(r.caSigneCom)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* Distributions : Classification + Top secteurs + Branche          */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<BarChart3 className="h-4 w-4" />}
          label="Distributions"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DistributionCard
            title="Classification"
            entries={byClassification}
            total={prospects.length}
            barClass="bg-amber-400"
            chipClass="bg-amber-100 text-amber-800"
          />
          <DistributionCard
            title="Top secteurs"
            entries={bySector}
            total={prospects.length}
            barClass="bg-blue-400"
            chipClass="bg-blue-100 text-blue-800"
            limit={8}
          />
          <DistributionCard
            title="Branche"
            entries={byBranche}
            total={prospects.length}
            barClass="bg-purple-400"
            chipClass="bg-purple-100 text-purple-800"
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* Répartition par statut                                            */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<Filter className="h-4 w-4" />}
          label="Répartition par statut"
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {byStatus.size === 0 ? (
            <p className="text-sm italic text-gnd-muted">
              Aucune donnée.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {[...byStatus.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([status, n]) => (
                  <li
                    key={status}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ring-slate-200 ${toneForStatus(
                      status
                    )}`}
                  >
                    <span>{labelForStatus(status)}</span>
                    <span className="rounded-full bg-white/70 px-1.5 text-xs font-bold">
                      {n}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* Pipeline prospects (filtered table)                              */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<Layers className="h-4 w-4" />}
          label="Pipeline prospects global"
        />
        <AdminProspectsPanel
          prospects={prospects}
          users={users.map((u) => ({
            id: u.id,
            label: u.full_name ?? u.email,
          }))}
        />
      </section>

      {/* ============================================================== */}
      {/* Suivi formation                                                   */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <SectionTitle
          icon={<GraduationCap className="h-4 w-4" />}
          label="Suivi formation"
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-gnd-muted">
              <tr>
                <th className="px-4 py-3 text-left">Commercial</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Progression</th>
                <th className="px-4 py-3 text-left">Modules</th>
                <th className="px-4 py-3 text-left">Dernière validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-gnd-muted"
                  >
                    Aucun utilisateur pour le moment.
                  </td>
                </tr>
              )}
              {sortedUsers.map((u) => {
                const set = completedByUser.get(u.id) ?? new Set<string>();
                const count = MODULES.filter((m) => set.has(m.slug)).length;
                const last = lastByUser.get(u.id);
                const ratio = MODULES.length
                  ? count / MODULES.length
                  : 0;
                return (
                  <tr key={u.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={u.full_name ?? u.email}
                          size="sm"
                        />
                        <div>
                          <div className="font-medium text-gnd-primary">
                            {u.full_name ?? '—'}
                          </div>
                          {u.role === 'admin' && (
                            <span className="text-xs text-gnd-accent">
                              admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-300 to-emerald-500 transition-all duration-500"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-700">
                          {count}/{MODULES.length}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {MODULES.map((m) => (
                          <span
                            key={m.slug}
                            title={m.title}
                            className={`h-3.5 w-3.5 rounded-sm ${
                              set.has(m.slug)
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gnd-muted">
                      {last ? formatDate(last) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-[11px] italic text-gnd-muted">
        CA calculé à partir des fourchettes Notion (`ca_estime`) en prenant le
        midpoint. Les prospects dont la fourchette est vide ou non reconnue
        sont exclus du total.
      </p>
    </div>
  );
}

// =====================================================================
// Sous-composants visuels
// =====================================================================

function SectionTitle({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <h2 className="text-base font-semibold text-gnd-primary sm:text-lg">
        {label}
      </h2>
      {hint && (
        <span className="text-xs italic text-gnd-muted">({hint})</span>
      )}
    </div>
  );
}

const HERO_TONES: Record<
  string,
  { ring: string; gradient: string; icon: string; valueColor: string }
> = {
  blue: {
    ring: 'ring-blue-200/60',
    gradient: 'bg-gradient-to-br from-blue-50 via-white to-white',
    icon: 'bg-blue-100 text-blue-700',
    valueColor: 'text-blue-950',
  },
  amber: {
    ring: 'ring-amber-200/60',
    gradient: 'bg-gradient-to-br from-amber-50 via-white to-white',
    icon: 'bg-amber-100 text-amber-700',
    valueColor: 'text-amber-900',
  },
  emerald: {
    ring: 'ring-emerald-200/60',
    gradient: 'bg-gradient-to-br from-emerald-50 via-white to-white',
    icon: 'bg-emerald-100 text-emerald-700',
    valueColor: 'text-emerald-900',
  },
  purple: {
    ring: 'ring-purple-200/60',
    gradient: 'bg-gradient-to-br from-purple-50 via-white to-white',
    icon: 'bg-purple-100 text-purple-700',
    valueColor: 'text-purple-900',
  },
};

function HeroKpiCard({
  tone,
  label,
  value,
  icon,
  sub,
}: {
  tone: keyof typeof HERO_TONES;
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  const t = HERO_TONES[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ring-1 ${t.ring} ${t.gradient} p-4 shadow-sm transition hover:shadow-md`}
    >
      <div
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl ${t.icon}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="relative">
        <div
          className={`text-2xl font-bold tracking-tight sm:text-3xl ${t.valueColor}`}
        >
          {value}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
          {label}
        </div>
        {sub && (
          <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
        )}
      </div>
    </div>
  );
}

function SecondaryKpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight text-slate-800">
        {value}
      </div>
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
  tone: 'slate' | 'indigo' | 'emerald';
}) {
  const colorMap = {
    slate: 'text-slate-400',
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className={`font-mono font-bold ${colorMap[tone]}`}>{value}</span>
    </div>
  );
}

function RankBadge({ index }: { index: number }) {
  if (index === 0) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200"
        title="1er"
      >
        <Trophy className="h-3 w-3" />
      </span>
    );
  }
  if (index === 1) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 ring-1 ring-slate-300"
        title="2e"
      >
        <Medal className="h-3 w-3" />
      </span>
    );
  }
  if (index === 2) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 ring-1 ring-orange-200"
        title="3e"
      >
        <Medal className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-mono font-bold text-slate-500 ring-1 ring-slate-200">
      {index + 1}
    </span>
  );
}

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-pink-500',
  'bg-fuchsia-500',
  'bg-purple-500',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

function UserAvatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md';
}) {
  const dim =
    size === 'sm'
      ? 'h-7 w-7 text-[10px]'
      : 'h-9 w-9 text-xs';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ring-2 ring-white ${colorFromName(
        name
      )} ${dim}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

function DistributionCard({
  title,
  entries,
  total,
  barClass,
  chipClass,
  limit,
}: {
  title: string;
  entries: Map<string, number>;
  total: number;
  barClass: string;
  chipClass: string;
  limit?: number;
}) {
  const sorted = [...entries.entries()].sort((a, b) => b[1] - a[1]);
  const display = limit ? sorted.slice(0, limit) : sorted;
  const max = Math.max(1, ...display.map(([, n]) => n));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gnd-muted">
        {title}
      </h3>
      {display.length === 0 ? (
        <p className="text-xs italic text-gnd-muted">Aucune donnée.</p>
      ) : (
        <ul className="space-y-2">
          {display.map(([key, n]) => {
            const ratio = n / max;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <li key={key}>
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span
                    className={`truncate rounded px-1.5 py-0.5 text-xs font-medium ${chipClass}`}
                    title={key}
                  >
                    {key}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-700">
                    <span className="font-bold">{n}</span>
                    {total > 0 && (
                      <span className="ml-1 text-slate-400">({pct} %)</span>
                    )}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${barClass}`}
                    style={{ width: `${Math.max(4, ratio * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
