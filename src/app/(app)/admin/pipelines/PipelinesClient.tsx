'use client';

import { useState, useTransition } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
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

/* Design System creme/orange (valeurs verrouillees) — aligne sur la suite admin. */
const INK = '#2A2320';
const INK_SOFT = '#7B665C';
const INK_FAINT = '#9B8A7E';
const CHOCO = '#532418';
const AMBER = '#B5601C';
const GREEN = '#4F7A38';
const CARD_BG = '#FFFFFF';
const BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';

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
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 28px 64px', color: INK }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: AMBER, marginBottom: 10 }}>
          ADMIN · PIPELINES
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: CHOCO, margin: 0, lineHeight: 1.1 }}>
          Lignes de metier
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: INK_SOFT, marginTop: 12, maxWidth: 620 }}>
          Cree et organise tes pipelines commerciaux (Sites web, Mariage,
          Audiovisuel…). Les etapes du Kanban restent identiques pour chaque
          pipeline. Le pipeline par defaut recoit les nouveaux prospects.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 12,
            background: '#FBEAE6',
            border: '1px solid #E7C3B8',
            color: '#8A3B28',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Creation */}
      <section
        style={{
          background: CARD_BG,
          border: BORDER,
          borderRadius: 16,
          padding: 18,
          marginBottom: 28,
          boxShadow: '0 1px 3px rgba(83,36,24,0.06)',
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: INK_FAINT, marginBottom: 12 }}>
          Nouveau pipeline
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex. Mariage)"
            style={{
              flex: 1,
              minWidth: 200,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #E2D5C3',
              fontSize: 14,
              color: INK,
              fontFamily: MONO,
              background: '#FFFDFB',
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: INK_SOFT, fontFamily: MONO }}>
            Couleur
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ width: 36, height: 32, border: '1px solid #E2D5C3', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: newName.trim() ? '#F39253' : '#E7D8C8',
              color: '#2A1810',
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 600,
              cursor: newName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={15} strokeWidth={2} />
            Creer
          </button>
        </div>
      </section>

      {/* Liste */}
      <div style={{ background: CARD_BG, border: BORDER, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(83,36,24,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FBF7F2' }}>
              {['Ordre', 'Pipeline', 'Prospects', 'Defaut', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_FAINT, borderBottom: '1px solid #E2D5C3' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pipelines.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: INK_SOFT }}>
                  Aucun pipeline. Cree le premier ci-dessus.
                </td>
              </tr>
            ) : (
              pipelines.map((p, i) => {
                const count = counts[p.id] ?? 0;
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F0E7DC' }}>
                    {/* Ordre */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
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
                    <td style={{ padding: '10px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="color"
                            value={editColor || '#F39253'}
                            onChange={(e) => setEditColor(e.target.value)}
                            style={{ width: 30, height: 28, border: '1px solid #E2D5C3', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
                            aria-label="Couleur"
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2D5C3', fontSize: 13, color: INK, fontFamily: MONO, minWidth: 180 }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            aria-hidden
                            style={{ width: 10, height: 10, borderRadius: 999, background: p.color ?? '#C9B7A6', flexShrink: 0 }}
                          />
                          <span style={{ fontFamily: SERIF, fontSize: 15, color: CHOCO }}>{p.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Compteur */}
                    <td style={{ padding: '10px 16px', fontFamily: MONO, color: INK_SOFT, fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </td>

                    {/* Defaut */}
                    <td style={{ padding: '10px 16px' }}>
                      {p.is_default ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 11, fontWeight: 600, color: GREEN }}>
                          <Star size={13} fill={GREEN} color={GREEN} />
                          Par defaut
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => setDefaultPipeline({ id: p.id }))}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, border: '1px solid #E2D5C3', background: 'transparent', color: AMBER, fontFamily: MONO, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Star size={12} />
                          Definir
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', gap: 4 }}>
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
                            <Check size={15} color={GREEN} />
                          </IconBtn>
                          <IconBtn label="Annuler" onClick={cancelEdit}>
                            <X size={15} />
                          </IconBtn>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: 4 }}>
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
                            <Trash2 size={14} color={p.is_default || count > 0 ? INK_FAINT : '#B0473A'} />
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

      <p style={{ marginTop: 16, fontSize: 12, color: INK_FAINT, lineHeight: 1.5 }}>
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid #E2D5C3',
        background: disabled ? '#F6EFE7' : '#FFFDFB',
        color: '#7B665C',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
