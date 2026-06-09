'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCommissionRate, assignFreshProspects } from './actions';

const CREAM = '#FDF6EE';
const CREAM_SOFT = 'rgba(253,246,238,0.6)';
const AMBER = '#E8853D';
const GREEN = '#7FC9A3';
const RED = '#F0A088';
const CARD_BG = 'rgba(253,246,238,0.04)';
const BORDER = '1px solid rgba(232,133,61,0.14)';
const MONO = 'var(--font-geist-mono), ui-monospace, monospace';
const SANS = 'var(--font-geist-sans), system-ui, sans-serif';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  commissionPct: number | null;
  prospectCount: number;
};

const fieldStyle: React.CSSProperties = {
  width: 70,
  padding: '7px 10px',
  borderRadius: 9,
  background: 'rgba(0,0,0,0.22)',
  border: '1px solid rgba(232,133,61,0.22)',
  color: CREAM,
  fontSize: 13,
  fontFamily: MONO,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 999,
  border: 'none',
  background: 'linear-gradient(135deg, #E8853D, #D4732A)',
  color: '#2A1410',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: SANS,
  cursor: 'pointer',
};

export function MemberManager({ member }: { member: Member }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [commission, setCommission] = useState(
    member.commissionPct != null ? String(member.commissionPct) : '20'
  );
  const [assignN, setAssignN] = useState('30');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isFreelance = member.role === 'freelance' || member.role === 'commercial';

  async function saveCommission() {
    setBusy(true);
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

  async function doAssign() {
    setBusy(true);
    setMsg(null);
    const res = await assignFreshProspects(member.id, Number(assignN));
    setBusy(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else {
      setMsg({ ok: true, text: `${res.assigned} prospect(s) frais assigné(s) à ${member.name}.` });
      startTransition(() => router.refresh());
    }
  }

  return (
    <div style={{ background: CARD_BG, border: BORDER, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: CREAM }}>{member.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: CREAM_SOFT }}>
            {member.email} · {member.role}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(253,246,238,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Prospects
          </div>
          <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 500, color: AMBER, lineHeight: 1 }}>
            {member.prospectCount}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(253,246,238,0.06)' }}>
        {/* Commission */}
        <div>
          <label style={{ display: 'block', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(253,246,238,0.5)', marginBottom: 6 }}>
            Commission %
          </label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              style={fieldStyle}
            />
            <button type="button" onClick={saveCommission} disabled={busy} style={{ ...btnStyle, opacity: busy ? 0.5 : 1 }}>
              OK
            </button>
          </div>
        </div>

        {/* Assignation prospects (commerciaux uniquement) */}
        {isFreelance && (
          <div>
            <label style={{ display: 'block', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(253,246,238,0.5)', marginBottom: 6 }}>
              Assigner des prospects frais
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                min={1}
                max={500}
                value={assignN}
                onChange={(e) => setAssignN(e.target.value)}
                style={fieldStyle}
              />
              <button type="button" onClick={doAssign} disabled={busy} style={{ ...btnStyle, opacity: busy ? 0.5 : 1 }}>
                Assigner →
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: msg.ok ? GREEN : RED }}>{msg.text}</p>
      )}
    </div>
  );
}
