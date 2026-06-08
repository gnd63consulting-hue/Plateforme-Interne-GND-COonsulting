'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  AdminV2PageData,
  CommercialV2,
  FunnelStage,
  ClassementEntry,
  ActivityEntry,
  FormationEntry,
} from './page';
import {
  PipelineSection,
  STATUS_CONFIG,
} from '@/components/admin/PipelineShared';
import { formatEur } from '@/lib/ca-utils';

/* ============================================================
   THEME CLAIR / FRAIS — pilote cockpit
   Fond papier clair, cards blanches, texte charbon chaud,
   accents ambre GND + sauge-teal frais.
   ============================================================ */
const T = {
  pageBg: '#F4F1EA',
  cardBg: '#FFFFFF',
  panel: '#FBF8F2',
  border: '#ECE5D9',
  borderAmber: 'rgba(232,133,61,0.22)',
  ink: '#2A2521',
  inkSoft: 'rgba(42,37,33,0.60)',
  inkFaint: 'rgba(42,37,33,0.42)',
  inkGhost: 'rgba(42,37,33,0.28)',
  amber: '#E8853D',
  amberDeep: '#C96A28',
  teal: '#2FA98C',
  tealDeep: '#1F8C72',
  green: '#3F8F5B',
  shadow: '0 1px 2px rgba(60,40,20,0.05), 0 8px 24px rgba(60,40,20,0.05)',
  shadowSm: '0 1px 2px rgba(60,40,20,0.06)',
};
const SERIF = 'var(--font-fraunces), Georgia, serif';
const MONOF = 'var(--font-geist-mono), ui-monospace, monospace';
const SANS = 'var(--font-geist-sans), system-ui, sans-serif';

const FORMATION_MODULES = ['Découverte\nGND', 'Sites\nVitrines', 'Process\nvente', 'Techniques\nvente', 'Objections\ntraitement', 'Bases\ntechniques', 'Outils\nprocess'];

const PALIERS_BONUS = [
  { niveau: 1, label: 'Bronze',       icon: '🥉', signatures: 1,  bonus: 200,  color: '#B07A4E' },
  { niveau: 2, label: 'Argent',       icon: '🥈', signatures: 3,  bonus: 500,  color: '#7E93AD' },
  { niveau: 3, label: 'Or',           icon: '🥇', signatures: 5,  bonus: 1000, color: '#C49A3C' },
  { niveau: 4, label: 'Platine',      icon: '💎', signatures: 8,  bonus: 2500, color: '#7B70C4' },
  { niveau: 5, label: 'Stratosphère', icon: '🚀', signatures: 12, bonus: 5000, color: '#E8853D' },
];

function Mono({ children, size = 9, color = T.inkFaint, spacing = '0.2em', weight = 600, style = {} }: { children: React.ReactNode; size?: number; color?: string; spacing?: string; weight?: number; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: MONOF, fontSize: size, fontWeight: weight, textTransform: 'uppercase', letterSpacing: spacing, color, ...style }}>{children}</span>;
}
function Hairline({ label, color = T.amber }: { label: string; color?: string }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 24, height: 2, borderRadius: 2, background: color }} /><Mono color={color}>{label}</Mono></div>;
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: T.shadow, overflow: 'hidden', ...style }}>{children}</div>;
}
function CardHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label={label} />{right}</div>;
}

