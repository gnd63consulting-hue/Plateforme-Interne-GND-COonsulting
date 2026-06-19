'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Check,
  X,
  Pencil,
  Save,
  RotateCcw,
  Mail,
  Linkedin,
  MessageSquare,
  ExternalLink,
  Globe,
} from 'lucide-react';
import {
  type DraftRow,
  statusLabel,
  statusTone,
  channelLabel,
  prospectDisplay,
} from '@/lib/prospect-draft';
import { setDraftStatus, saveDraftContent } from './draft-actions';

const FILTERS = [
  { key: 'draft', label: 'A valider' },
  { key: 'ready', label: 'Valides' },
  { key: 'sent', label: 'Envoyes' },
  { key: 'discarded', label: 'Rejetes' },
  { key: 'all', label: 'Tous' },
];

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'linkedin') return <Linkedin className="h-4 w-4" />;
  if (channel === 'sms') return <MessageSquare className="h-4 w-4" />;
  return <Mail className="h-4 w-4" />;
}

export default function DraftReviewClient({ rows }: { rows: DraftRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('draft');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        alert('Erreur : ' + res.error);
        return;
      }
      router.refresh();
    });
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const res = await saveDraftContent(id, draftSubject, draftBody);
      if (!res.ok) {
        alert('Erreur : ' + res.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function startEdit(r: DraftRow) {
    setEditing(r.id);
    setDraftSubject(r.subject ?? '');
    setDraftBody(r.body ?? '');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-marcellus text-3xl text-brand-dark">Drafts a valider</h1>
        <p className="mt-1 font-inter text-sm text-choco/70">
          Brouillons rediges par les agents (Nyx). Relisez, ajustez, validez ou rejetez. Rien
          n'est envoye sans votre validation.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 font-inter text-sm transition ${
              filter === f.key
                ? 'bg-brand text-white'
                : 'bg-cream-deep text-choco hover:bg-cream-deep/70'
            }`}
          >
            {f.label}
            {counts[f.key] ? ` (${counts[f.key]})` : ''}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-border-soft bg-cream-deep/40 p-10 text-center font-inter text-choco/60">
          Aucun draft dans cette vue.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <article
              key={r.id}
              className="rounded-3xl border border-border-soft bg-white p-5 shadow-soft"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(r.status)}`}
                >
                  {statusLabel(r.status)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-0.5 text-xs text-choco">
                  <ChannelIcon channel={r.channel} /> {channelLabel(r.channel)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-choco/60">
                  <Bot className="h-3.5 w-3.5" /> {r.created_by ?? 'agent'}
                </span>
                <Link
                  href={`/prospects/${r.prospect_id}`}
                  className="ml-auto inline-flex items-center gap-1 font-marcellus text-lg text-brand-dark hover:underline"
                >
                  {prospectDisplay(r.prospect)} <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              {r.mockup_url && (
                <a
                  href={r.mockup_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Globe className="h-3.5 w-3.5" /> Maquette du prospect prete — voir le site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {editing === r.id ? (
                <div className="space-y-2">
                  <input
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="Objet"
                    className="w-full rounded-xl border border-border-soft px-3 py-2 font-inter text-sm"
                  />
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-border-soft px-3 py-2 font-inter text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={pending}
                      onClick={() => saveEdit(r.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-full bg-cream-deep px-4 py-1.5 text-sm text-choco"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {r.subject && (
                    <p className="mb-1 font-inter text-sm font-semibold text-brand-dark">
                      {r.subject}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap font-inter text-sm text-choco/90">
                    {r.body || '(vide)'}
                  </p>
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-3">
                {r.status !== 'ready' && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => setDraftStatus(r.id, 'ready'))}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Valider
                  </button>
                )}
                {editing !== r.id && (
                  <button
                    onClick={() => startEdit(r)}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-4 py-1.5 text-sm text-choco"
                  >
                    <Pencil className="h-4 w-4" /> Editer
                  </button>
                )}
                {r.status !== 'discarded' && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => setDraftStatus(r.id, 'discarded'))}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-4 py-1.5 text-sm text-rose-700 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Rejeter
                  </button>
                )}
                {(r.status === 'discarded' || r.status === 'ready') && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => setDraftStatus(r.id, 'draft'))}
                    className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-4 py-1.5 text-sm text-choco disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Remettre a valider
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
