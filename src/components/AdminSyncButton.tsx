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

type Props = {
  /** Commerciaux assignables depuis l'admin. */
  options: Option[];
};

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  archived?: number;
  skipped: number;
  errors: { page_id: string; error: string }[];
};

/**
 * Bouton admin qui déclenche POST /api/admin/sync-prospects.
 * La cible (user_id) est obligatoire pour créer de nouveaux prospects —
 * les prospects déjà présents sont seulement mis à jour.
 */
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
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-5 shadow-sm">
      {/* Decorative icon */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 flex h-32 w-32 items-center justify-center rounded-full bg-blue-100/30 text-blue-200"
        aria-hidden
      >
        <Database className="h-16 w-16" />
      </div>

      <div className="relative">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900">
          <Database className="h-4 w-4" />
          Récupérer les enrichissements depuis Notion
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-blue-800/80">
              <UserPlus className="h-3 w-3" />
              Assigner les nouveaux prospects à
            </span>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              disabled={loading}
            >
              {options.length === 0 && <option value="">Aucun commercial</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleSync}
            disabled={loading || !targetUserId}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden
            />
            {loading ? 'Sync en cours…' : 'Synchroniser Notion → Prospects'}
          </button>
        </div>

        <p className="mt-3 text-xs text-blue-900/70">
          Les prospects déjà synchronisés sont mis à jour sur place (notes et
          assignation conservées). Les prospects retirés ou rejetés dans
          Notion sont marqués <code className="rounded bg-blue-100/60 px-1">archived</code>.
          Seuls les nouveaux prospects seront créés avec le commercial choisi.
        </p>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-xs">
            <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Sync terminée
            </div>
            <div className="flex flex-wrap gap-1.5">
              <SyncChip label="Total Notion" value={result.total} tone="slate" />
              <SyncChip
                label="Créés"
                value={result.inserted}
                tone={result.inserted > 0 ? 'emerald' : 'slate'}
              />
              <SyncChip
                label="Mis à jour"
                value={result.updated}
                tone="blue"
              />
              {typeof result.archived === 'number' && result.archived > 0 && (
                <SyncChip label="Archivés" value={result.archived} tone="amber" />
              )}
              <SyncChip label="Ignorés" value={result.skipped} tone="slate" />
              <SyncChip
                label="Erreurs"
                value={result.errors.length}
                tone={result.errors.length > 0 ? 'rose' : 'slate'}
              />
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-rose-700">
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
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200',
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        CHIP_TONES[tone] ?? CHIP_TONES.slate
      }`}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}
