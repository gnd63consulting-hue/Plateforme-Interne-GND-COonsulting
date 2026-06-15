'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_OPTIONS } from '@/lib/prospects';
import { consoleUpdateProspect } from '../_actions/console-actions';

const AMBER = '#B5601C';
const GREEN = '#4F7A38';
const RED = '#A04A4A';
const INK = '#2A2320';
const SANS = 'var(--font-inter), system-ui, sans-serif';

/** yyyy-mm-dd (heure locale) -> ISO a midi, pour une date de relance. */
function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Quick-edit d'un prospect depuis la console (Relances) — surface SANS montants.
 * Permet aux admins ET a l'assistant de mettre a jour le statut + reporter la
 * relance. Cf. consoleUpdateProspect (garde RBAC team.edit).
 */
export default function ProspectQuickEdit({
  prospectId,
  currentStatus,
}: {
  prospectId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await consoleUpdateProspect({
      prospectId,
      status: status !== currentStatus ? status : undefined,
      nextActionAt: date ? dateInputToIso(date) : undefined,
    });
    setBusy(false);
    if (res.error) {
      setMsg({ ok: false, text: res.error });
    } else {
      setMsg({ ok: true, text: 'Mis a jour.' });
      startTransition(() => router.refresh());
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '5px 11px',
          borderRadius: 999,
          border: '1px solid rgba(243,146,83,0.35)',
          background: 'rgba(243,146,83,0.12)',
          color: AMBER,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: SANS,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Mettre a jour
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 190 }}>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        style={{
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid #E2D5C3',
          background: '#FBF7F2',
          color: INK,
          fontSize: 12,
          fontFamily: SANS,
        }}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        title="Reporter la relance"
        style={{
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid #E2D5C3',
          background: '#FBF7F2',
          color: INK,
          fontSize: 12,
          fontFamily: SANS,
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            border: 'none',
            background: busy ? 'rgba(243,146,83,0.5)' : 'linear-gradient(135deg, #F39253, #E07E3C)',
            color: '#2A1810',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: SANS,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? '…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setMsg(null); }}
          style={{
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid #E2D5C3',
            background: 'transparent',
            color: '#7B665C',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: SANS,
            cursor: 'pointer',
          }}
        >
          Annuler
        </button>
      </div>
      {msg && (
        <span style={{ fontSize: 11, fontWeight: 600, color: msg.ok ? GREEN : RED }}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
