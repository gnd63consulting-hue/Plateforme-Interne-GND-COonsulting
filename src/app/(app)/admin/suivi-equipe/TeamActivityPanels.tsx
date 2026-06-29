'use client';

import { useState } from 'react';
import type { RepActivity, RepConnections } from '@/lib/team-activity';
import { formatMinutes, formatLastSeen } from '@/lib/team-activity';

/**
 * Panneaux client de /admin/suivi-equipe :
 *   - « Activité » : tableau par commercial (Appels / Notes / Emails / RDV /
 *     Tâches faites + total), avec un toggle Aujourd'hui ↔ 7 jours.
 *   - « Connexions équipe » : tableau par membre (dernière connexion, sessions
 *     7j, temps 7j, durée moyenne), avec lignes dépliables (sessions récentes).
 *
 * Données calculées côté serveur (service-role) puis passées en props. Charte :
 * mêmes classes que la page (panel, label-eyebrow, brand-burnt, choco…).
 */

const ACT_COLS: { key: keyof RepActivity['today']; label: string }[] = [
  { key: 'appels', label: 'Appels' },
  { key: 'notes', label: 'Notes' },
  { key: 'emails', label: 'Emails' },
  { key: 'rdv', label: 'RDV' },
  { key: 'changementsStatut', label: 'Statuts' },
  { key: 'tachesFaites', label: 'Tâches faites' },
];

