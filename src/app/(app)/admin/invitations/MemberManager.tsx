'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCommissionRate, assignFreshProspects, archiveMember } from './actions';

// Design System crème/orange — texte FONCÉ sur fond clair (AA).
const CREAM = '#2A2320';
const CREAM_SOFT = '#7B665C';
const CREAM_FAINT = '#9A8A80';
const AMBER = '#B5601C';        // accent orange foncé (texte)
const BTN_GRAD = 'linear-gradient(135deg, #F39253, #E07E3C)'; // bouton orange vif
const GREEN = '#4F7A38';
const RED = '#A04A4A';
const CARD_BG = '#FFFFFF';
const PANEL = '#FBF7F2';        // panneau input clair (etait sombre)
const BORDER = '1px solid #E2D5C3';
const MONO = 'var(--font-inter), ui-monospace, monospace';
const SANS = 'var(--font-inter), system-ui, sans-serif';
const SERIF = 'var(--font-marcellus), Georgia, serif';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  commissionPct: number | null;
  prospectCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  freelance: 'Commercial',
  commercial: 'Commercial',
  admin: 'Admin',
  admin_limited: 'Admin',
  stagiaire: 'Stagiaire',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: CREAM_FAINT,
  marginBottom: 8,
};

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function MemberManager({ member }: { member: Member }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [commission, setCommission] = useState(
    member.commissionPct != null ? String(member.commissionPct) : '20'
  );
  const [busy, setBusy] = useState<false | 'commission' | 'archive' | number>(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isFreelance = member.role === 'freelance' || member.role === 'commercial';

  async function saveCommission() {
    setBusy('commission');
    setMsg(null);
    const pct = Number(commission);
    const res = await setCommissionRate(member.id, pct / 100);
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else {
      setMsg({ ok: true, text: `Commission réglée à ${pct}%.` });
      startTransition(() => router.refresh());
    }
  }

  async function assign(n: number) {
    setBusy(n);
    setMsg(null);
    const res = await assignFreshProspects(member.id, n);
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else {
      setMsg({ ok: true, text: `✅ ${res.assigned} prospect(s) frais assigné(s) à ${member.name}.` });
      startTransition(() => router.refresh());
    }
  }

  async function doArchive() {
    const ok = window.confirm(
      `Archiver ${member.name} ?\n\nLe compte sera masqué partout (suivi, digest, listes)` +
        (member.prospectCount > 0
          ? ` et ses ${member.prospectCount} prospect(s) réassignés à toi`
          : '') +
        `. Réversible depuis « Membres archivés ».`
    );
    if (!ok) return;
    setBusy('archive');
    setMsg(null);
    const res = await archiveMember(member.id);
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else {
      setMsg({ ok: true, text: `Archivé. ${res.reassigned} prospect(s) réassigné(s) à toi.` });
      startTransition(() => router.refresh());
    }
  }

  return (
    <div style={{ background: CARD_BG, border: BORDER, borderRadius: 16, padding: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            flexShrink: 0,
            background: BTN_GRAD,
            color: '#2A1810',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {initialsOf(member.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: CREAM }}>{member.name}</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: isFreelance ? AMBER : '#5B4FA0',
                background: isFreelance ? 'rgba(243,146,83,0.14)' : 'rgba(123,112,196,0.14)',
                border: `1px solid ${isFreelance ? 'rgba(243,146,83,0.35)' : 'rgba(91,79,160,0.30)'}`,
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {ROLE_LABELS[member.role] ?? member.role}
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: CREAM_SOFT, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.email}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: AMBER, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {member.prospectCount}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: CREAM_FAINT, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>
            prospects
          </div>
        </div>
      </div>

      {/* Commission */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(83,36,24,0.06)' }}>
        <label style={labelStyle}>Taux de commission</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: PANEL, border: '1px solid #E2D5C3', borderRadius: 10, paddingRight: 12 }}>
            <input
              type="text"
              inputMode="numeric"
              value={commission}
              onChange={(e) => setCommission(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: 56,
                padding: '9px 12px',
                background: 'transparent',
                border: 'none',
                color: CREAM,
                fontSize: 15,
                fontFamily: MONO,
                fontWeight: 600,
                outline: 'none',
                textAlign: 'right',
              }}
            />
            <span style={{ color: CREAM_SOFT, fontSize: 14, fontWeight: 600 }}>%</span>
          </div>
          <button
            type="button"
            onClick={saveCommission}
            disabled={busy !== false}
            style={{
              padding: '9px 18px',
              borderRadius: 999,
              border: '1px solid rgba(243,146,83,0.35)',
              background: 'rgba(243,146,83,0.14)',
              color: AMBER,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: SANS,
              cursor: busy !== false ? 'wait' : 'pointer',
              opacity: busy !== false ? 0.5 : 1,
            }}
          >
            {busy === 'commission' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Assignation prospects */}
      {isFreelance ? (
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Assigner des prospects frais (depuis le pool)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[10, 20, 30, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => assign(n)}
                disabled={busy !== false}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: busy === n ? 'rgba(243,146,83,0.5)' : BTN_GRAD,
                  color: '#2A1810',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: SANS,
                  cursor: busy !== false ? 'wait' : 'pointer',
                  opacity: busy !== false && busy !== n ? 0.5 : 1,
                  minWidth: 64,
                }}
              >
                {busy === n ? '…' : `+ ${n}`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: CREAM_FAINT, fontStyle: 'italic' }}>
          Admin — pas d&apos;assignation de prospects.
        </p>
      )}

      {/* Archiver le membre (reversible) */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(83,36,24,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={doArchive}
          disabled={busy !== false}
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            border: '1px solid rgba(160,74,74,0.35)',
            background: 'transparent',
            color: RED,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: SANS,
            cursor: busy !== false ? 'wait' : 'pointer',
            opacity: busy !== false ? 0.5 : 1,
          }}
        >
          {busy === 'archive' ? 'Archivage…' : 'Archiver ce membre'}
        </button>
      </div>

      {msg && (
        <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13, fontWeight: 500, color: msg.ok ? GREEN : RED }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
