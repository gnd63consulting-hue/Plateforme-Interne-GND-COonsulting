'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import {
  formatDate,
  labelForStatut,
  STATUT_OPTIONS,
  toneForStatut,
  type Prospect,
  type ProspectStatut,
} from '@/lib/prospects';
import ProspectModal, { type ProspectFormValues } from './ProspectModal';

type ProspectTableProps = {
  initialProspects: Prospect[];
  currentUserId: string;
};

export default function ProspectTable({
  initialProspects,
  currentUserId,
}: ProspectTableProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [filter, setFilter] = useState<ProspectStatut | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [notesFor, setNotesFor] = useState<Prospect | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return prospects;
    return prospects.filter((p) => p.statut === filter);
  }, [prospects, filter]);

  async function handleCreate(values: ProspectFormValues) {
    setError(null);
    const payload = {
      user_id: currentUserId,
      nom: values.nom.trim(),
      telephone: values.telephone.trim() || null,
      email: values.email.trim() || null,
      ville: values.ville.trim() || null,
      statut: values.statut,
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
      nom: values.nom.trim(),
      telephone: values.telephone.trim() || null,
      email: values.email.trim() || null,
      ville: values.ville.trim() || null,
      statut: values.statut,
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

  async function handleStatutChange(prospect: Prospect, statut: ProspectStatut) {
    setError(null);
    const { data, error } = await supabase
      .from('prospects')
      .update({ statut })
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
    if (!confirm(`Supprimer le prospect "${prospect.nom}" ?`)) return;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            + Nouveau prospect
          </button>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ProspectStatut | 'all')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            {STATUT_OPTIONS.map((opt) => (
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
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Ville</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">MAJ</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gnd-muted">
                  Aucun prospect pour le moment.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-gnd-primary">
                    <div className="flex items-center gap-2">
                      <span>{p.nom}</span>
                      {p.notion_page_id && (
                        <span
                          title="Prospect assigné depuis Notion"
                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700"
                        >
                          Assigné
                        </span>
                      )}
                    </div>
                    {p.nom_entreprise && p.nom_entreprise !== p.nom && (
                      <div className="text-xs font-normal text-gnd-muted">
                        {p.nom_entreprise}
                        {p.secteur_activite && ` · ${p.secteur_activite}`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.ville ?? '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.statut}
                      onChange={(e) =>
                        handleStatutChange(p, e.target.value as ProspectStatut)
                      }
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${toneForStatut(
                        p.statut
                      )}`}
                      aria-label={`Statut de ${p.nom}`}
                    >
                      {STATUT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gnd-muted">{formatDate(p.updated_at)}</td>
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
                nom: editing.nom,
                telephone: editing.telephone ?? '',
                email: editing.email ?? '',
                ville: editing.ville ?? '',
                statut: editing.statut,
                notes: editing.notes ?? '',
              }
            : undefined
        }
        title={editing ? `Modifier : ${editing.nom}` : 'Modifier'}
        submitLabel="Enregistrer"
      />

      {notesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gnd-primary">
                Notes · {notesFor.nom}
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
