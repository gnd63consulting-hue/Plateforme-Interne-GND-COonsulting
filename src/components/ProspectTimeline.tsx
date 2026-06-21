'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import {
  ACTIVITY_SELECT_COLUMNS,
  iconForActivityKind,
  labelForActivityKind,
  statusChangeParts,
  type Activity,
} from '@/lib/activities';
import { formatDate, labelForStatus } from '@/lib/prospects';

type ProspectTimelineProps = {
  prospectId: string;
};

/** Horodatage court FR (jour + heure) pour la timeline. */
function formatStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return formatDate(iso);
  }
}

/**
 * Timeline d'activité d'un prospect (lecture seule).
 *
 * Charge les `activities` via le client Supabase anon → RLS owner-based filtre
 * automatiquement aux activités du commercial courant (et tout pour l'admin).
 * Affichée dans la fiche prospect.
 */
export default function ProspectTimeline({ prospectId }: ProspectTimelineProps) {
  const supabase = useMemo(() => createClient(), []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('activities')
        .select(ACTIVITY_SELECT_COLUMNS)
        .eq('prospect_id', prospectId)
        .order('occurred_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setActivities([]);
      } else {
        setActivities((data ?? []) as unknown as Activity[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, prospectId]);

  if (loading) {
    return (
      <p className="text-xs italic text-muted-warm" aria-live="polite">
        Chargement de l&apos;historique…
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
      >
        Historique indisponible : {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-xs italic text-muted-warm">
        Aucune activité enregistrée pour ce prospect.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {activities.map((a) => {
        const { from, to } = statusChangeParts(a.metadata);
        return (
          <li key={a.id} className="flex gap-3">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-deep text-sm ring-1 ring-border-soft"
              aria-hidden
            >
              {iconForActivityKind(a.kind)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-warm">
                  {labelForActivityKind(a.kind)}
                </span>
                <span className="font-inter text-[11px] text-muted-warm">
                  {formatStamp(a.occurred_at)}
                </span>
              </div>
              {a.kind === 'status_change' && (from || to) ? (
                <p className="mt-0.5 text-sm text-ink-warm">
                  {from ? labelForStatus(from) : '—'}{' '}
                  <span aria-hidden>→</span>{' '}
                  <span className="font-medium text-ink-warm">
                    {to ? labelForStatus(to) : '—'}
                  </span>
                </p>
              ) : a.body ? (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-warm">
                  {a.body}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