export function ActivityPanel({ reps }: { reps: RepActivity[] }) {
  const [win, setWin] = useState<'today' | 'week'>('today');
  const rows = reps;
  const totalAll = rows.reduce((a, r) => a + r[win].total, 0);

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              Activité réelle
            </span>
          </span>
          <h2 className="mt-1.5 font-marcellus text-[22px] leading-tight text-choco">
            {win === 'today' ? "Activité du jour" : 'Activité · 7 derniers jours'}
          </h2>
        </div>
        <div className="inline-flex overflow-hidden rounded-full border border-[rgba(74,36,26,0.14)] bg-cream-deep/40">
          {(
            [
              { id: 'today', label: "Aujourd'hui" },
              { id: 'week', label: '7 jours' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setWin(opt.id)}
              className={`px-3.5 py-1.5 font-grotesk text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                win === opt.id
                  ? 'bg-brand text-choco'
                  : 'text-brand-burnt hover:bg-brand-pale/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden p-0">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th
                className="px-4 py-3 text-left font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
                style={{ borderBottom: '1px solid rgba(74,36,26,0.10)' }}
              >
                Commercial
              </th>
              {ACT_COLS.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-center font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
                  style={{ borderBottom: '1px solid rgba(74,36,26,0.10)' }}
                >
                  {c.label}
                </th>
              ))}
              <th
                className="px-4 py-3 text-center font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
                style={{ borderBottom: '1px solid rgba(74,36,26,0.10)' }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={ACT_COLS.length + 2}
                  className="px-4 py-8 text-center text-[13px] text-muted-warm"
                >
                  Aucun commercial suivi pour l&apos;instant.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const c = r[win];
                return (
                  <tr key={r.userId} className="divider-warm transition-colors hover:bg-cream-deep/40">
                    <td className="px-4 py-2.5 font-semibold text-ink-warm">{r.name}</td>
                    {ACT_COLS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-center font-num text-sm tabular-nums ${
                          c[col.key] > 0 ? 'text-ink-warm font-bold' : 'text-muted-warm'
                        }`}
                      >
                        {c[col.key]}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-2.5 text-center font-num text-sm font-bold tabular-nums ${
                        c.total > 0 ? 'text-brand-dark' : 'text-muted-warm'
                      }`}
                    >
                      {c.total}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '1px solid rgba(74,36,26,0.10)' }}>
                <td className="px-4 py-2.5 font-grotesk text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-warm">
                  Équipe
                </td>
                <td colSpan={ACT_COLS.length} />
                <td className="px-4 py-2.5 text-center font-num text-sm font-bold tabular-nums text-choco">
                  {totalAll}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-warm">
        Activité saisie réelle (timeline prospects) + tâches cochées terminées.
        Fenêtre {win === 'today' ? "depuis 00 h aujourd'hui" : 'glissante sur 7 jours'}.
      </p>
    </section>
  );
}

export function ConnectionsPanel({
  reps,
  nowIso,
}: {
  reps: RepConnections[];
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mt-9">
      <div className="mb-3">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Présence
          </span>
        </span>
        <h2 className="mt-1.5 font-marcellus text-[22px] leading-tight text-choco">
          Connexions équipe
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-warm">
          Dernière connexion, fréquence et durée des sessions. Sans IP (RGPD).
          Cliquer une ligne pour voir les sessions récentes.
        </p>
      </div>

      <div className="panel overflow-hidden p-0">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {['Membre', 'Dernière connexion', 'Sessions (7j)', 'Temps (7j)', 'Durée moyenne'].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt ${
                      i === 0 ? 'text-left' : 'text-center'
                    }`}
                    style={{ borderBottom: '1px solid rgba(74,36,26,0.10)' }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {reps.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted-warm">
                  Aucune connexion enregistrée pour l&apos;instant.
                </td>
              </tr>
            ) : (
              reps.map((r) => {
                const isOpen = open === r.userId;
                const hasRecent = r.recentes.length > 0;
                return (
                  <FragmentRow
                    key={r.userId}
                    r={r}
                    now={now}
                    isOpen={isOpen}
                    hasRecent={hasRecent}
                    onToggle={() => setOpen(isOpen ? null : r.userId)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FragmentRow({
  r,
  now,
  isOpen,
  hasRecent,
  onToggle,
}: {
  r: RepConnections;
  now: Date;
  isOpen: boolean;
  hasRecent: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`divider-warm transition-colors hover:bg-cream-deep/40 ${
          hasRecent ? 'cursor-pointer' : ''
        }`}
        onClick={hasRecent ? onToggle : undefined}
      >
        <td className="px-4 py-2.5 font-semibold text-ink-warm">
          <span className="inline-flex items-center gap-2">
            {hasRecent && (
              <span
                aria-hidden
                className={`text-[10px] text-brand-burnt transition-transform ${
                  isOpen ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
            )}
            {r.name}
          </span>
        </td>
        <td
          className={`px-4 py-2.5 text-center text-[13px] ${
            r.derniereConnexionIso ? 'text-ink-warm' : 'text-muted-warm'
          }`}
        >
          {formatLastSeen(r.derniereConnexionIso, now)}
        </td>
        <td
          className={`px-4 py-2.5 text-center font-num text-sm tabular-nums ${
            r.sessions7j > 0 ? 'text-ink-warm font-bold' : 'text-muted-warm'
          }`}
        >
          {r.sessions7j}
        </td>
        <td
          className={`px-4 py-2.5 text-center font-num text-[13px] tabular-nums ${
            r.temps7jMin > 0 ? 'text-brand-dark' : 'text-muted-warm'
          }`}
        >
          {formatMinutes(r.temps7jMin)}
        </td>
        <td
          className={`px-4 py-2.5 text-center font-num text-[13px] tabular-nums ${
            r.dureeMoyenneMin > 0 ? 'text-ink-warm' : 'text-muted-warm'
          }`}
        >
          {formatMinutes(r.dureeMoyenneMin)}
        </td>
      </tr>
      {isOpen && hasRecent && (
        <tr className="bg-cream-deep/30">
          <td colSpan={5} className="px-4 py-3">
            <p className="mb-2 font-grotesk text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-warm">
              Sessions récentes
            </p>
            <ul className="flex flex-wrap gap-2">
              {r.recentes.map((s, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(74,36,26,0.14)] bg-white px-3 py-1 text-[12px] text-ink-warm"
                >
                  <span>{formatLastSeen(s.startedAtIso, now)}</span>
                  <span className="text-muted-warm">·</span>
                  <span className="font-num tabular-nums text-brand-dark">
                    {formatMinutes(s.dureeMin)}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
