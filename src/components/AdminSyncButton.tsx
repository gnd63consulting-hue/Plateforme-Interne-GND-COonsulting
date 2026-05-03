'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

type Option = { id: string; label: string };

type Props = { options: Option[] };

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  archived?: number;
  skipped: number;
  errors: { page_id: string; error: string }[];
};

export default function AdminSyncButton({ options }: Props) {
  const router = useRouter();
  const [targetUserId, setTargetUserId] = useState<string>(options[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (!targetUserId) {
      setError('Choisis un commercial cible avant de lancer la sync.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/sync-prospects', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (json && typeof json === 'object' && 'error' in json && json.error) ||
            `Erreur ${res.status}`
        );
      }
      setResult(json as SyncResult);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-gnd-amber/15 p-6 shadow-warm-xl sm:p-7"
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 0%, rgba(232, 133, 61, 0.10) 0%, transparent 55%),
          linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)
        `,
      }}
    >
      {/* Decorative Database icon top-right */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 flex h-32 w-32 items-center justify-center rounded-full bg-gnd-amber/8 text-gnd-amber/30"
        aria-hidden
      >
        <Database className="h-16 w-16" />
      </div>

      <div className="relative z-10">
        <div className="mb-5 flex items-center gap-2">
          <Database className="h-4 w-4 text-gnd-amber" aria-hidden />
          <h3 className="font-display text-base font-medium text-gnd-cream sm:text-lg">
            Récupérer les enrichissements depuis Notion
          </h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
              <UserPlus className="h-3 w-3" />
              Assigner les nouveaux prospects à
            </span>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-xl border border-gnd-amber/15 bg-gnd-ink/40 px-3 py-2.5 text-sm text-gnd-cream backdrop-blur-sm transition focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
              disabled={loading}
            >
              {options.length === 0 && <option value="">Aucun commercial</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id} className="bg-gnd-ink text-gnd-cream">
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleSync}
            disabled={loading || !targetUserId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow px-5 py-2.5 text-sm font-semibold text-gnd-bronze shadow-[0_0_20px_rgba(232,133,61,0.35)] transition hover:from-gnd-amber hover:to-gnd-amber-glow hover:shadow-[0_0_28px_rgba(232,133,61,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden
            />
            {loading ? 'Sync en cours…' : 'Synchroniser Notion → Prospects'}
          </button>
        </div>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-gnd-cream/50">
          Les prospects déjà synchronisés sont mis à jour sur place (notes et
          assignation conservées). Les prospects retirés ou rejetés dans
          Notion sont marqués{' '}
          <code className="rounded bg-gnd-amber/15 px-1.5 py-0.5 font-mono text-[10px] text-gnd-amber-glow normal-case tracking-normal">
            archived
          </code>
          . Seuls les nouveaux prospects seront créés avec le commercial choisi.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-2xl border border-gnd-amber/30 bg-gnd-amber/5 px-4 py-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gnd-amber-glow">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Sync terminée
            </div>
            <div className="flex flex-wrap gap-1.5">
              <SyncChip label="Total Notion" value={result.total} tone="neutral" />
              <SyncChip
                label="Créés"
                value={result.inserted}
                tone={result.inserted > 0 ? 'amberglow' : 'neutral'}
              />
              <SyncChip label="Mis à jour" value={result.updated} tone="amber" />
              {typeof result.archived === 'number' && result.archived > 0 && (
                <SyncChip label="Archivés" value={result.archived} tone="amber" />
              )}
              <SyncChip label="Ignorés" value={result.skipped} tone="neutral" />
              <SyncChip
                label="Erreurs"
                value={result.errors.length}
                tone={result.errors.length > 0 ? 'rose' : 'neutral'}
              />
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-rose-300">
                {result.errors.slice(0, 3).map((e) => (
                  <li key={e.page_id} className="break-words">
                    {e.error}
                  </li>
                ))}
                {result.errors.length > 3 && (
                  <li>… et {result.errors.length - 3} autres</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CHIP_TONES: Record<string, string> = {
  neutral: 'bg-gnd-cream/8 text-gnd-cream/80 ring-gnd-cream/15',
  amber: 'bg-gnd-amber/15 text-gnd-amber ring-gnd-amber/30',
  amberglow: 'bg-gnd-amber/20 text-gnd-amber-glow ring-gnd-amber-glow/40',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
};

function SyncChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof CHIP_TONES;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ring-1 ${
        CHIP_TONES[tone] ?? CHIP_TONES.neutral
      }`}
    >
      <span className="opacity-70 uppercase tracking-[0.12em]">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}
