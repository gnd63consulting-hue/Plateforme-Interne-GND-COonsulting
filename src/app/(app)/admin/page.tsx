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
  const prospects = (prospectsRaw ?? []) as Prospect[];

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
  let wonCount = 0;
  let rdvCount = 0;
  let contactedCount = 0;

  for (const p of prospects) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    const key = p.assigned_to ?? p.created_by;
    byAssignee.set(key, (byAssignee.get(key) ?? 0) + 1);
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

  // Classement commerciaux : triés par nombre de prospects assignés DESC
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
      return { uid, total, contacted, rdv, won };
    })
    .sort((a, b) => b.total - a.total);

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

      {/* ---------- Stats prospects ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Vue d&apos;ensemble prospects
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total prospects" value={prospects.length} />
          <StatCard label="Contactés+" value={contactedCount} />
          <StatCard label="RDV pris" value={rdvCount} />
          <StatCard label="Gagnés" value={wonCount} />
        </div>

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
              Classement par commercial
            </h3>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gnd-muted">
                <tr>
                  <th className="py-1 text-left">Commercial</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1 text-right">Contacté+</th>
                  <th className="py-1 text-right">RDV</th>
                  <th className="py-1 text-right">Gagné</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
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
                    <td className="py-1.5 text-right font-mono text-blue-700">
                      {r.contacted}
                    </td>
                    <td className="py-1.5 text-right font-mono text-indigo-700">
                      {r.rdv}
                    </td>
                    <td className="py-1.5 text-right font-mono text-emerald-700">
                      {r.won}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- Pipeline prospects (avec filtre commercial) ---------- */}
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
        Lecture seule (sauf bouton Sync). Pour corriger une donnée, passer par
        Supabase Studio directement.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-gnd-primary">{value}</div>
      <div className="text-xs uppercase tracking-wide text-gnd-muted">
        {label}
      </div>
    </div>
  );
}
