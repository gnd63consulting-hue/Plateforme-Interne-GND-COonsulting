'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  SECTIONS,
  SECTION_LABELS,
  SECTION_HINTS,
  effectivePerms,
  levelOf,
  type Level,
  type PermMap,
  type Section,
} from '@/lib/permissions';
import { setMemberPermissions } from './actions';

const AMBER = '#B5601C';
const GREEN = '#4F7A38';
const RED = '#A04A4A';
const INK = '#2A2320';
const FAINT = '#9A8A80';
const MONO = 'var(--font-inter), ui-monospace, monospace';
const SANS = 'var(--font-inter), system-ui, sans-serif';

const LEVELS: { value: Level; label: string }[] = [
  { value: 'none', label: 'Aucun' },
  { value: 'view', label: 'Voir' },
  { value: 'edit', label: 'Éditer' },
];

/**
 * Panneau de permissions GRANULAIRES par section (Voir/Éditer/Aucun), pré-rempli
 * depuis le preset du rôle. L'admin override par personne -> users.permissions.
 */
export default function PermissionsPanel({
  userId,
  role,
  permissions,
}: {
  userId: string;
  role: string;
  permissions: PermMap | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [perms, setPerms] = useState<PermMap>(() => effectivePerms(role, permissions));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function setLevel(section: Section, level: Level) {
    setPerms((p) => ({ ...p, [section]: level }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await setMemberPermissions(userId, perms);
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else {
      setMsg({ ok: true, text: 'Autorisations enregistrées.' });
      startTransition(() => router.refresh());
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(83,36,24,0.06)' }}>
      <label
        style={{
          display: 'block',
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: FAINT,
          marginBottom: 10,
        }}
      >
        Autorisations par section
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SECTIONS.map((s) => {
          const cur = levelOf(perms, s);
          return (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 150, flex: 1 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: INK }}>
                  {SECTION_LABELS[s]}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: FAINT }}>
                  {SECTION_HINTS[s]}
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  border: '1px solid #E2D5C3',
                  borderRadius: 999,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {LEVELS.map((lv) => {
                  const active = cur === lv.value;
                  return (
                    <button
                      key={lv.value}
                      type="button"
                      onClick={() => setLevel(s, lv.value)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        background: active ? 'rgba(243,146,83,0.18)' : 'transparent',
                        color: active ? AMBER : FAINT,
                        fontFamily: SANS,
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {lv.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          style={{
            padding: '9px 18px',
            borderRadius: 999,
            border: '1px solid rgba(243,146,83,0.35)',
            background: 'rgba(243,146,83,0.14)',
            color: AMBER,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: SANS,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? 'Enregistrement…' : 'Enregistrer les autorisations'}
        </button>
        <button
          type="button"
          onClick={() => { setPerms(effectivePerms(role, null)); setMsg({ ok: true, text: 'Réinitialisé au preset du rôle (non enregistré).' }); }}
          style={{
            padding: '9px 14px',
            borderRadius: 999,
            border: '1px solid #E2D5C3',
            background: 'transparent',
            color: '#7B665C',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: SANS,
            cursor: 'pointer',
          }}
        >
          Réinitialiser au rôle
        </button>
        {msg && (
          <span style={{ fontSize: 12, fontWeight: 600, color: msg.ok ? GREEN : RED }}>
            {msg.text}
          </span>
        )}
      </div>
      <p style={{ fontSize: 11, color: FAINT, marginTop: 8, lineHeight: 1.5 }}>
        v1 : <b>Pipeline, Suivi, Relances</b> sont appliqués en direct. Financier / Doublons / Équipe
        restent réservés aux admins (branchement à la prochaine étape).
      </p>
    </div>
  );
}
