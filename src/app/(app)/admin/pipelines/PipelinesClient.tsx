'use client';

import { useState, useTransition } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Layers,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { Pipeline } from '@/lib/pipelines';
import {
  createPipeline,
  renamePipeline,
  reorderPipeline,
  setDefaultPipeline,
  deletePipeline,
} from './actions';

type Props = {
  initialPipelines: Pipeline[];
  counts: Record<string, number>;
};

export default function PipelinesClient({ initialPipelines, counts }: Props) {
  const [pipelines] = useState<Pipeline[]>(initialPipelines);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Creation
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#F39253');

  // Edition inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  /** Applique une action serveur puis recharge les donnees serveur
   *  (revalidatePath cote action) via un reload simple — module admin a faible
   *  frequence d'usage, on garde l'implementation fiable et minimale. */
  function run(action: () => Promise<{ error: string | null }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        setError(res.error);
        return;
      }
      after?.();
      window.location.reload();
    });
  }

  function startEdit(p: Pipeline) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  }

  return (
    <div className="mx-auto max-w-[920px] px-6 pb-20 pt-10 font-inter text-ink-warm">
      {/* En-tete cockpit chocolat */}
      <header className="surface-chocolate relative mb-6 overflow-hidden rounded-[16px] p-5 sm:p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-8 select-none font-marcellus text-[110px] leading-none text-cream/[0.08]"
        >
          Lignes
        </span>
        <div className="relative">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-[#E0A572]">
              Admin · Pipelines
            </span>
          </span>
          <h1 className="mt-3 font-marcellus text-3xl font-medium leading-tight tracking-[-0.01em] text-cream">
            Lignes de metier
          </h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-cream/55">
            Cree et organise tes pipelines commerciaux (Sites web, Mariage,
            Audiovisuel…). Les etapes du Kanban restent identiques pour chaque
            pipeline. Le pipeline par defaut recoit les nouveaux prospects.
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
        >
          {error}
        </div>
      )}

      {/* Creation */}
      <section className="panel-accent mb-6 rounded-[14px] p-4">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Nouveau pipeline
          </span>
        </span>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex. Mariage)"
            className="min-w-[200px] flex-1 rounded-2xl border border-border-soft bg-cream/60 px-4 py-2.5 font-inter text-sm text-ink-warm transition focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
          <label className="flex items-center gap-2 text-xs text-[#6F5A50]">
            Couleur
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded-xl border border-border-soft bg-transparent"
              aria-label="Couleur du pipeline"
            />
          </label>
          <button
            type="button"
            disabled={isPending || !newName.trim()}
            onClick={() =>
              run(
                () => createPipeline({ name: newName, color: newColor }),
                () => setNewName('')
              )
            }
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-[#2A1810] transition ${
              newName.trim()
                ? 'orange-glow bg-brand hover:bg-brand-dark'
                : 'cursor-not-allowed bg-cream-deep text-muted-warm'
            }`}
          >
            <Plus size={15} strokeWidth={2} />
            Creer
          </button>
        </div>
      </section>

      {/* Liste */}
      <div className="panel overflow-hidden rounded-[14px]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-cream-deep/50">
              {['Ordre', 'Pipeline', 'Prospects', 'Defaut', ''].map((h) => (
                <th
                  key={h}
                  className="border-b border-[rgba(74,36,26,0.10)] px-5 py-2.5 text-left font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pipelines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
                      <Layers size={18} />
                    </span>
                    <p className="text-sm text-[#6F5A50]">
                      Aucun pipeline. Cree le premier ci-dessus.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pipelines.map((p, i) => {
                const count = counts[p.id] ?? 0;
                const isEditing = editingId === p.id;
                return (
                  <tr
                    key={p.id}
                    className="divider-warm border-b transition last:border-b-0 hover:bg-cream/50"
                  >
                    {/* Ordre */}
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <div className="inline-flex gap-1.5">
                        <IconBtn
                          label="Monter"
                          disabled={isPending || i === 0}
                          onClick={() => run(() => reorderPipeline({ id: p.id, direction: 'up' }))}
                        >
                          <ArrowUp size={14} />
                        </IconBtn>
                        <IconBtn
                          label="Descendre"
                          disabled={isPending || i === pipelines.length - 1}
                          onClick={() => run(() => reorderPipeline({ id: p.id, direction: 'down' }))}
                        >
                          <ArrowDown size={14} />
                        </IconBtn>
                      </div>
                    </td>

                    {/* Nom (+ couleur) */}
                    <td className="px-5 py-2.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editColor || '#F39253'}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-7 w-8 cursor-pointer rounded-lg border border-border-soft bg-transparent"
                            aria-label="Couleur"
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="min-w-[180px] rounded-xl border border-border-soft bg-cream/60 px-3 py-1.5 font-inter text-sm text-ink-warm transition focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ background: p.color ?? '#C9B7A6' }}
                          />
                          <span className="font-marcellus text-[15px] text-choco">{p.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Compteur */}
                    <td className="px-5 py-2.5 font-num tabular-nums text-[#6F5A50]">
                      {count}
                    </td>

                    {/* Defaut */}
                    <td className="px-5 py-2.5">
                      {p.is_default ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok-fg">
                          <Star size={13} className="fill-current" />
                          Par defaut
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => setDefaultPipeline({ id: p.id }))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-burnt transition hover:bg-cream-deep"
                        >
                          <Star size={12} />
                          Definir
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-5 py-2.5 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-1.5">
                          <IconBtn
                            label="Enregistrer"
                            disabled={isPending || !editName.trim()}
                            onClick={() =>
                              run(
                                () =>
                                  renamePipeline({
                                    id: p.id,
                                    name: editName,
                                    color: editColor || null,
                                  }),
                                cancelEdit
                              )
                            }
                          >
                            <Check size={15} className="text-ok-fg" />
                          </IconBtn>
                          <IconBtn label="Annuler" onClick={cancelEdit}>
                            <X size={15} />
                          </IconBtn>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1.5">
                          <IconBtn label="Renommer" onClick={() => startEdit(p)}>
                            <Pencil size={14} />
                          </IconBtn>
                          <IconBtn
                            label="Supprimer"
                            disabled={isPending || p.is_default || count > 0}
                            title={
                              p.is_default
                                ? 'Le pipeline par defaut ne peut pas etre supprime'
                                : count > 0
                                ? 'Reassignez les prospects avant suppression'
                                : 'Supprimer'
                            }
                            onClick={() => {
                              if (!confirm(`Supprimer le pipeline « ${p.name} » ?`)) return;
                              run(() => deletePipeline({ id: p.id }));
                            }}
                          >
                            <Trash2
                              size={14}
                              className={p.is_default || count > 0 ? 'text-muted-warm' : 'text-danger-fg'}
                            />
                          </IconBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-warm">
        Un pipeline contenant des prospects ne peut pas etre supprime : reassigne
        d&apos;abord ses prospects depuis le tableau. Le pipeline par defaut est
        protege contre la suppression.
      </p>
    </div>
  );
}

function IconBtn({
  children,
  label,
  title,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border-soft bg-white text-[#7B665C] transition hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
