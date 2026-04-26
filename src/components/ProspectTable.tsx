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
import ProspectModal, { type ProspectFormValues } from './ProspectModal';
import ProspectDetailsModal from './ProspectDetailsModal';

type ProspectTableProps = {
  initialProspects: Prospect[];
  currentUserId: string;
};

export default function ProspectTable({
  initialProspects,
  currentUserId,
}: ProspectTableProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [filter, setFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [viewing, setViewing] = useState<Prospect | null>(null);
  const [notesFor, setNotesFor] = useState<Prospect | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return prospects;
    return prospects.filter((p) => p.status === filter);
  }, [prospects, filter]);

  async function handleCreate(values: ProspectFormValues) {
    setError(null);
    const payload = {
      created_by: currentUserId,
      assigned_to: currentUserId,
      company_name: values.company_name.trim(),
      contact_name: values.contact_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      sector: values.sector.trim() || null,
      city: values.city.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
    };
    const { data, error } = await supabase
      .from('prospects')
      .insert(payload)
      .select()
      .single();

    if (error) {
      setError(error.message);
      throw error;
    }
    if (data) setProspects((prev) => [data as Prospect, ...prev]);
  }

  async function handleEdit(values: ProspectFormValues) {
    if (!editing) return;
    setError(null);
    const patch = {
      company_name: values.company_name.trim(),
      contact_name: values.contact_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      sector: values.sector.trim() || null,
      city: values.city.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
    };
    const { data, error } = await supabase
      .from('prospects')
      .update(patch)
      .eq('id', editing.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      throw error;
    }
    if (data) {
      setProspects((prev) =>
        prev.map((p) => (p.id === editing.id ? (data as Prospect) : p))
      );
    }
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
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? (data as Prospect) : p))
      );
    }
  }

  async function handleDelete(prospect: Prospect) {
    if (!confirm(`Supprimer le prospect "${prospect.company_name}" ?`)) return;
    setError(null);
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospect.id);

    if (error) {
      setError(error.message);
      return;
    }
    setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
  }

  async function handleSaveNotes() {
    if (!notesFor) return;
    setError(null);
    const { data, error } = await supabase
      .from('prospects')
      .update({ notes: notesDraft.trim() || null })
      .eq('id', notesFor.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setProspects((prev) =>
        prev.map((p) => (p.id === notesFor.id ? (data as Prospect) : p))
      );
    }
    setNotesFor(null);
  }

  /** Un prospect issu de Notion possède au moins un champ analytique enrichi
   *  (analyse_*, recommandation_approche, arguments_cles, besoins_detectes…).
   *  On utilise ça pour décider d'afficher l'icône "Voir analyse". */
  function hasEnrichment(p: Prospect): boolean {
    return Boolean(
      p.analyse_besoin ||
        p.analyse_budget ||
        p.analyse_timing ||
        p.recommandation_approche ||
        (p.arguments_cles && p.arguments_cles.length > 0) ||
        (p.besoins_detectes && p.besoins_detectes.length > 0) ||
        p.instagram ||
        p.facebook ||
        p.linkedin_contact ||
        p.linkedin_entreprise ||
        p.tiktok ||
        p.ca_estime ||
        p.classification ||
        p.role_contact
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            + Nouveau prospect
          </button>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gnd-muted">
          {filtered.length} prospect{filtered.length > 1 ? 's' : ''}
          {filter !== 'all' ? ` (${prospects.length} au total)` : ''}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gnd-muted">
            <tr>
              <th className="px-4 py-3 text-left">Entreprise</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Ville</th>
              <th className="px-4 py-3 text-left">Secteur</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">MAJ</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gnd-muted">
                  Aucun prospect pour le moment.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-gnd-primary">
                    <div className="flex items-center gap-2">
                      <span>{p.company_name}</span>
                      {p.notion_page_id && (
                        <span
                          title="Prospect synchronisé depuis Notion"
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700"
                        >
                          Notion
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
                  <td className="px-4 py-3 text-gnd-muted">
                    {formatDate(p.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setNotesFor(p);
                        setNotesDraft(p.notes ?? '');
                      }}
                      className="text-xs text-gnd-accent hover:underline"
                    >
                      {p.notes ? 'Voir' : 'Ajouter'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {hasEnrichment(p) && (
                        <button
                          onClick={() => setViewing(p)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          aria-label="Voir l'analyse complète"
                          title="Voir l'analyse complète (gérant, social, recommandation, arguments…)"
                        >
                          🔍
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded p-1 text-gnd-muted hover:bg-slate-100 hover:text-gnd-primary"
                        aria-label="Modifier"
                        title="Modifier"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                        aria-label="Supprimer"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProspectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        title="Nouveau prospect"
        submitLabel="Créer le prospect"
      />

      <ProspectModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
        initial={
          editing
            ? {
                company_name: editing.company_name,
                contact_name: editing.contact_name ?? '',
                phone: editing.phone ?? '',
                email: editing.email ?? '',
                website: editing.website ?? '',
                sector: editing.sector ?? '',
                city: editing.city ?? '',
                status: editing.status,
                notes: editing.notes ?? '',
              }
            : undefined
        }
        title={editing ? `Modifier : ${editing.company_name}` : 'Modifier'}
        submitLabel="Enregistrer"
      />

      <ProspectDetailsModal
        prospect={viewing}
        onClose={() => setViewing(null)}
      />

      {notesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gnd-primary">
                Notes · {notesFor.company_name}
              </h3>
              <button
                onClick={() => setNotesFor(null)}
                className="text-gnd-muted hover:text-gnd-primary"
              >
                ×
              </button>
            </div>

            <textarea
              rows={8}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm"
              placeholder="Contexte, historique, prochaines actions…"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNotesFor(null)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleSaveNotes} className="btn-primary">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
