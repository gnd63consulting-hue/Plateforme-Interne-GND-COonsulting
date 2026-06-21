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
      <header className="relative mb-7 overflow-hidden">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -right-2 -top-8 select-none font-marcellus text-[120px] leading-none text-choco"
        >
          Nyx
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            File de validation
          </span>
        </span>
        <h1 className="mt-2 font-marcellus text-3xl tracking-tight text-choco">
          Drafts a valider
        </h1>
        <p className="mt-2 max-w-2xl font-inter text-sm text-[#6F5A50]">
          Brouillons rediges par les agents (Nyx). Relisez, ajustez, validez ou rejetez. Rien
          n'est envoye sans votre validation.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-inter text-sm transition ${
              filter === f.key
                ? 'bg-brand text-[#2A1810] font-semibold orange-glow'
                : 'border border-border-soft bg-white text-choco hover:bg-cream-deep'
            }`}
          >
            {f.label}
            {counts[f.key] ? (
              <span className="font-num tabular-nums text-xs opacity-80">{counts[f.key]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="panel flex items-center gap-3 p-4">
          <span className="inline-flex shrink-0 rounded-2xl bg-brand-pale p-2.5 text-brand-burnt">
            <Mail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-marcellus text-base text-choco">Aucun draft dans cette vue.</p>
            <p className="mt-0.5 font-inter text-sm text-[#6F5A50]">
              Les brouillons des agents apparaitront ici des qu'ils seront prets.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <article
              key={r.id}
              className="panel card-hover p-4"
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
                <span className="inline-flex items-center gap-1 font-grotesk text-[11px] uppercase tracking-[0.08em] text-muted-warm">
                  <Bot className="h-3.5 w-3.5" /> {r.created_by ?? 'agent'}
                </span>
                <Link
                  href={`/prospects/${r.prospect_id}`}
                  className="ml-auto inline-flex items-center gap-1 font-marcellus text-lg text-brand-dark transition hover:text-brand-burnt"
                >
                  {prospectDisplay(r.prospect)} <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              {r.mockup_url && (
                <a
                  href={r.mockup_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 inline-flex items-center gap-2 rounded-full bg-ok-bg px-3 py-1.5 text-xs font-medium text-ok-fg transition hover:opacity-80"
                >
                  <Globe className="h-3.5 w-3.5" /> Maquette du prospect prete — voir le site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {editing === r.id ? (
                <div className="space-y-3">
                  <input
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="Objet"
                    className="w-full rounded-2xl border border-border-soft bg-cream/60 px-3.5 py-2.5 font-inter text-sm text-choco focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus:border-brand"
                  />
                  <textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={8}
                    className="w-full rounded-2xl border border-border-soft bg-cream/60 px-3.5 py-2.5 font-inter text-sm text-choco focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus:border-brand"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={pending}
                      onClick={() => saveEdit(r.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm text-choco transition hover:bg-cream-deep"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {r.subject && (
                    <p className="mb-1.5 font-inter text-sm font-semibold text-brand-dark">
                      {r.subject}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap font-inter text-sm leading-relaxed text-ink-warm">
                    {r.body || '(vide)'}
                  </p>
                </>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgba(74,36,26,0.08)] pt-4">
                {r.status !== 'ready' && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => setDraftStatus(r.id, 'ready'))}
                    className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-[#2A1810] orange-glow transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Valider
                  </button>
                )}
                {editing !== r.id && (
                  <button
                    onClick={() => startEdit(r)}
                    className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm text-choco transition hover:bg-cream-deep"
                  >
                    <Pencil className="h-4 w-4" /> Editer
                  </button>
                )}
                {r.status !== 'discarded' && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => setDraftStatus(r.id, 'discarded'))}
                    className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm text-danger-fg transition hover:bg-danger-bg disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Rejeter
                  </button>
                )}
                {(r.status === 'discarded' || r.status === 'ready') && (
                  <button
                    disabled={pending}
                    onClick={() => act(() => setDraftStatus(r.id, 'draft'))}
                    className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-white px-4 py-1.5 text-sm text-choco transition hover:bg-cream-deep disabled:opacity-50"
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
