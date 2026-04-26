import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import {
  formatDate,
  labelForStatus,
  toneForStatus,
  PROSPECT_SELECT_COLUMNS,
  type Prospect,
} from '@/lib/prospects';
import {
  caEstimeToMidpointEur,
  formatEur,
  sumCaMidpointEur,
} from '@/lib/ca-utils';
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

/** Ordre logique du funnel commercial pour la visualisation conversion. */
const FUNNEL_STAGES: { value: string; label: string; tone: string }[] = [
  { value: 'a_contacter', label: 'À contacter', tone: 'bg-slate-200 text-slate-700' },
  { value: 'contacte', label: 'Contacté', tone: 'bg-blue-200 text-blue-800' },
  { value: 'rdv_pris', label: 'RDV pris', tone: 'bg-indigo-200 text-indigo-800' },
  { value: 'devis_envoye', label: 'Devis envoyé', tone: 'bg-amber-200 text-amber-900' },
  { value: 'gagne', label: 'Devis signé', tone: 'bg-emerald-200 text-emerald-900' },
];

/** Statuts considérés comme "actifs dans le funnel". Les autres (perdu,
 *  archived) sont exclus de la majorité des stats CA / conversion. */
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

  // RLS admin policies laissent lire users / progressions / prospects en global.
  const [{ data: usersRaw }, { data: progressionsRaw }, { data: prospectsRaw }] =
    await Promise.all([
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
  // PostgREST loses inference with a dynamic select string; runtime shape
  // matches Prospect by construction (PROSPECT_SELECT_COLUMNS).
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

  // ---- CA stats ----
  const activeProspects = prospects.filter((p) =>
    ACTIVE_PIPELINE_STATUSES.has(p.status)
  );
  const wonProspects = prospects.filter((p) => p.status === 'gagne');

  const caPotentielTotal = sumCaMidpointEur(activeProspects);
  const caSigne = sumCaMidpointEur(wonProspects);

  // ---- Funnel ----
  const funnelCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: prospects.filter((p) => p.status === stage.value).length,
  }));
  const funnelMaxCount = Math.max(1, ...funnelCounts.map((s) => s.count));

  // Classement commerciaux : triés par CA potentiel DESC, fallback total DESC
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

  const commercialOptions = sortedUsers
    .filter((u) => u.role === 'commercial' || u.role === 'admin')
    .map((u) => ({
      id: u.id,
      label: `${u.full_name ?? u.email}${u.role === 'admin' ? ' (admin)' : ''}`,
    }));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-gnd-primary">Administration</h1>
        <p className="mt-1 text-gnd-muted">
          Vue globale : progression formation, pipeline prospects, sync Notion.
        </p>
      </header>

      {/* ---------- Sync Notion ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Synchronisation Notion
        </h2>
        <AdminSyncButton options={commercialOptions} />
      </section>

      {/* ---------- KPI cards : CA + counts ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Vue d&apos;ensemble prospects
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total prospects" value={prospects.length} />
          <StatCard
            label="CA potentiel pipeline"
            valueText={formatEur(caPotentielTotal)}
            tone="text-amber-700"
          />
          <StatCard
            label="CA signé"
            valueText={formatEur(caSigne)}
            tone="text-emerald-700"
          />
          <StatCard label="Devis signés" value={wonCount} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Contactés+" value={contactedCount} />
          <StatCard label="RDV pris" value={rdvCount} />
          <StatCard
            label="Taux contact"
            valueText={
              prospects.length > 0
                ? `${Math.round((contactedCount / prospects.length) * 100)} %`
                : '—'
            }
          />
          <StatCard
            label="Taux conversion"
            valueText={
              prospects.length > 0
                ? `${Math.round((wonCount / prospects.length) * 100)} %`
                : '—'
            }
          />
        </div>
      </section>

      {/* ---------- Funnel de conversion ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Funnel de conversion
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="space-y-3">
            {funnelCounts.map((stage, idx) => {
              const widthPct = (stage.count / funnelMaxCount) * 100;
              const prev = idx > 0 ? funnelCounts[idx - 1].count : null;
              const conversionFromPrev =
                prev && prev > 0
                  ? Math.round((stage.count / prev) * 100)
                  : null;
              return (
                <div key={stage.value} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${stage.tone}`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <div className="relative h-7 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className={`absolute inset-y-0 left-0 ${stage.tone}`}
                      style={{ width: `${Math.max(2, widthPct)}%` }}
                    />
                    <div className="relative flex h-full items-center justify-end pr-2 text-xs font-mono font-semibold text-slate-700">
                      {stage.count}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-right text-xs text-gnd-muted">
                    {conversionFromPrev != null
                      ? `↳ ${conversionFromPrev} %`
                      : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gnd-muted">
            Le pourcentage à droite indique le taux de passage depuis l&apos;étape
            précédente. Les statuts <em>perdu</em> et <em>archivé</em> sont
            exclus du funnel.
          </p>
        </div>
      </section>

      {/* ---------- Classement commerciaux + Répartition par statut ---------- */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Répartition par statut */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gnd-muted">
              Répartition par statut
            </h3>
            <ul className="space-y-1 text-sm">
              {[...byStatus.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([status, n]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneForStatus(
                        status
                      )}`}
                    >
                      {labelForStatus(status)}
                    </span>
                    <span className="font-mono text-gnd-primary">{n}</span>
                  </li>
                ))}
            </ul>
          </div>

          {/* Classement commerciaux */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gnd-muted">
              Classement par commercial (tri par CA potentiel)
            </h3>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gnd-muted">
                <tr>
                  <th className="py-1 text-left">Commercial</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1 text-right">RDV</th>
                  <th className="py-1 text-right">Gagné</th>
                  <th className="py-1 text-right">CA pot.</th>
                  <th className="py-1 text-right">CA signé</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-3 text-center text-gnd-muted"
                    >
                      Aucun prospect assigné pour l&apos;instant.
                    </td>
                  </tr>
                )}
                {ranking.map((r) => (
                  <tr key={r.uid} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-700">
                      {userLabel(r.uid)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-semibold">
                      {r.total}
                    </td>
                    <td className="py-1.5 text-right font-mono text-indigo-700">
                      {r.rdv}
                    </td>
                    <td className="py-1.5 text-right font-mono text-emerald-700">
                      {r.won}
                    </td>
                    <td className="py-1.5 text-right font-mono text-amber-700">
                      {formatEur(r.caPotentiel)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-emerald-700">
                      {formatEur(r.caSigneCom)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- Distributions classification / secteur / branche ---------- */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DistributionCard
          title="Classification"
          entries={byClassification}
          total={prospects.length}
          tone="bg-amber-100 text-amber-800"
        />
        <DistributionCard
          title="Top secteurs"
          entries={bySector}
          total={prospects.length}
          tone="bg-blue-100 text-blue-700"
          limit={8}
        />
        <DistributionCard
          title="Branche"
          entries={byBranche}
          total={prospects.length}
          tone="bg-purple-100 text-purple-700"
        />
      </section>

      {/* ---------- Pipeline prospects (avec filtres avancés) ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Pipeline prospects global
        </h2>
        <AdminProspectsPanel
          prospects={prospects}
          users={users.map((u) => ({
            id: u.id,
            label: u.full_name ?? u.email,
          }))}
        />
      </section>

      {/* ---------- Suivi formation ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Suivi formation
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gnd-muted">
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
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gnd-primary">
                        {u.full_name ?? '—'}
                      </div>
                      {u.role === 'admin' && (
                        <span className="text-xs text-gnd-accent">admin</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{count}</span>
                      <span className="text-gnd-muted"> / {MODULES.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {MODULES.map((m) => (
                          <span
                            key={m.slug}
                            title={m.title}
                            className={`h-4 w-4 rounded ${
                              set.has(m.slug) ? 'bg-emerald-500' : 'bg-slate-200'
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

      <p className="text-xs text-gnd-muted">
        CA calculé à partir des fourchettes Notion (`ca_estime`) en prenant le
        midpoint. Les prospects dont la fourchette est vide ou non reconnue
        sont exclus du total.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`text-2xl font-bold ${tone ?? 'text-gnd-primary'}`}>
        {valueText ?? value ?? '—'}
      </div>
      <div className="text-xs uppercase tracking-wide text-gnd-muted">
        {label}
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  entries,
  total,
  tone,
  limit,
}: {
  title: string;
  entries: Map<string, number>;
  total: number;
  tone: string;
  limit?: number;
}) {
  const sorted = [...entries.entries()].sort((a, b) => b[1] - a[1]);
  const display = limit ? sorted.slice(0, limit) : sorted;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gnd-muted">
        {title}
      </h3>
      {display.length === 0 ? (
        <p className="text-xs text-gnd-muted">Aucune donnée.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {display.map(([key, n]) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span
                className={`truncate rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
                title={key}
              >
                {key}
              </span>
              <span className="shrink-0 font-mono text-gnd-primary">
                {n}
                {total > 0 && (
                  <span className="ml-1 text-xs text-gnd-muted">
                    ({Math.round((n / total) * 100)} %)
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