function KpiCard({ label, value, sub, accent, spark }: { label: string; value: string | number; sub?: string; accent?: string; spark?: number[] }) {
  const sparkPts = spark ? spark.map((v, i) => `${(i / (spark.length - 1)) * 56},${18 - ((v - Math.min(...spark)) / (Math.max(...spark) - Math.min(...spark) || 1)) * 16}`).join(' ') : null;
  const lastY = spark ? 18 - ((spark[spark.length - 1] - Math.min(...spark)) / (Math.max(...spark) - Math.min(...spark) || 1)) * 16 : 0;
  const line = accent ?? T.amber;
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '15px 18px', border: `1px solid ${T.border}`, background: T.cardBg, boxShadow: T.shadowSm, flex: 1, minWidth: 130 }}>
      <span style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 3, background: line }} />
      <Mono size={8} color={T.amberDeep} style={{ display: 'block', marginBottom: 8 }}>{label}</Mono>
      <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em', color: accent ?? T.ink, fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {sub && <Mono size={9} color={T.inkGhost}>{sub}</Mono>}
        {sparkPts && <svg width="56" height="18" viewBox="0 0 56 18"><polyline points={sparkPts} fill="none" stroke={line} strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="56" cy={lastY} r="2" fill={line} /></svg>}
      </div>
    </div>
  );
}

function Speedo({ value = 38, size = 88 }: { value?: number; size?: number }) {
  const angle = -135 + (value / 100) * 270;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: T.cardBg, border: `1px solid ${T.border}`, boxShadow: 'inset 0 1px 3px rgba(60,40,20,0.06)', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs><linearGradient id={`sg-${size}`} x1="0" x2="1"><stop offset="0" stopColor="#E8853D" /><stop offset="1" stopColor="#2FA98C" /></linearGradient></defs>
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(42,37,33,0.08)" strokeWidth="3" strokeDasharray="179" strokeDashoffset="60" transform="rotate(135 50 50)" strokeLinecap="round" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#sg-${size})`} strokeWidth="3" strokeDasharray={`${(value / 100) * 119} 999`} transform="rotate(135 50 50)" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: size * 0.33, background: T.ink, borderRadius: 1, transformOrigin: '50% 100%', transform: `translate(-50%,-100%) rotate(${angle + 90}deg)`, transition: 'transform 1s cubic-bezier(0.22,1,0.36,1)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: 999, background: T.amber, transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 9, textAlign: 'center' }}>
          <span style={{ fontFamily: SERIF, fontSize: size * 0.22, fontWeight: 500, color: T.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}<span style={{ color: T.amber, fontSize: size * 0.13 }}>%</span></span>
        </div>
      </div>
    </div>
  );
}

