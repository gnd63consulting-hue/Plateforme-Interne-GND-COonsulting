'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gnd-muted">
            Assigner les nouveaux prospects à
          </span>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
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
          className="btn-primary whitespace-nowrap"
        >
          {loading ? 'Sync en cours…' : 'Synchroniser Notion → Prospects'}
        </button>
      </div>

      <p className="mt-2 text-xs text-gnd-muted">
        Les prospects déjà synchronisés sont mis à jour sur place (notes et
        assignation conservées). Les prospects retirés ou rejetés dans Notion
        sont marqués <code>archived</code>. Seuls les nouveaux prospects seront
        créés avec le commercial choisi ci-dessus.
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <div>
            <strong>Total Notion :</strong> {result.total} ·{' '}
            <strong>Créés :</strong> {result.inserted} ·{' '}
            <strong>Mis à jour :</strong> {result.updated}
            {typeof result.archived === 'number' && (
              <>
                {' · '}
                <strong>Archivés :</strong> {result.archived}
              </>
            )}{' '}
            · <strong>Ignorés :</strong> {result.skipped} ·{' '}
            <strong>Erreurs :</strong> {result.errors.length}
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {result.errors.slice(0, 3).map((e) => (
                <li key={e.page_id}>{e.error}</li>
              ))}
              {result.errors.length > 3 && (
                <li>… et {result.errors.length - 3} autres</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
