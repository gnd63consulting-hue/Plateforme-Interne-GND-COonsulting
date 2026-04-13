'use client';

import { useMemo, useState } from 'react';
import {
  formatDate,
  labelForStatus,
  STATUS_OPTIONS,
  toneForStatus,
  type Prospect,
} from '@/lib/prospects';

type User = { id: string; label: string };

type Props = {
  prospects: Prospect[];
  users: User[];
};

/**
 * Vue admin : pipeline global avec colonne "Assigné à" + filtre par
 * commercial et par statut. Lecture seule — les modifs passent par
 * /prospects (commercial) ou Supabase Studio (admin).
 */
export default function AdminProspectsPanel({ prospects, users }: Props) {
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const userLabel = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.label]));
    return (id: string | null) =>
      !id ? '— non assigné' : map.get(id) ?? id.slice(0, 8);
  }, [users]);

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      const owner = p.assigned_to ?? p.created_by;
      if (assigneeFilter === 'all') return true;
      if (assigneeFilter === 'unassigned') return !p.assigned_to;
      return owner === assigneeFilter;
    });
  }, [prospects, assigneeFilter, statusFilter]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gnd-muted">
        {filtered.length} prospect{filtered.length > 1 ? 's' : ''} affiché
        {filtered.length > 1 ? 's' : ''}
        {filtered.length !== prospects.length &&
          ` (${prospects.length} au total)`}
        .
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Tous les commerciaux</option>
          <option value="unassigned">Non assignés</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gnd-muted">
            <tr>
              <th className="px-4 py-3 text-left">Assigné à</th>
              <th className="px-4 py-3 text-left">Entreprise</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Ville</th>
              <th className="px-4 py-3 text-left">Secteur</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">MAJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-gnd-muted"
                >
                  Aucun prospect ne matche les filtres.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">
                  {userLabel(p.assigned_to)}
                </td>
                <td className="px-4 py-3 font-medium text-gnd-primary">
                  {p.company_name}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.contact_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.phone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{p.email ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{p.city ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.sector ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${toneForStatus(
                      p.status
                    )}`}
                  >
                    {labelForStatus(p.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gnd-muted">
                  {p.notion_page_id ? 'Notion' : 'Manuel'}
                </td>
                <td className="px-4 py-3 text-gnd-muted">
                  {formatDate(p.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
