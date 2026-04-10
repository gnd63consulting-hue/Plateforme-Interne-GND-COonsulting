import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import {
  formatDate,
  labelForStatut,
  toneForStatut,
  type Prospect,
  type ProspectStatut,
} from '@/lib/prospects';

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

type AdminProspect = Prospect;

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

  // Admin RLS policies allow reading all users, progressions and prospects.
  const [{ data: usersRaw }, { data: progressionsRaw }, { data: prospectsRaw }] =
    await Promise.all([
      supabase.from('users').select('id, email, full_name, role'),
      supabase.from('progressions').select('user_id, module_slug, completed, completed_at'),
      supabase
        .from('prospects')
        .select('*')
        .order('updated_at', { ascending: false }),
    ]);

  const users = (usersRaw ?? []) as AdminUser[];
  const progressions = (progressionsRaw ?? []) as AdminProgression[];
  const prospects = (prospectsRaw ?? []) as AdminProspect[];

  // Map user_id -> Set of completed module slugs
  const completedByUser = new Map<string, Set<string>>();
  // Map user_id -> latest completed_at
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

  const userById = new Map(users.map((u) => [u.id, u]));

  // Sort commerciaux first, admins second, by name.
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? 1 : -1;
    return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
  });

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold text-gnd-primary">Administration</h1>
        <p className="mt-1 text-gnd-muted">
          Vue en lecture seule : progression formation et pipeline prospects global.
        </p>
      </header>

      {/* ---------- Section 1 : Suivi formation ---------- */}
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
                  <td colSpan={5} className="px-4 py-10 text-center text-gnd-muted">
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

      {/* ---------- Section 2 : Pipeline prospects global ---------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gnd-primary">
          Pipeline prospects global
        </h2>
        <p className="text-sm text-gnd-muted">
          {prospects.length} prospect{prospects.length > 1 ? 's' : ''} au total, tous commerciaux confondus.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gnd-muted">
              <tr>
                <th className="px-4 py-3 text-left">Commercial</th>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Ville</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">MAJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prospects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gnd-muted">
                    Aucun prospect pour le moment.
                  </td>
                </tr>
              )}
              {prospects.map((p) => {
                const owner = userById.get(p.user_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {owner?.full_name ?? owner?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gnd-primary">{p.nom}</td>
                    <td className="px-4 py-3 text-slate-600">{p.telephone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.ville ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${toneForStatut(
                          p.statut as ProspectStatut
                        )}`}
                      >
                        {labelForStatut(p.statut as ProspectStatut)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gnd-muted">
                      {formatDate(p.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gnd-muted">
        Lecture seule. Pour corriger une donnée, passer par Supabase Studio directement.
      </p>
    </div>
  );
}