function RocketMini({ palier = 2, total = 5, height = 100 }: { palier?: number; total?: number; height?: number }) {
  const DOT = 8;
  return (
    <div style={{ position: 'relative', width: 24, height, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, transform: 'translateX(-50%)', background: 'repeating-linear-gradient(to bottom,rgba(232,133,61,0.30) 0px,rgba(232,133,61,0.30) 3px,transparent 3px,transparent 7px)' }} />
      {Array.from({ length: total }).map((_, i) => {
        const levelIdx = total - 1 - i;
        const reached = levelIdx < palier;
        const isActive = levelIdx === palier - 1;
        const topPx = Math.round((i / (total - 1)) * (height - DOT));
        return (
          <div key={i} style={{ position: 'absolute', top: topPx, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isActive ? 18 : DOT, height: isActive ? 26 : DOT }}>
            {isActive ? (
              <svg width="18" height="26" viewBox="0 0 44 64" style={{ filter: 'drop-shadow(0 1px 3px rgba(232,133,61,0.5))' }}><path d="M22 4 L32 20 L32 40 L12 40 L12 20 Z" fill="#FFFFFF" stroke="#E8853D" strokeWidth="1.4" /><path d="M22 4 L32 20 L12 20 Z" fill="#E8853D" /><circle cx="22" cy="27" r="5" fill="#2FA98C" /><path d="M12 32 L4 46 L12 40 Z" fill="#D4732A" /><path d="M32 32 L40 46 L32 40 Z" fill="#D4732A" /><path d="M15 40 Q19 54 22 48 Q25 54 29 40 Z" fill="#FFA060" /></svg>
            ) : (
              <div style={{ width: DOT, height: DOT, borderRadius: 999, background: reached ? '#E8853D' : '#FFFFFF', boxShadow: reached ? '0 1px 3px rgba(232,133,61,0.4)' : 'none', border: reached ? '1px solid #D4732A' : `1px solid ${T.border}` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FunnelSection({ stages }: { stages: FunnelStage[] }) {
  const total = stages[0]?.count ?? 0;
  return (
    <Card>
      <CardHead label="FUNNEL DE CONVERSION" right={<Mono size={9} color={T.inkFaint}>PAR ÉTAPE PIPELINE</Mono>} />
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((f) => {
          const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.a_contacter;
          const barW = total > 0 ? Math.max((f.count / total) * 100, f.count > 0 ? 2 : 0) : 0;
          return (
            <div key={f.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 110, flexShrink: 0 }}><span style={{ padding: '3px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontFamily: MONOF, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{f.label}</span></div>
              <div style={{ flex: 1, height: 22, borderRadius: 999, background: T.panel, border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${barW}%`, background: `linear-gradient(90deg,${cfg.color}CC,${cfg.color})`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)', display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: f.count > 0 ? 24 : 0 }}>
                  {f.count > 0 && <Mono size={9} color="#FFFFFF">{f.count}</Mono>}
                </div>
                {f.count === 0 && <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}><Mono size={9} color={T.inkGhost}>0</Mono></div>}
              </div>
              <div style={{ width: 36, flexShrink: 0, textAlign: 'right' }}><Mono size={9} color={f.convPct && f.convPct !== '~' ? cfg.color : T.inkGhost}>{f.convPct ?? '—'}</Mono></div>
            </div>
          );
        })}
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: `1px solid ${T.border}` }}><Mono size={8} color={T.inkFaint}>LE POURCENTAGE INDIQUE LE PASSAGE DEPUIS L&apos;ÉTAPE PRÉCÉDENTE. STATUTS PERDU/ARCHIVÉ EXCLUS.</Mono></div>
      </div>
    </Card>
  );
}

function ClassementSection({ entries, commerciaux }: { entries: ClassementEntry[]; commerciaux: CommercialV2[] }) {
  if (entries.length === 0) return null;
  const podium = [entries[1], entries[0], entries[2]].filter(Boolean);
  const fourth = entries[3];
  const rankColors = ['#E8853D', '#C49A3C', '#B07A4E'];
  return (
    <Card>
      <CardHead label="CLASSEMENT COMMERCIAUX" right={<Mono size={9} color={T.inkFaint}>PODIUM · CA POTENTIEL</Mono>} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 10, alignItems: 'end', marginBottom: 14 }}>
          {podium.map((c) => {
            if (!c) return null;
            const rankIdx = c.rank - 1;
            const isFirst = c.rank === 1;
            const rCol = rankColors[rankIdx] ?? T.inkGhost;
            const commercial = commerciaux.find(x => x.id === c.id);
            const cardBg = isFirst ? `linear-gradient(160deg, #FFF6EE, #FFFFFF)` : T.panel;
            const cardBd = isFirst ? `${rCol}66` : T.border;
            return (
              <div key={c.id} style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: isFirst ? '18px 16px' : '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: isFirst ? `0 6px 22px ${rCol}22` : T.shadowSm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: isFirst ? 40 : 32, height: isFirst ? 40 : 32, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg,${rCol}28,${rCol}12)`, border: `1.5px solid ${rCol}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: isFirst ? 15 : 12, fontWeight: 600, color: rCol }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontFamily: SERIF, fontSize: isFirst ? 15 : 12, fontWeight: 500, color: rCol }}>#{c.rank}</span>{isFirst && <span style={{ fontSize: 12 }}>🏆</span>}</div>
                    <div style={{ fontFamily: SANS, fontSize: isFirst ? 12 : 11, fontWeight: 600, color: T.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Speedo value={commercial?.conversion ?? 0} size={isFirst ? 68 : 52} /></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: SERIF, fontSize: isFirst ? 22 : 16, fontWeight: 500, color: T.green, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{c.ca}<span style={{ fontSize: isFirst ? 12 : 10, color: T.inkFaint }}> k€</span></div>
                  <Mono size={7} color={T.inkFaint} style={{ display: 'block', marginTop: 4 }}>CA POTENTIEL</Mono>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: T.panel, overflow: 'hidden' }}><div style={{ height: '100%', width: `${c.pct}%`, borderRadius: 999, background: `linear-gradient(90deg,${rCol}99,${rCol})` }} /></div>
                <Mono size={7} color={T.inkFaint} style={{ textAlign: 'center' }}>{c.prospects} PROSPECTS</Mono>
              </div>
            );
          })}
        </div>
        {fourth && (
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mono size={10} color={T.inkFaint} weight={700}>#4</Mono>
            <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: '#FFFFFF', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 10, fontWeight: 600, color: T.inkFaint }}>{fourth.initials}</div>
            <div style={{ flex: 1, fontFamily: SANS, fontSize: 12, color: T.inkSoft }}>{fourth.name}</div>
            <div style={{ fontFamily: SERIF, fontSize: 14, color: T.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{fourth.ca} k€</div>
          </div>
        )}
      </div>
    </Card>
  );
}

function FormationSection({ entries }: { entries: FormationEntry[] }) {
  const admins = entries.filter((u) => u.isAdmin);
  const commercials = entries.filter((u) => !u.isAdmin);
  const renderRow = (u: FormationEntry, i: number, arr: FormationEntry[]) => (
    <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: i < arr.length - 1 ? 10 : 0 }}>
      <div style={{ width: 196, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: u.isAdmin ? 'linear-gradient(135deg,#EDEAFB,#E0DBF6)' : 'linear-gradient(135deg,#FCEEE0,#FBE6D2)', border: `1px solid ${u.isAdmin ? 'rgba(123,112,196,0.4)' : T.borderAmber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 11, fontWeight: 600, color: u.isAdmin ? '#6A5FB0' : T.amberDeep }}>{u.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
          {u.isAdmin && <Mono size={7} color="#6A5FB0" spacing="0.15em">Admin</Mono>}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {u.progress.map((done, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: done ? 22 : 18, height: done ? 22 : 18, borderRadius: 999, background: done ? 'linear-gradient(135deg,#E8853D,#FFA060)' : '#FFFFFF', border: `2px solid ${done ? '#D4732A' : T.border}`, boxShadow: done ? '0 1px 4px rgba(232,133,61,0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done === 1 && <span style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ width: 2, height: 6, background: done ? 'rgba(232,133,61,0.45)' : T.border }} />
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: 4, borderRadius: 999, background: T.panel, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${(u.completed / u.total) * 100}%`, background: 'linear-gradient(90deg,#D4732A,#FFA060)' }} />
        </div>
      </div>
      <div style={{ width: 80, flexShrink: 0, textAlign: 'right', paddingLeft: 16 }}>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: u.completed === u.total && u.completed > 0 ? T.green : u.completed > 0 ? T.amberDeep : T.inkFaint, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{u.completed}<span style={{ fontSize: 11, color: T.inkFaint }}>/{u.total}</span></div>
        {u.lastActivity && <Mono size={7} color={T.inkFaint} spacing="0.12em" style={{ display: 'block', marginTop: 3 }}>{u.lastActivity}</Mono>}
      </div>
    </div>
  );
  const groupLabel = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px', paddingLeft: 196 }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <Mono size={7} color={T.inkFaint} spacing="0.2em">{label}</Mono>
      <div style={{ width: 80 }} />
    </div>
  );
  return (
    <Card>
      <CardHead label="SUIVI FORMATION" right={<Mono size={9} color={T.inkFaint}>7 MODULES · {entries.length} MEMBRES</Mono>} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 196, marginBottom: 0 }}>
          {FORMATION_MODULES.map((mod, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontFamily: MONOF, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.inkFaint, writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre' }}>{mod}</div>
            </div>
          ))}
          <div style={{ width: 80 }} />
        </div>
        {admins.length > 0 && groupLabel('ADMINISTRATEURS')}
        {admins.map((u, i) => renderRow(u, i, admins))}
        {commercials.length > 0 && groupLabel('COMMERCIAUX')}
        {commercials.map((u, i) => renderRow(u, i, commercials))}
      </div>
      <div style={{ padding: '10px 24px', borderTop: `1px solid ${T.border}` }}><Mono size={7} color={T.inkFaint}>7 MODULES · PROGRESSION EN TEMPS RÉEL · AUTO-SYNC NOTION</Mono></div>
    </Card>
  );
}

function PaliersSection({ commerciaux }: { commerciaux: CommercialV2[] }) {
  const maxPalier = commerciaux.length > 0 ? Math.max(...commerciaux.map((c) => c.palier)) : 0;
  return (
    <Card>
      <CardHead label="PALIERS BONUS" right={<Mono size={9} color={T.inkFaint}>PAR COMMERCIAL · MENSUEL</Mono>} />
      <div style={{ padding: '20px 24px 24px' }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
            {PALIERS_BONUS.map((p) => {
              const reached = p.niveau <= maxPalier;
              const isActive = p.niveau === maxPalier;
              const nodeSize = isActive ? 52 : reached ? 40 : 32;
              return (
                <div key={p.niveau} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: nodeSize, height: nodeSize, borderRadius: 999, background: isActive ? `radial-gradient(circle at 35% 35%, ${p.color}, ${p.color}AA)` : reached ? `${p.color}1E` : '#FFFFFF', border: `2px solid ${reached ? p.color + '99' : T.border}`, boxShadow: isActive ? `0 4px 16px ${p.color}55` : reached ? `0 1px 5px ${p.color}30` : T.shadowSm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isActive ? 24 : reached ? 18 : 16 }}>{p.icon}</div>
                  <div style={{ width: 2, height: 10, background: reached ? p.color + '60' : T.border }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 4, borderRadius: 999, background: T.panel, overflow: 'visible' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${maxPalier > 0 ? ((maxPalier - 1) / (PALIERS_BONUS.length - 1)) * 100 : 0}%`, background: 'linear-gradient(90deg,#D4732A,#E8853D)' }} />
            {PALIERS_BONUS.map((p, i) => {
              const reached = p.niveau <= maxPalier;
              const leftPct = (i / (PALIERS_BONUS.length - 1)) * 100;
              return <div key={p.niveau} style={{ position: 'absolute', top: '50%', left: `${leftPct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 999, background: reached ? p.color : '#FFFFFF', border: `2px solid ${reached ? p.color : T.border}`, zIndex: 1 }} />;
            })}
          </div>
        </div>
        <div style={{ display: 'flex', marginBottom: 20 }}>
          {PALIERS_BONUS.map((p) => {
            const reached = p.niveau <= maxPalier;
            const isActive = p.niveau === maxPalier;
            return (
              <div key={p.niveau} style={{ flex: 1, textAlign: 'center', paddingTop: 8 }}>
                <div style={{ fontFamily: SERIF, fontSize: isActive ? 20 : 15, fontWeight: 500, color: reached ? p.color : T.inkFaint, fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 3 }}>+{p.bonus}€</div>
                <Mono size={8} color={reached ? p.color : T.inkFaint} spacing="0.15em" style={{ display: 'block', marginBottom: 2 }}>{p.label}</Mono>
                <Mono size={8} color={T.inkFaint}>{p.signatures} sig.</Mono>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
          {commerciaux.map((c) => (
            <div key={c.id} style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 8, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(135deg,#FCEEE0,#FBE6D2)', border: `1px solid ${T.borderAmber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 11, fontWeight: 600, color: T.amberDeep }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.split(' ')[0]}</div>
                <Mono size={8} color={T.amberDeep} spacing="0.15em">{PALIERS_BONUS[c.palier - 1]?.icon ?? '○'} PALIER {c.palier}/5</Mono>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function CommercialCards({ commerciaux }: { commerciaux: CommercialV2[] }) {
  if (commerciaux.length === 0) {
    return (
      <div style={{ background: T.cardBg, border: `1px dashed ${T.borderAmber}`, borderRadius: 18, padding: '32px 24px', textAlign: 'center', boxShadow: T.shadowSm }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: T.ink, marginBottom: 6 }}>Aucun commercial actif</div>
        <Mono size={9} color={T.inkFaint}>Invite un membre via l&apos;onglet Équipe pour le voir apparaître ici</Mono>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
      {commerciaux.map((c) => {
        const palier = PALIERS_BONUS[Math.min(c.palier - 1, PALIERS_BONUS.length - 1)];
        return (
          <div key={c.id} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: T.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(135deg,#FCEEE0,#FBE6D2)', border: `1px solid ${T.borderAmber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: T.amberDeep }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{c.name}</div>
                <Mono size={8} color={T.inkFaint} style={{ display: 'block', marginTop: 3 }}>{c.email}</Mono>
              </div>
              {palier && c.palier > 0 && <span style={{ fontSize: 16 }}>{palier.icon}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: T.panel, borderRadius: 12, padding: '12px 8px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}><Speedo value={c.conversion} size={78} /><Mono size={8} color={T.amberDeep}>CONVERSION</Mono></div>
              <div style={{ width: 1, height: 60, background: T.border }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><Mono size={7} color={T.inkGhost}>STRATO</Mono><RocketMini palier={c.palier} total={5} height={80} /><Mono size={7} color={T.inkGhost}>ATTERR.</Mono><Mono size={8} color={T.amberDeep}>P{c.palier}/5</Mono></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {[{ l: 'PROSPECTS', v: c.total, col: T.ink }, { l: '🔥 CHAUDS', v: c.chauds, col: T.amberDeep }, { l: 'SIGNÉS', v: c.signatures, col: T.green }].map((s) => (
                <div key={s.l} style={{ textAlign: 'center', background: T.panel, borderRadius: 8, padding: '8px 4px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: s.col, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <Mono size={7} color={T.inkFaint}>{s.l}</Mono>
                </div>
              ))}
            </div>
            <Link href={`/admin?commercial=${c.id}#pipeline-section`} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: 'rgba(232,133,61,0.10)', border: `1px solid ${T.borderAmber}`, color: T.amberDeep, fontFamily: MONOF, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>Voir le détail →</Link>
          </div>
        );
      })}
    </div>
  );
}

function ActivityLog({ logs }: { logs: ActivityEntry[] }) {
  const typeColor: Record<string, string> = { 'STATUT CHANGED': '#3E7CB1', 'NOTE ADDED': T.inkFaint, 'DEVIS SENT': T.green, 'SYNC NOTION': T.amberDeep };
  if (logs.length === 0) return <Mono size={9} color={T.inkFaint}>Aucune activité récente</Mono>;
  return (
    <div>
      {logs.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < logs.length - 1 ? `1px solid ${T.border}` : 'none', alignItems: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: log.user === 'system' ? T.panel : 'linear-gradient(135deg,#FCEEE0,#FBE6D2)', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 11, fontWeight: 600, color: T.amberDeep }}>{log.userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Mono size={8} color={typeColor[log.type] ?? T.inkFaint}>{log.type}</Mono>
              <span style={{ fontFamily: SANS, fontSize: 12, color: T.inkSoft }}>{log.company}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <Mono size={8} color={T.inkGhost}>{log.date}</Mono>
              {log.detail && <Mono size={8} color={T.inkGhost}>{log.detail}</Mono>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SyncSection({ commerciaux }: { commerciaux: CommercialV2[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [target, setTarget] = useState('all');
  const [result, setResult] = useState({ inserted: 0, updated: 0, deleted: 0, skipped: 0, lastSync: null as string | null });

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const userId = target === 'all' ? undefined : target;
      const res = await fetch('/api/admin/sync-prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
      if (res.ok) {
        const data = await res.json();
        setResult({ inserted: data.inserted ?? 0, updated: data.updated ?? 0, deleted: data.deleted ?? 0, skipped: data.skipped ?? 0, lastSync: new Date().toISOString() });
        startTransition(() => router.refresh());
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Erreur sync : ${err.error ?? res.statusText}`);
      }
    } catch (e) {
      alert(`Erreur réseau : ${e instanceof Error ? e.message : 'inconnue'}`);
    } finally { setSyncing(false); }
  };

  const relSync = () => {
    if (!result.lastSync) return 'Pas encore synchronisé';
    const m = Math.round((Date.now() - new Date(result.lastSync).getTime()) / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    return `Il y a ${Math.floor(m / 60)}h`;
  };

  return (
    <Card>
      <CardHead label="SYNC NOTION" right={<Mono size={9} color={T.inkFaint}>{relSync()}</Mono>} />
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Mono size={8} color={T.inkFaint} style={{ marginRight: 4 }}>CIBLE :</Mono>
          {[{ id: 'all', label: 'Tous' }, ...commerciaux.map((c) => ({ id: c.id, label: c.name.split(' ')[0] }))].map((opt) => (
            <button key={opt.id} onClick={() => setTarget(opt.id)} style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: target === opt.id ? 'rgba(232,133,61,0.14)' : T.panel, border: `1px solid ${target === opt.id ? T.borderAmber : T.border}`, color: target === opt.id ? T.amberDeep : T.inkFaint, fontFamily: MONOF, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{opt.label}</button>
          ))}
        </div>
        <button onClick={doSync} disabled={syncing} style={{ width: '100%', padding: '12px 0', borderRadius: 12, cursor: syncing ? 'not-allowed' : 'pointer', background: syncing ? T.panel : 'linear-gradient(90deg,#D4732A,#E8853D,#FFA060)', border: syncing ? `1px solid ${T.borderAmber}` : 'none', color: syncing ? T.amberDeep : '#FFFFFF', fontFamily: MONOF, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', boxShadow: syncing ? 'none' : '0 4px 14px rgba(232,133,61,0.3)' }}>{syncing ? 'SYNCHRONISATION…' : 'Synchroniser Notion → Prospects'}</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[{ l: 'INSERTED', v: result.inserted, c: T.green }, { l: 'UPDATED', v: result.updated, c: T.amberDeep }, { l: 'DELETED', v: result.deleted, c: '#B5421F' }, { l: 'SKIPPED', v: result.skipped, c: T.inkFaint }].map((item) => (
            <div key={item.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: T.panel, border: `1px solid ${T.border}` }}>
              <Mono size={8} color={T.inkFaint}>{item.l}</Mono>
              <span style={{ fontFamily: MONOF, fontSize: 14, fontWeight: 700, color: item.c, fontVariantNumeric: 'tabular-nums' }}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TopBarVariantSwitcher({ active }: { active: 'A' | 'C' | 'G' }) {
  const variants: { k: 'A' | 'C' | 'G'; label: string; href: string; disabled?: boolean }[] = [
    { k: 'A', label: 'Cockpit', href: '/admin' },
    { k: 'C', label: 'Dense', href: '/admin/dense' },
    { k: 'G', label: 'Japon-Magazine', href: '/admin/japon' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 16px', alignItems: 'center', background: T.cardBg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
      <span style={{ fontFamily: MONOF, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.22em', color: T.amberDeep, marginRight: 8 }}>VARIANTE :</span>
      {variants.map((v) => {
        const isActive = active === v.k;
        return (
          <Link key={v.k} href={v.disabled ? '#' : v.href} onClick={(e) => { if (v.disabled) e.preventDefault(); }} title={v.disabled ? 'Bientôt disponible' : undefined} style={{ padding: '4px 10px', borderRadius: 8, cursor: v.disabled ? 'not-allowed' : 'pointer', opacity: v.disabled ? 0.4 : 1, background: isActive ? 'rgba(232,133,61,0.14)' : T.panel, border: `1px solid ${isActive ? T.borderAmber : T.border}`, color: isActive ? T.amberDeep : T.inkFaint, fontFamily: MONOF, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', transition: 'all 0.15s', textDecoration: 'none', display: 'inline-block' }}>{v.k} · {v.label}</Link>
        );
      })}
      <div style={{ marginLeft: 'auto' }} />
    </div>
  );
}

export default function AdminV2Client({ data }: { data: AdminV2PageData }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBarVariantSwitcher active="A" />
      <div style={{ flex: 1, background: T.pageBg, overflowY: 'auto' }}>
      <header style={{ position: 'relative', padding: '32px 40px', overflow: 'hidden', borderBottom: `1px solid ${T.border}`, background: 'linear-gradient(180deg, #FBF8F2 0%, #F4F1EA 100%)' }}>
        <span aria-hidden style={{ position: 'absolute', right: -20, top: -32, fontFamily: SERIF, fontSize: 200, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.04em', color: 'rgba(232,133,61,0.07)', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>Pipeline.</span>
        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 28, height: 2, borderRadius: 2, background: T.amber }} />
              <Mono color={T.amberDeep} spacing="0.22em">VUE ADMIN · LIVE</Mono>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: T.teal, boxShadow: '0 0 8px rgba(47,169,140,0.7)', display: 'inline-block', marginLeft: 4, animation: 'pulse 2s infinite' }} />
            </span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 500, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.ink, margin: '0 0 10px' }}>Notre <span style={{ fontStyle: 'italic', color: T.amber }}>pipeline</span>, {data.adminName}.</h1>
          <Mono size={9} spacing="0.2em" color={T.inkFaint} style={{ display: 'block', marginBottom: 22 }}>GND CONSULTING · ADMIN GLOBAL · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()} · {data.commerciaux.length} COMMERCIAUX ACTIFS</Mono>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KpiCard label="PROSPECTS LIVE" value={data.kpi.live} sub="+12 VS M-1" spark={[160, 165, 168, 172, 175, 180, data.kpi.live]} />
            <KpiCard label="🔥 CHAUDS" value={data.kpi.chauds} sub="ACTIONNABLES" accent={T.amber} />
            <KpiCard label={`SIGNATURES ${new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase()}`} value={data.kpi.signatures} sub={new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()} accent={T.green} />
            <KpiCard label="REVENU MOIS" value={`${(data.kpi.ca / 1000).toFixed(1)}K€`} sub="EUROS · TTC" accent={T.green} spark={[8, 9.5, 10.2, 11, 12.8, 13.5, data.kpi.ca / 1000]} />
            <KpiCard label="CA POTENTIEL" value={formatEur(data.kpi.ca_potentiel)} sub="PIPELINE PONDÉRÉ" accent={T.teal} />
          </div>
        </div>
      </header>
      <div style={{ padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <div style={{ marginBottom: 14 }}><Hairline label="PERFORMANCE PAR COMMERCIAL" /></div>
          <CommercialCards commerciaux={data.commerciaux} />
        </section>
        <FunnelSection stages={data.funnel} />
        <ClassementSection entries={data.classement} commerciaux={data.commerciaux} />
        <FormationSection entries={data.formation} />
        <PaliersSection commerciaux={data.commerciaux} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <SyncSection commerciaux={data.commerciaux} />
          <Card style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}><Hairline label="ACTIVITÉ RÉCENTE · ÉQUIPE" /></div>
            <ActivityLog logs={data.activity} />
          </Card>
        </div>
        <PipelineSection prospects={data.prospects} commerciaux={data.commerciaux} variant="A" />
      </div>
      </div>
    </div>
  );
}
