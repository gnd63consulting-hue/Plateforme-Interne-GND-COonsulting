'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Loader2, AlarmClock, CheckSquare, PhoneCall } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { labelForStatus } from '@/lib/prospects';
import {
  TASK_SELECT_COLUMNS,
  effectiveDue,
  bucketForDue,
  formatDateTime,
  type Task,
} from '@/lib/tasks';

/**
 * NotificationsBell — cloche in-app FONCTIONNELLE (Sprint 19).
 *
 * Remplace la cloche decorative de la topbar. Agrege deux sources d'actions
 * dues pour le commercial courant, via le client Supabase ANON (la RLS owner
 * garantit qu'aucune donnee d'un autre commercial ne remonte) :
 *   1. RELANCES en retard / aujourd'hui  (prospects.next_action_at, hors statuts clos)
 *   2. TACHES en retard / aujourd'hui     (tasks non faites, due_at/remind_at)
 *
 * Badge = nombre total d'actions dues. Panneau deroulant groupe « En retard »
 * puis « Aujourd'hui ». Chaque ligne ouvre la fiche prospect ou la page Taches.
 * Refresh au montage, a chaque ouverture, et toutes les 60s.
 */

/** Statuts clos : une relance sur un prospect clos n'est plus actionnable. */
const CLOSED_STATUSES = new Set([
  'gagne',
  'perdu',
  'archived',
  'pas_interesse',
  'coordonnees_invalides',
  'ne_plus_demarcher',
  'processus_termine',
]);

type NotifBucket = 'overdue' | 'today';

type NotifItem = {
  key: string;
  kind: 'relance' | 'task';
  bucket: NotifBucket;
  title: string;
  sub: string | null;
  href: string;
  due: string | null;
};

type RelanceRow = {
  id: string;
  company_name: string;
  status: string;
  next_action_at: string | null;
};

export default function NotificationsBell() {
  const supabase = useMemo(() => createClient(), []);
  const boxRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end.setDate(end.getDate() + 1);
    const endIso = end.toISOString();

    // Relances dues (en retard + aujourd'hui). RLS owner scope deja au user ;
    // on filtre en plus next_action_at <= fin de journee.
    const relancesP = supabase
      .from('prospects')
      .select('id, company_name, status, next_action_at')
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .not('next_action_at', 'is', null)
      .lte('next_action_at', endIso)
      .order('next_action_at', { ascending: true })
      .limit(50);

    // Taches non faites, echeance posee (due_at ou remind_at) <= fin de journee.
    const tasksP = supabase
      .from('tasks')
      .select(TASK_SELECT_COLUMNS)
      .eq('done', false)
      .order('due_at', { ascending: true })
      .limit(100);

    const [{ data: relRaw }, { data: taskRaw }] = await Promise.all([
      relancesP,
      tasksP,
    ]);

    const out: NotifItem[] = [];

    for (const r of (relRaw ?? []) as unknown as RelanceRow[]) {
      if (CLOSED_STATUSES.has(r.status)) continue;
      const bucket = bucketForDue(r.next_action_at, now);
      if (bucket !== 'overdue' && bucket !== 'today') continue;
      out.push({
        key: `rel-${r.id}`,
        kind: 'relance',
        bucket,
        title: r.company_name,
        sub: `Relance · ${labelForStatus(r.status)}`,
        href: `/prospects/${r.id}`,
        due: r.next_action_at,
      });
    }

    for (const t of (taskRaw ?? []) as unknown as Task[]) {
      const due = effectiveDue(t);
      const bucket = bucketForDue(due, now);
      if (bucket !== 'overdue' && bucket !== 'today') continue;
      out.push({
        key: `task-${t.id}`,
        kind: 'task',
        bucket,
        title: t.title,
        sub: due ? `Tâche · ${formatDateTime(due)}` : 'Tâche',
        href: t.prospect_id ? `/prospects/${t.prospect_id}` : '/prospects/taches',
        due,
      });
    }

    // Tri : en retard avant aujourd'hui, puis par echeance croissante.
    out.sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket === 'overdue' ? -1 : 1;
      const da = a.due ? new Date(a.due).getTime() : Infinity;
      const db = b.due ? new Date(b.due).getTime() : Infinity;
      return da - db;
    });

    setItems(out);
    setLoading(false);
  }, [supabase]);

  // Montage + refresh 60s.
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Refresh a l'ouverture.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Fermeture au clic exterieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const count = items.length;
  const overdue = items.filter((i) => i.bucket === 'overdue');
  const today = items.filter((i) => i.bucket === 'today');

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          count > 0
            ? `Notifications : ${count} action${count > 1 ? 's' : ''} à traiter`
            : 'Notifications'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-choco ring-2 ring-surface-soft">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border-soft/70 bg-surface-soft shadow-soft-lg"
          >
            <div className="flex items-center justify-between border-b border-border-soft/60 bg-gradient-cream px-4 py-3">
              <p className="font-marcellus text-base text-choco">Notifications</p>
              {count > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-choco">
                  {count} à traiter
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto" data-lenis-prevent>
              {loading && count === 0 ? (
                <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-warm">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement…
                </div>
              ) : count === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CheckSquare
                    className="mx-auto mb-2 h-6 w-6 text-brand-dark/60"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-warm">
                    Rien à traiter. Tu es à jour.
                  </p>
                </div>
              ) : (
                <>
                  {overdue.length > 0 && (
                    <NotifSection label={`En retard · ${overdue.length}`} danger>
                      {overdue.map((it) => (
                        <NotifRow key={it.key} item={it} onNavigate={() => setOpen(false)} />
                      ))}
                    </NotifSection>
                  )}
                  {today.length > 0 && (
                    <NotifSection label={`Aujourd'hui · ${today.length}`}>
                      {today.map((it) => (
                        <NotifRow key={it.key} item={it} onNavigate={() => setOpen(false)} />
                      ))}
                    </NotifSection>
                  )}
                </>
              )}
            </div>

            <Link
              href="/prospects/taches"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 border-t border-border-soft/60 px-4 py-2.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-cream"
            >
              Voir toutes mes tâches & relances
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifSection({
  label,
  danger,
  children,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={`px-4 pb-1 pt-3 font-inter text-[10px] font-semibold uppercase tracking-[0.16em] ${
          danger ? 'text-rose-700' : 'text-muted-warm'
        }`}
      >
        {label}
      </p>
      <ul className="pb-1">{children}</ul>
    </div>
  );
}

function NotifRow({
  item,
  onNavigate,
}: {
  item: NotifItem;
  onNavigate: () => void;
}) {
  const Icon = item.kind === 'relance' ? PhoneCall : AlarmClock;
  return (
    <li role="menuitem">
      <Link
        href={item.href}
        onClick={onNavigate}
        className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-cream"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            item.bucket === 'overdue'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-brand-soft text-brand-dark'
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-warm">{item.title}</p>
          {item.sub && (
            <p className="truncate text-xs text-muted-warm">{item.sub}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
