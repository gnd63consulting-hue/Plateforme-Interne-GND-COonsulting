'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  AdminV2PageData,
  CommercialV2,
} from '../v2/page';
import {
  PipelineSection,
  STATUS_CONFIG,
} from '@/components/admin/PipelineShared';

const PALIERS_BONUS = [
  { niveau: 1, label: 'Bronze',       icon: '🥉', signatures: 1,  bonus: 200,  color: '#A0735C' },
  { niveau: 2, label: 'Argent',       icon: '🥈', signatures: 3,  bonus: 500,  color: '#8A9DB5' },
  { niveau: 3, label: 'Or',           icon: '🥇', signatures: 5,  bonus: 1000, color: '#C49A3C' },
  { niveau: 4, label: 'Platine',      icon: '💎', signatures: 8,  bonus: 2500, color: '#7B70C4' },
  { niveau: 5, label: 'Stratosphère', icon: '🚀', signatures: 12, bonus: 5000, color: '#E8853D' },
];

// ───────────────────────────────────────────────────────────────
// Theme tokens (dark only — light arrivera avec PR #4 TweaksPanel)
// ───────────────────────────────────────────────────────────────
const BG = '#1A0F0E';
const TEXT_PRIME = '#FDF6EE';
const TEXT_MUTED = 'rgba(253,246,238,0.35)';
const HAIRLINE = 'rgba(253,246,238,0.08)';
const ACCENT = '#E8853D';
const OLIVE = '#5A8A3F';

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────
function Mono({ children, size = 9, color = 'rgba(253,246,238,0.4)', spacing = '0.2em', weight = 600, style = {} }: { children: React.ReactNode; size?: number; color?: string; spacing?: string; weight?: number; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontSize: size, fontWeight: weight, textTransform: 'uppercase', letterSpacing: spacing, color, ...style }}>{children}</span>;
}

function Hairline({ label, color = '#E8853D' }: { label: string; color?: string }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 24, height: 1, background: color }} /><Mono color={color}>{label}</Mono></div>;
}


