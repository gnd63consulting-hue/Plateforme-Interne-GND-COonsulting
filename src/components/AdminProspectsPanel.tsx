'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import {
  formatDate,
  labelForStatus,
  STATUS_OPTIONS,
  toneForStatus,
  type Prospect,
} from '@/lib/prospects';
import ProspectDetailsModal from './ProspectDetailsModal';

type User = { id: string; label: string };

type Props = {
  prospects: Prospect[];
  users: User[];
};

/**
 * Vue admin : pipeline global avec colonne "Assigné à" + filtre par
 * commercial et par statut. Le statut est éditable directement (l'admin a
 * une RLS policy qui lui permet d'updater n'importe quel prospect). Chaque
 * changement est propagé fire-and-forget vers Notion via
 * /api/prospects/[id]/sync-status-to-notion (même comportement que
 * ProspectTable côté commercial).
 *
 * Le bouton 🔍 ouvre ProspectDetailsModal pour voir l'enrichissement
 * Notion complet (gérant, social, analyses, recommandation, arguments).
 */
export default function AdminProspectsPanel({
  prospects: initialProspects,
  users,
}: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewing, setViewing] = useState<Prospect | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

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

  /** Fire-and-forget : after a successful Supabase status update, push the
   *  equivalent Notion statut back so the source DB stays in sync with the
   *  admin's action. Errors are logged but don't break the UI. */
  function pushStatusToNotion(prospectId: string) {
    fetch(`/api/prospects/${prospectId}/sync-status-to-notion`, {
      method: 'POST',
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(
        `[admin sync-status-to-notion] failed for prospect ${prospectId}:`,
        err
      );
    });
  }

  async function handleStatusChange(prospect: Prospect, status: string) {
    setError(null);
    const { data, error } = await supabase
      .from('prospects')
      .update({ status })
      .eq('id', prospect.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? updated : p))
      );
      if (updated.notion_page_id) {
        pushStatusToNotion(updated.id);
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gnd-muted">
        {filtered.length} prospect{filtered.length > 1 ? 's' : ''} affiché
        {filtered.length > 1 ? 's' : ''}
        {filtered.length !== prospects.length &&
          ` (${prospects.length} au total)`}
        .
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
              <th className="px-4 py-3 text-right">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{p.company_name}</span>
                    {p.classification && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        {p.classification}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{p.contact_name ?? '—'}</div>
                  {p.role_contact && (
                    <div className="text-xs text-gnd-muted">
                      {p.role_contact}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.phone ? (
                    <a
                      href={`tel:${p.phone}`}
                      className="text-gnd-primary hover:underline"
                    >
                      {p.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.email ? (
                    <a
                      href={`mailto:${p.email}`}
                      className="text-gnd-primary hover:underline"
                    >
                      {p.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.city ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.sector ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p, e.target.value)}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${toneForStatus(
                      p.status
                    )}`}
                    aria-label={`Statut de ${p.company_name}`}
                  >
                    {/* Si le statut courant n'est pas dans la liste,
                        on l'ajoute en tête pour ne pas le perdre au save. */}
                    {!STATUS_OPTIONS.some((o) => o.value === p.status) && (
                      <option value={p.status}>
                        {labelForStatus(p.status)}
                      </option>
                    )}
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-gnd-muted">
                  {p.notion_page_id ? 'Notion' : 'Manuel'}
                </td>
                <td className="px-4 py-3 text-gnd-muted">
                  {formatDate(p.updated_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setViewing(p)}
                    className="rounded p-1 text-blue-600 hover:bg-blue-50"
                    aria-label={`Voir l'analyse complète de ${p.company_name}`}
                    title="Voir l'analyse complète"
                  >
                    🔍
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProspectDetailsModal
        prospect={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