// SpeedoMini — version minimaliste (3px stroke, 2.5px tick, plus mince que Speedo)
function SpeedoMini({ value = 38, size = 56 }: { value?: number; size?: number }) {
  const angle = -135 + (value / 100) * 270;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 90deg,#3D1F1E,#A0735C,#FDF6EE,#A0735C,#3D1F1E)', padding: 3 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 30%,#2A1311 0%,#0E0807 100%)', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs><linearGradient id={`sg-japon-${size}`} x1="0" x2="1"><stop offset="0" stopColor="#D4732A" /><stop offset="1" stopColor="#FFA060" /></linearGradient></defs>
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(232,133,61,0.12)" strokeWidth="2.5" strokeDasharray="179" strokeDashoffset="60" transform="rotate(135 50 50)" strokeLinecap="round" />
            <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#sg-japon-${size})`} strokeWidth="2.5" strokeDasharray={`${(value / 100) * 119} 999`} transform="rotate(135 50 50)" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1.5, height: size * 0.34, background: `linear-gradient(180deg,transparent 8%,#FDF6EE 14%,#FDF6EE 82%,#E8853D 100%)`, borderRadius: 1, transformOrigin: '50% 100%', transform: `translate(-50%,-100%) rotate(${angle + 90}deg)`, transition: 'transform 1s cubic-bezier(0.22,1,0.36,1)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, borderRadius: 999, background: 'radial-gradient(circle,#FDF6EE,#A0735C)', transform: 'translate(-50%,-50%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: size * 0.22, fontWeight: 500, color: '#FDF6EE', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}<span style={{ color: '#E8853D', fontSize: size * 0.12 }}>%</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ───────────────────────────────────────────────────────────────
// SectionTag (Japon-Magazine layout)
// ───────────────────────────────────────────────────────────────
function SectionTag({ n, label, gap }: { n: number; label: string; gap: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: gap * 0.6 }}>
      <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.35em', color: TEXT_MUTED }}>0{n}</span>
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 36, fontWeight: 500, letterSpacing: '-0.025em', color: TEXT_PRIME, margin: 0, lineHeight: 1 }}>{label}</h2>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// SyncJaponSection — bouton + filtres + 4 stats (live data)
// ───────────────────────────────────────────────────────────────
function SyncJaponSection({ commerciaux }: { commerciaux: CommercialV2[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [target, setTarget] = useState('all');
  const [result, setResult] = useState({ inserted: 0, updated: 0, deleted: 0, skipped: 0 });

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const userId = target === 'all' ? undefined : target;
      const res = await fetch('/api/admin/sync-prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
      if (res.ok) {
        const data = await res.json();
        setResult({ inserted: data.inserted ?? 0, updated: data.updated ?? 0, deleted: data.deleted ?? 0, skipped: data.skipped ?? 0 });
        startTransition(() => router.refresh());
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Erreur sync : ${err.error ?? res.statusText}`);
      }
    } catch (e) {
      alert(`Erreur réseau : ${e instanceof Error ? e.message : 'inconnue'}`);
    } finally { setSyncing(false); }
  };

  const targets = [{ id: 'all', label: 'Tous' }, ...commerciaux.map((c) => ({ id: c.id, label: c.name.split(' ')[0] }))];

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px', minWidth: 260 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {targets.map((opt) => (
            <button key={opt.id} onClick={() => setTarget(opt.id)} style={{
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
              background: target === opt.id ? 'rgba(232,133,61,0.12)' : 'transparent',
              border: `1px solid ${target === opt.id ? 'rgba(232,133,61,0.32)' : HAIRLINE}`,
              color: target === opt.id ? ACCENT : TEXT_MUTED,
              fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.15em',
            }}>{opt.label}</button>
          ))}
        </div>
        <button onClick={doSync} disabled={syncing} style={{
          padding: '12px 24px', borderRadius: 999,
          cursor: syncing ? 'not-allowed' : 'pointer',
          background: syncing ? 'rgba(232,133,61,0.12)' : ACCENT,
          border: syncing ? `1px solid rgba(232,133,61,0.30)` : 'none',
          color: syncing ? ACCENT : '#1A0F0E',
          fontFamily: 'var(--font-geist-mono)', fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.2em',
          boxShadow: syncing ? 'none' : '0 0 20px rgba(232,133,61,0.3)',
        }}>{syncing ? 'Synchronisation…' : 'Synchroniser Notion →'}</button>
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {[
          { l: 'INSERTED', v: result.inserted, c: OLIVE },
          { l: 'UPDATED', v: result.updated, c: ACCENT },
          { l: 'DELETED', v: result.deleted, c: TEXT_MUTED },
          { l: 'SKIPPED', v: result.skipped, c: TEXT_MUTED },
        ].map((item) => (
          <div key={item.l} style={{ textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 26, fontWeight: 500, color: item.c, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>{item.v}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.2em', color: TEXT_MUTED, marginTop: 6 }}>{item.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// TopBarVariantSwitcher — G désormais cliquable
// ───────────────────────────────────────────────────────────────
function TopBarVariantSwitcher({ active }: { active: 'A' | 'C' | 'G' }) {
  const variants: { k: 'A' | 'C' | 'G'; label: string; href: string }[] = [
    { k: 'A', label: 'Cockpit', href: '/admin' },
    { k: 'C', label: 'Dense', href: '/admin/dense' },
    { k: 'G', label: 'Japon-Magazine', href: '/admin/japon' },
  ];
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '8px 16px',
      alignItems: 'center',
      background: 'rgba(26,15,14,0.95)',
      borderBottom: '1px solid rgba(232,133,61,0.08)',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.22em',
        color: 'rgba(232,133,61,0.5)',
        marginRight: 8,
      }}>VARIANTE :</span>
      {variants.map((v) => {
        const isActive = active === v.k;
        return (
          <Link
            key={v.k}
            href={v.href}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              background: isActive ? 'rgba(232,133,61,0.18)' : 'rgba(253,246,238,0.04)',
              border: `1px solid ${isActive ? 'rgba(232,133,61,0.35)' : 'rgba(253,246,238,0.08)'}`,
              color: isActive ? '#E8853D' : 'rgba(253,246,238,0.4)',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 8,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              transition: 'all 0.15s',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >{v.k} · {v.label}</Link>
        );
      })}
      <div style={{ marginLeft: 'auto' }} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// VARIANTE G — Japon-Magazine
// ───────────────────────────────────────────────────────────────
export default function AdminJaponClient({ data }: { data: AdminV2PageData }) {
  // density='normal' hardcoded — toggle viendra avec PR #4 (TweaksPanel)
  const pad = 48;
  const gap = 48;

  const totalProspects = data.funnel[0]?.count ?? 0;
  const formationStats = data.formation;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBarVariantSwitcher active="G" />
      <div style={{ flex: 1, background: BG, overflowY: 'auto', color: TEXT_PRIME }}>

        {/* ── HERO ── */}
        <header style={{ padding: `${pad * 1.2}px ${pad}px ${pad * 0.8}px`, borderBottom: `1px solid ${HAIRLINE}` }}>
          {/* Tag line */}
          <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, letterSpacing: '0.4em', fontWeight: 400, color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: pad * 0.6 }}>
            GND · ADMIN · {data.adminName.toUpperCase()} · MAI 2026
          </div>

          {/* Big title */}
          <h1 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 96, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 0.88, color: TEXT_PRIME, margin: `0 0 ${pad * 0.7}px` }}>
            Notre<br />
            <span style={{ fontStyle: 'italic', color: ACCENT }}>pipeline.</span>
          </h1>

          {/* KPI row — 4 cols séparées par hairline verticales */}
          <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}` }}>
            {[
              { l: 'Prospects', v: data.kpi.live as number | string, c: TEXT_PRIME },
              { l: 'Chauds', v: data.kpi.chauds, c: ACCENT },
              { l: 'Signatures', v: data.kpi.signatures, c: OLIVE },
              { l: 'Revenu', v: `${(data.kpi.ca / 1000).toFixed(1)}k€`, c: OLIVE },
            ].map((k, i) => (
              <div key={k.l} style={{
                flex: 1,
                padding: `${pad * 0.5}px 0`,
                borderRight: i < 3 ? `1px solid ${HAIRLINE}` : 'none',
                paddingRight: i < 3 ? pad * 0.4 : 0,
                paddingLeft: i > 0 ? pad * 0.4 : 0,
              }}>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 48, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.03em', color: k.c, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
                <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, letterSpacing: '0.25em', fontWeight: 400, textTransform: 'uppercase', color: TEXT_MUTED, marginTop: 8 }}>{k.l}</div>
              </div>
            ))}
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ padding: `0 ${pad}px ${pad}px` }}>

          {/* 01 · Commerciaux */}
          <div style={{ paddingTop: gap }}>
            <SectionTag n={1} label="Commerciaux." gap={gap} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.commerciaux.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: pad * 0.6, padding: `${pad * 0.35}px 0`, borderTop: `1px solid ${HAIRLINE}` }}>
                  <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 20, fontWeight: 500, color: TEXT_MUTED, width: 28, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 500, color: TEXT_PRIME, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, letterSpacing: '0.2em', color: TEXT_MUTED, textTransform: 'uppercase', marginTop: 5 }}>{c.email}</div>
                  </div>
                  <SpeedoMini value={c.conversion} size={56} />
                  <div style={{ textAlign: 'right', minWidth: 72 }}>
                    <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 26, fontWeight: 500, color: ACCENT, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>P{c.palier}</div>
                    <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 8, letterSpacing: '0.2em', color: TEXT_MUTED, textTransform: 'uppercase', marginTop: 4 }}>/ 5 PALIER</div>
                  </div>
                  <div style={{ width: 100, height: 2, background: 'rgba(253,246,238,0.06)', borderRadius: 999, flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${(c.palier / 5) * 100}%`, borderRadius: 999, background: 'linear-gradient(90deg,#D4732A,#FFA060)' }} />
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${HAIRLINE}` }} />
            </div>
          </div>

          {/* 02 · Funnel */}
          <div style={{ paddingTop: gap }}>
            <SectionTag n={2} label="Funnel." gap={gap} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.funnel.map((f) => {
                const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.a_contacter;
                const barW = totalProspects > 0 ? (f.count / totalProspects) * 100 : 0;
                return (
                  <div key={f.status} style={{ display: 'flex', alignItems: 'center', gap: pad * 0.4, padding: `${pad * 0.25}px 0`, borderTop: `1px solid ${HAIRLINE}` }}>
                    <div style={{ width: 110, fontFamily: 'var(--font-geist-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: cfg.color }}>{f.label}</div>
                    <div style={{ flex: 1, height: 1.5, background: 'rgba(253,246,238,0.06)', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barW}%`, background: cfg.color }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 24, fontWeight: 500, width: 56, textAlign: 'right', color: TEXT_PRIME, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{f.count}</div>
                  </div>
                );
              })}
              <div style={{ borderTop: `1px solid ${HAIRLINE}` }} />
            </div>
          </div>

          {/* 03 · Formation */}
          <div style={{ paddingTop: gap }}>
            <SectionTag n={3} label="Formation." gap={gap} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {formationStats.map((u) => (
                <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: pad * 0.4, padding: `${pad * 0.25}px 0`, borderTop: `1px solid ${HAIRLINE}` }}>
                  <div style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 14, color: TEXT_PRIME, width: 200, flexShrink: 0, fontWeight: 500 }}>{u.name}{u.isAdmin && <span style={{ marginLeft: 8, fontFamily: 'var(--font-geist-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C0B8FF' }}>· Admin</span>}</div>
                  <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                    {u.progress.map((done, idx) => (
                      <div key={idx} style={{ flex: 1, height: 2, borderRadius: 999, background: done ? ACCENT : 'rgba(253,246,238,0.08)' }} />
                    ))}
                  </div>
                  <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 20, fontWeight: 500, width: 60, textAlign: 'right', letterSpacing: '-0.02em', color: u.completed === u.total && u.completed > 0 ? OLIVE : u.completed > 0 ? ACCENT : TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>
                    {u.completed}<span style={{ fontSize: 12, color: TEXT_MUTED }}>/{u.total}</span>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${HAIRLINE}` }} />
            </div>
          </div>

          {/* 04 · Paliers */}
          <div style={{ paddingTop: gap }}>
            <SectionTag n={4} label="Paliers." gap={gap} />
            <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}` }}>
              {PALIERS_BONUS.map((p, i) => {
                const sigCount = data.commerciaux.reduce((acc, c) => acc + (c.palier >= p.niveau ? 1 : 0), 0);
                return (
                  <div key={p.niveau} style={{
                    flex: 1,
                    padding: `${pad * 0.4}px 0`,
                    borderRight: i < 4 ? `1px solid ${HAIRLINE}` : 'none',
                    paddingRight: i < 4 ? pad * 0.3 : 0,
                    paddingLeft: i > 0 ? pad * 0.3 : 0,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 26, fontWeight: 500, color: ACCENT, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>+{p.bonus}€</div>
                    <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.2em', color: TEXT_MUTED, marginBottom: 6 }}>{p.label}</div>
                    <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 9, color: TEXT_MUTED }}>{sigCount} sig.</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 05 · Sync Notion */}
          <div style={{ paddingTop: gap }}>
            <SectionTag n={5} label="Sync Notion." gap={gap} />
            <SyncJaponSection commerciaux={data.commerciaux} />
          </div>

          {/* 06 · Pipeline (ajout cohérence — sans pipeline l'admin ne peut pas opérer) */}
          <div style={{ paddingTop: gap }}>
            <SectionTag n={6} label="Pipeline." gap={gap} />
            <PipelineSection prospects={data.prospects} commerciaux={data.commerciaux} variant="G" />
          </div>

        </div>
      </div>
    </div>
  );
}
