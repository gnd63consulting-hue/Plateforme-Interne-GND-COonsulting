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
  RichText,
  STATUS_CONFIG,
  CLASSIF_CONFIG,
} from '@/components/admin/PipelineShared';
import { formatEur } from '@/lib/ca-utils';

const FORMATION_MODULES = ['Découverte\nGND', 'Sites\nVitrines', 'Process\nvente', 'Techniques\nvente', 'Objections\ntraitement', 'Bases\ntechniques', 'Outils\nprocess'];

const PALIERS_BONUS = [
  { niveau: 1, label: 'Bronze',       icon: '🥉', signatures: 1,  bonus: 200,  color: '#A0735C' },
  { niveau: 2, label: 'Argent',       icon: '🥈', signatures: 3,  bonus: 500,  color: '#8A9DB5' },
  { niveau: 3, label: 'Or',           icon: '🥇', signatures: 5,  bonus: 1000, color: '#C49A3C' },
  { niveau: 4, label: 'Platine',      icon: '💎', signatures: 8,  bonus: 2500, color: '#7B70C4' },
  { niveau: 5, label: 'Stratosphère', icon: '🚀', signatures: 12, bonus: 5000, color: '#D97A3D' },
];

function Mono({ children, size = 9, color = '#7B665C', spacing = '0.2em', weight = 600, style = {} }: { children: React.ReactNode; size?: number; color?: string; spacing?: string; weight?: number; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif', fontSize: size, fontWeight: weight, textTransform: 'uppercase', letterSpacing: spacing, color, ...style }}>{children}</span>;
}
function Hairline({ label, color = '#B5601C' }: { label: string; color?: string }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 24, height: 1, background: '#F39253' }} /><Mono color={color}>{label}</Mono></div>;
}
function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span aria-hidden className="font-num" style={{ fontFamily: 'var(--font-marcellus)', fontSize: 13, fontWeight: 500, color: 'rgba(217,122,61,0.55)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{num}</span>
      <Hairline label={label} />
    </div>
  );
}



function KpiCard({ label, value, sub, accent, spark, dark }: { label: string; value: string | number; sub?: string; accent?: string; spark?: number[]; dark?: boolean }) {
  const sparkPts = spark ? spark.map((v, i) => `${(i / (spark.length - 1)) * 56},${18 - ((v - Math.min(...spark)) / (Math.max(...spark) - Math.min(...spark) || 1)) * 16}`).join(' ') : null;
  const lastY = spark ? 18 - ((spark[spark.length - 1] - Math.min(...spark)) / (Math.max(...spark) - Math.min(...spark) || 1)) * 16 : 0;
  const valueColor = dark ? '#FBF7F1' : (accent ?? '#532418');
  return (
    <div className="panel card-hover" style={{ position: 'relative', overflow: 'hidden', padding: 16, flex: 1, minWidth: 120, ...(dark ? { backgroundImage: 'radial-gradient(rgba(243,146,83,0.10) 1px, transparent 1px),linear-gradient(135deg,#4A2719 0%,#2A1510 100%)', backgroundSize: '14px 14px, auto', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 18px 44px -16px rgba(42,21,16,0.55)' } : {}) }}>
      <span aria-hidden style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 999, background: accent ? `linear-gradient(180deg,${accent},${accent}55)` : 'linear-gradient(180deg,#F39253,rgba(243,146,83,0.35))' }} />
      <Mono size={8} color={dark ? '#E0A572' : '#B5601C'} style={{ display: 'block', marginBottom: 8 }}>{label}</Mono>
      <div className="font-num" style={{ fontFamily: 'var(--font-marcellus), Georgia, serif', fontSize: 34, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em', color: valueColor, fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {sub && <Mono size={9} color={dark ? 'rgba(251,247,241,0.55)' : '#9B8A7E'}>{sub}</Mono>}
        {sparkPts && <svg width="56" height="18" viewBox="0 0 56 18"><polyline points={sparkPts} fill="none" stroke="rgba(243,146,83,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="56" cy={lastY} r="2" fill="#F39253" /></svg>}
      </div>
    </div>
  );
}

function Speedo({ value = 38, size = 88 }: { value?: number; size?: number }) {
  const angle = -135 + (value / 100) * 270;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 90deg,#E2D5C3,#F0C9A0,#FBF7F2,#F0C9A0,#E2D5C3)', padding: 3 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 30%,#FFFFFF 0%,#F6EFE7 100%)', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs><linearGradient id={`sg-${size}`} x1="0" x2="1"><stop offset="0" stopColor="#F39253" /><stop offset="1" stopColor="#FFA060" /></linearGradient></defs>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#E2D5C3" strokeWidth="2.5" strokeDasharray="179" strokeDashoffset="60" transform="rotate(135 50 50)" strokeLinecap="round" />
            <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#sg-${size})`} strokeWidth="2.5" strokeDasharray={`${(value / 100) * 119} 999`} transform="rotate(135 50 50)" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: size * 0.35, background: 'linear-gradient(180deg,transparent 8%,#532418 14%,#532418 82%,#F39253 100%)', borderRadius: 1, transformOrigin: '50% 100%', transform: `translate(-50%,-100%) rotate(${angle + 90}deg)`, transition: 'transform 1s cubic-bezier(0.22,1,0.36,1)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: 999, background: 'radial-gradient(circle,#F39253,#A0735C)', transform: 'translate(-50%,-50%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-marcellus), Georgia, serif', fontSize: size * 0.22, fontWeight: 500, color: '#532418', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}<span style={{ color: '#B5601C', fontSize: size * 0.13 }}>%</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RocketMini({ palier = 2, total = 5, height = 100 }: { palier?: number; total?: number; height?: number }) {
  const DOT = 8;
  return (
    <div style={{ position: 'relative', width: 24, height, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, transform: 'translateX(-50%)', background: 'repeating-linear-gradient(to bottom,rgba(243,146,83,0.45) 0px,rgba(243,146,83,0.45) 3px,transparent 3px,transparent 7px)' }} />
      {Array.from({ length: total }).map((_, i) => {
        const levelIdx = total - 1 - i;
        const reached = levelIdx < palier;
        const isActive = levelIdx === palier - 1;
        const topPx = Math.round((i / (total - 1)) * (height - DOT));
        return (
          <div key={i} style={{ position: 'absolute', top: topPx, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isActive ? 18 : DOT, height: isActive ? 26 : DOT }}>
            {isActive ? (
              <svg width="18" height="26" viewBox="0 0 44 64" style={{ filter: 'drop-shadow(0 0 5px rgba(243,146,83,0.7))' }}><path d="M22 4 L32 20 L32 40 L12 40 L12 20 Z" fill="#FFFFFF" stroke="#A0735C" strokeWidth="0.8" /><path d="M22 4 L32 20 L12 20 Z" fill="#F39253" /><circle cx="22" cy="27" r="5" fill="#F39253" /><path d="M12 32 L4 46 L12 40 Z" fill="#D97A3D" /><path d="M32 32 L40 46 L32 40 Z" fill="#D97A3D" /><path d="M15 40 Q19 54 22 48 Q25 54 29 40 Z" fill="#FFA060" /></svg>
            ) : (
              <div style={{ width: DOT, height: DOT, borderRadius: 999, background: reached ? '#F39253' : '#E2D5C3', boxShadow: reached ? '0 0 6px rgba(243,146,83,0.45)' : 'none', border: reached ? '1px solid rgba(243,146,83,0.6)' : '1px solid #E2D5C3' }} />
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
    <div style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#FCF8F3 100%)', border: '1px solid rgba(74,36,26,0.10)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 2px rgba(83,36,24,0.05), 0 10px 30px -18px rgba(83,36,24,0.18)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(74,36,26,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Hairline label="FUNNEL DE CONVERSION" />
        <Mono size={9} color="#7B665C">PAR ÉTAPE PIPELINE</Mono>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((f) => {
          const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.a_contacter;
          const barW = total > 0 ? Math.max((f.count / total) * 100, f.count > 0 ? 2 : 0) : 0;
          return (
            <div key={f.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 110, flexShrink: 0 }}><span style={{ padding: '3px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontFamily: 'var(--font-inter)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{f.label}</span></div>
              <div style={{ flex: 1, height: 20, borderRadius: 999, background: '#F6EFE7', border: '1px solid #E2D5C3', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${barW}%`, background: `linear-gradient(90deg,${cfg.color}BB,${cfg.color})`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)', display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: f.count > 0 ? 24 : 0 }}>
                  {f.count > 0 && <Mono size={9} color="#FFFFFF">{f.count}</Mono>}
                </div>
                {f.count === 0 && <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}><Mono size={9} color="#9B8A7E">0</Mono></div>}
              </div>
              <div style={{ width: 36, flexShrink: 0, textAlign: 'right' }}><Mono size={9} color={f.convPct && f.convPct !== '~' ? cfg.color : '#9B8A7E'}>{f.convPct ?? '—'}</Mono></div>
            </div>
          );
        })}
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid #E2D5C3' }}><Mono size={8} color="#9B8A7E">LE POURCENTAGE INDIQUE LE PASSAGE DEPUIS L&apos;ÉTAPE PRÉCÉDENTE. STATUTS PERDU/ARCHIVÉ EXCLUS.</Mono></div>
      </div>
    </div>
  );
}

function ClassementSection({ entries, commerciaux }: { entries: ClassementEntry[]; commerciaux: CommercialV2[] }) {
  if (entries.length === 0) return null;
  const podium = [entries[1], entries[0], entries[2]].filter(Boolean);
  const fourth = entries[3];
  const rankColors = ['#D97A3D', '#C49A3C', '#A0735C'];
  return (
    <div style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#FCF8F3 100%)', border: '1px solid rgba(74,36,26,0.10)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 2px rgba(83,36,24,0.05), 0 10px 30px -18px rgba(83,36,24,0.18)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(74,36,26,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="CLASSEMENT COMMERCIAUX" /><Mono size={9} color="#7B665C">PODIUM · CA POTENTIEL</Mono></div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 10, alignItems: 'end', marginBottom: 14 }}>
          {podium.map((c) => {
            if (!c) return null;
            const rankIdx = c.rank - 1;
            const isFirst = c.rank === 1;
            const rCol = rankColors[rankIdx] ?? '#9B8A7E';
            const commercial = commerciaux.find(x => x.id === c.id);
            const cardBg = isFirst ? 'radial-gradient(circle at 30% 10%,rgba(243,146,83,0.12) 0%,rgba(243,146,83,0.03) 60%),linear-gradient(160deg,#FFFFFF,#FBF7F2)' : '#FBF7F2';
            const cardBd = isFirst ? `${rCol}66` : '#E2D5C3';
            return (
              <div key={c.id} style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: isFirst ? '18px 16px' : '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: isFirst ? `0 0 24px ${rCol}22` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: isFirst ? 40 : 32, height: isFirst ? 40 : 32, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg,${rCol}35,${rCol}15)`, border: `1.5px solid ${rCol}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-marcellus)', fontSize: isFirst ? 15 : 12, fontWeight: 600, color: rCol }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontFamily: 'var(--font-marcellus)', fontSize: isFirst ? 15 : 12, fontWeight: 500, color: rCol }}>#{c.rank}</span>{isFirst && <span style={{ fontSize: 12 }}>🏆</span>}</div>
                    <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: isFirst ? 12 : 11, fontWeight: 600, color: '#2A2320', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Speedo value={commercial?.conversion ?? 0} size={isFirst ? 68 : 52} /></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-marcellus)', fontSize: isFirst ? 22 : 16, fontWeight: 500, color: '#4F7A38', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{c.ca}<span style={{ fontSize: isFirst ? 12 : 10, color: '#9B8A7E' }}> k€</span></div>
                  <Mono size={7} color="#9B8A7E" style={{ display: 'block', marginTop: 4 }}>CA POTENTIEL</Mono>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: '#F0E7DA', overflow: 'hidden' }}><div style={{ height: '100%', width: `${c.pct}%`, borderRadius: 999, background: `linear-gradient(90deg,${rCol}70,${rCol})` }} /></div>
                <Mono size={7} color="#9B8A7E" style={{ textAlign: 'center' }}>{c.prospects} PROSPECTS</Mono>
              </div>
            );
          })}
        </div>
        {fourth && (
          <div style={{ background: '#FBF7F2', border: '1px solid #E2D5C3', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mono size={10} color="#9B8A7E" weight={700}>#4</Mono>
            <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: '#F0E7DA', border: '1px solid #E2D5C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-marcellus)', fontSize: 10, fontWeight: 600, color: '#9B8A7E' }}>{fourth.initials}</div>
            <div style={{ flex: 1, fontFamily: 'var(--font-inter)', fontSize: 12, color: '#7B665C' }}>{fourth.name}</div>
            <div style={{ fontFamily: 'var(--font-marcellus)', fontSize: 14, color: '#7B665C', fontVariantNumeric: 'tabular-nums' }}>{fourth.ca} k€</div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormationSection({ entries }: { entries: FormationEntry[] }) {
  const admins = entries.filter((u) => u.isAdmin);
  const commercials = entries.filter((u) => !u.isAdmin);
  const renderRow = (u: FormationEntry, i: number, arr: FormationEntry[]) => (
    <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: i < arr.length - 1 ? 10 : 0 }}>
      <div style={{ width: 196, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: u.isAdmin ? 'linear-gradient(135deg,#7B70C4,#5B5090)' : 'linear-gradient(135deg,rgba(243,146,83,0.25),rgba(196,154,60,0.15))', border: `1px solid ${u.isAdmin ? 'rgba(123,112,196,0.4)' : 'rgba(243,146,83,0.30)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-marcellus)', fontSize: 11, fontWeight: 600, color: u.isAdmin ? '#FFFFFF' : '#B5601C' }}>{u.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color: '#2A2320', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
          {u.isAdmin && <Mono size={7} color="#6B5FB0" spacing="0.15em">Admin</Mono>}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {u.progress.map((done, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: done ? 22 : 18, height: done ? 22 : 18, borderRadius: 999, background: done ? 'linear-gradient(135deg,#F39253,#FFA060)' : '#F0E7DA', border: `2px solid ${done ? 'rgba(243,146,83,0.55)' : '#E2D5C3'}`, boxShadow: done ? '0 0 8px rgba(243,146,83,0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done === 1 && <span style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ width: 2, height: 6, background: done ? 'rgba(243,146,83,0.45)' : '#E2D5C3' }} />
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: 3, borderRadius: 999, background: '#F0E7DA', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${(u.completed / u.total) * 100}%`, background: 'linear-gradient(90deg,#D97A3D,#FFA060)', boxShadow: '0 0 6px rgba(243,146,83,0.35)' }} />
        </div>
      </div>
      <div style={{ width: 80, flexShrink: 0, textAlign: 'right', paddingLeft: 16 }}>
        <div style={{ fontFamily: 'var(--font-marcellus)', fontSize: 16, fontWeight: 500, color: u.completed === u.total && u.completed > 0 ? '#4F7A38' : u.completed > 0 ? '#B5601C' : '#9B8A7E', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{u.completed}<span style={{ fontSize: 11, color: '#9B8A7E' }}>/{u.total}</span></div>
        {u.lastActivity && <Mono size={7} color="#9B8A7E" spacing="0.12em" style={{ display: 'block', marginTop: 3 }}>{u.lastActivity}</Mono>}
      </div>
    </div>
  );
  const groupLabel = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 6px', paddingLeft: 196 }}>
      <div style={{ flex: 1, height: 1, background: '#E2D5C3' }} />
      <Mono size={7} color="#9B8A7E" spacing="0.2em">{label}</Mono>
      <div style={{ width: 80 }} />
    </div>
  );
  return (
    <div style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#FCF8F3 100%)', border: '1px solid rgba(74,36,26,0.10)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 2px rgba(83,36,24,0.05), 0 10px 30px -18px rgba(83,36,24,0.18)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(74,36,26,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="SUIVI FORMATION" /><Mono size={9} color="#7B665C">7 MODULES · {entries.length} MEMBRES</Mono></div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 196, marginBottom: 0 }}>
          {FORMATION_MODULES.map((mod, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9B8A7E', writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre' }}>{mod}</div>
            </div>
          ))}
          <div style={{ width: 80 }} />
        </div>
        {admins.length > 0 && groupLabel('ADMINISTRATEURS')}
        {admins.map((u, i) => renderRow(u, i, admins))}
        {commercials.length > 0 && groupLabel('COMMERCIAUX')}
        {commercials.map((u, i) => renderRow(u, i, commercials))}
      </div>
      <div style={{ padding: '10px 24px', borderTop: '1px solid #E2D5C3' }}><Mono size={7} color="#9B8A7E">7 MODULES · PROGRESSION EN TEMPS RÉEL · AUTO-SYNC NOTION</Mono></div>
    </div>
  );
}

function PaliersSection({ commerciaux }: { commerciaux: CommercialV2[] }) {
  const maxPalier = commerciaux.length > 0 ? Math.max(...commerciaux.map((c) => c.palier)) : 0;
  return (
    <div style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#FCF8F3 100%)', border: '1px solid rgba(74,36,26,0.10)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 2px rgba(83,36,24,0.05), 0 10px 30px -18px rgba(83,36,24,0.18)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(74,36,26,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="PALIERS BONUS" /><Mono size={9} color="#7B665C">PAR COMMERCIAL · MENSUEL</Mono></div>
      <div style={{ padding: '20px 24px 24px' }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
            {PALIERS_BONUS.map((p) => {
              const reached = p.niveau <= maxPalier;
              const isActive = p.niveau === maxPalier;
              const nodeSize = isActive ? 52 : reached ? 40 : 32;
              return (
                <div key={p.niveau} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: nodeSize, height: nodeSize, borderRadius: 999, background: isActive ? `radial-gradient(circle at 35% 35%, ${p.color}, ${p.color}88)` : reached ? `${p.color}22` : '#F0E7DA', border: `2px solid ${reached ? p.color + '80' : '#E2D5C3'}`, boxShadow: isActive ? `0 0 18px ${p.color}55` : reached ? `0 0 8px ${p.color}30` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isActive ? 24 : reached ? 18 : 16 }}>{p.icon}</div>
                  <div style={{ width: 2, height: 10, background: reached ? p.color + '60' : '#E2D5C3' }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 4, borderRadius: 999, background: '#F0E7DA', overflow: 'visible' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${maxPalier > 0 ? ((maxPalier - 1) / (PALIERS_BONUS.length - 1)) * 100 : 0}%`, background: 'linear-gradient(90deg,#D97A3D,#F39253)', boxShadow: '0 0 8px rgba(243,146,83,0.4)' }} />
            {PALIERS_BONUS.map((p, i) => {
              const reached = p.niveau <= maxPalier;
              const leftPct = (i / (PALIERS_BONUS.length - 1)) * 100;
              return <div key={p.niveau} style={{ position: 'absolute', top: '50%', left: `${leftPct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 999, background: reached ? p.color : '#E2D5C3', border: '2px solid #FFFFFF', boxShadow: reached ? `0 0 6px ${p.color}60` : 'none', zIndex: 1 }} />;
            })}
          </div>
        </div>
        <div style={{ display: 'flex', marginBottom: 20 }}>
          {PALIERS_BONUS.map((p) => {
            const reached = p.niveau <= maxPalier;
            const isActive = p.niveau === maxPalier;
            return (
              <div key={p.niveau} style={{ flex: 1, textAlign: 'center', paddingTop: 8 }}>
                <div style={{ fontFamily: 'var(--font-marcellus)', fontSize: isActive ? 20 : 15, fontWeight: 500, color: isActive ? p.color : reached ? p.color : '#9B8A7E', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 3 }}>+{p.bonus}€</div>
                <Mono size={8} color={reached ? p.color : '#9B8A7E'} spacing="0.15em" style={{ display: 'block', marginBottom: 2 }}>{p.label}</Mono>
                <Mono size={8} color="#9B8A7E">{p.signatures} sig.</Mono>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid #E2D5C3' }}>
          {commerciaux.map((c) => (
            <div key={c.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#FBF7F2', border: '1px solid #E2D5C3', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(135deg,rgba(243,146,83,0.25),rgba(196,154,60,0.15))', border: '1px solid rgba(243,146,83,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-marcellus)', fontSize: 11, fontWeight: 600, color: '#B5601C' }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color: '#2A2320', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.split(' ')[0]}</div>
                <Mono size={8} color="#B5601C" spacing="0.15em">{PALIERS_BONUS[c.palier - 1]?.icon ?? '○'} PALIER {c.palier}/5</Mono>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommercialCards({ commerciaux }: { commerciaux: CommercialV2[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
      {commerciaux.map((c) => {
        const palier = PALIERS_BONUS[Math.min(c.palier - 1, PALIERS_BONUS.length - 1)];
        return (
          <div key={c.id} style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#FCF8F3 100%)', border: '1px solid rgba(74,36,26,0.10)', borderRadius: 24, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 2px rgba(83,36,24,0.05), 0 10px 30px -18px rgba(83,36,24,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(135deg,rgba(243,146,83,0.25),rgba(196,154,60,0.15))', border: '1px solid rgba(243,146,83,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-marcellus)', fontSize: 16, fontWeight: 500, color: '#B5601C' }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-marcellus)', fontSize: 17, fontWeight: 500, color: '#532418', letterSpacing: '-0.01em', lineHeight: 1.1 }}>{c.name}</div>
                <Mono size={8} color="#7B665C" style={{ display: 'block', marginTop: 3 }}>{c.email}</Mono>
              </div>
              {palier && c.palier > 0 && <span style={{ fontSize: 16 }}>{palier.icon}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: '#FBF7F2', borderRadius: 12, padding: '12px 8px', border: '1px solid #E2D5C3' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}><Speedo value={c.conversion} size={78} /><Mono size={8} color="#B5601C">CONVERSION</Mono></div>
              <div style={{ width: 1, height: 60, background: '#E2D5C3' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><Mono size={7} color="#9B8A7E">STRATO</Mono><RocketMini palier={c.palier} total={5} height={80} /><Mono size={7} color="#9B8A7E">ATTERR.</Mono><Mono size={8} color="#B5601C">P{c.palier}/5</Mono></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {[{ l: 'PROSPECTS', v: c.total }, { l: '🔥 CHAUDS', v: c.chauds }, { l: 'SIGNÉS', v: c.signatures }].map((s) => (
                <div key={s.l} style={{ textAlign: 'center', background: '#FBF7F2', borderRadius: 8, padding: '7px 4px', border: '1px solid #E2D5C3' }}>
                  <div style={{ fontFamily: 'var(--font-marcellus)', fontSize: 20, fontWeight: 500, color: '#532418', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <Mono size={7} color="#7B665C">{s.l}</Mono>
                </div>
              ))}
            </div>
            <Link href={`/admin?commercial=${c.id}#pipeline-section`} style={{ width: '100%', padding: '9px 0', borderRadius: 10, background: 'rgba(243,146,83,0.10)', border: '1px solid rgba(243,146,83,0.30)', color: '#B5601C', fontFamily: 'var(--font-inter)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>Voir le détail →</Link>
          </div>
        );
      })}
    </div>
  );
}

function ActivityLog({ logs }: { logs: ActivityEntry[] }) {
  const typeColor: Record<string, string> = { 'STATUT CHANGED': '#4E78A0', 'NOTE ADDED': '#7B665C', 'DEVIS SENT': '#4F7A38', 'SYNC NOTION': '#B5601C' };
  if (logs.length === 0) return <Mono size={9} color="#9B8A7E">Aucune activité récente</Mono>;
  return (
    <div>
      {logs.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < logs.length - 1 ? '1px solid #F0E7DA' : 'none', alignItems: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: log.user === 'system' ? '#F0E7DA' : 'rgba(243,146,83,0.12)', border: '1px solid #E2D5C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-marcellus)', fontSize: 11, fontWeight: 600, color: '#B5601C' }}>{log.userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Mono size={8} color={typeColor[log.type] ?? '#7B665C'}>{log.type}</Mono>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#2A2320' }}>{log.company}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <Mono size={8} color="#9B8A7E">{log.date}</Mono>
              {log.detail && <Mono size={8} color="#9B8A7E">{log.detail}</Mono>}
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
    <div style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#FCF8F3 100%)', border: '1px solid rgba(74,36,26,0.10)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 2px rgba(83,36,24,0.05), 0 10px 30px -18px rgba(83,36,24,0.18)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(74,36,26,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="SYNC NOTION" /><Mono size={9} color="#7B665C">{relSync()}</Mono></div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Mono size={8} color="#7B665C" style={{ marginRight: 4 }}>CIBLE :</Mono>
          {[{ id: 'all', label: 'Tous' }, ...commerciaux.map((c) => ({ id: c.id, label: c.name.split(' ')[0] }))].map((opt) => (
            <button key={opt.id} onClick={() => setTarget(opt.id)} style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: target === opt.id ? 'rgba(243,146,83,0.15)' : '#FBF7F2', border: `1px solid ${target === opt.id ? 'rgba(243,146,83,0.40)' : '#E2D5C3'}`, color: target === opt.id ? '#B5601C' : '#7B665C', fontFamily: 'var(--font-inter)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{opt.label}</button>
          ))}
        </div>
        <button onClick={doSync} disabled={syncing} style={{ width: '100%', padding: '11px 0', borderRadius: 12, cursor: syncing ? 'not-allowed' : 'pointer', background: syncing ? 'rgba(243,146,83,0.10)' : 'linear-gradient(90deg,#D97A3D,#F39253,#FFA060)', border: syncing ? '1px solid rgba(243,146,83,0.30)' : 'none', color: syncing ? '#B5601C' : '#FFFFFF', fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', boxShadow: syncing ? 'none' : '0 4px 16px rgba(243,146,83,0.30)' }}>{syncing ? 'SYNCHRONISATION…' : 'Synchroniser Notion → Prospects'}</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[{ l: 'INSERTED', v: result.inserted, c: '#4F7A38' }, { l: 'UPDATED', v: result.updated, c: '#B5601C' }, { l: 'DELETED', v: result.deleted, c: '#B5421F' }, { l: 'SKIPPED', v: result.skipped, c: '#7B665C' }].map((item) => (
            <div key={item.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#FBF7F2', border: '1px solid #E2D5C3' }}>
              <Mono size={8} color="#7B665C">{item.l}</Mono>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 700, color: item.c, fontVariantNumeric: 'tabular-nums' }}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function AdminV2Client({ data }: { data: AdminV2PageData }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ flex: 1, background: 'linear-gradient(180deg,#F8F1E9 0%,#F6EFE7 60%,#F4ECE2 100%)', overflowY: 'auto' }}>
      <header className="surface-chocolate" style={{ position: 'relative', margin: '24px 40px 0', padding: '28px 32px 26px', overflow: 'hidden', borderRadius: 16 }}>
        <span aria-hidden className="watermark" style={{ position: 'absolute', right: -16, top: -34, fontFamily: 'var(--font-marcellus)', fontSize: 150, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.04em', color: 'rgba(251,247,241,0.08)', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>Pipeline.</span>
        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 24, height: 1, background: 'linear-gradient(90deg,#F39253,transparent)' }} />
              <Mono color="#E0A572" spacing="0.22em">VUE ADMIN · LIVE</Mono>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: '#F39253', boxShadow: '0 0 8px rgba(243,146,83,0.8)', display: 'inline-block', marginLeft: 4, animation: 'pulse 2s infinite' }} />
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-marcellus)', fontSize: 44, fontWeight: 500, lineHeight: 0.98, letterSpacing: '-0.03em', color: '#FBF7F1', margin: '0 0 8px' }}>Notre <span style={{ fontStyle: 'italic', color: '#F0B281' }}>pipeline</span>, {data.adminName}.</h1>
          <Mono size={9} spacing="0.2em" color="rgba(251,247,241,0.55)" style={{ display: 'block', marginBottom: 22 }}>GND CONSULTING · ADMIN GLOBAL · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()} · {data.commerciaux.length} COMMERCIAUX ACTIFS</Mono>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KpiCard label="PROSPECTS LIVE" value={data.kpi.live} sub="+12 VS M-1" spark={[160, 165, 168, 172, 175, 180, data.kpi.live]} />
            <KpiCard label="🔥 CHAUDS" value={data.kpi.chauds} sub="ACTIONNABLES" accent="#D97A3D" dark />
            <KpiCard label={`SIGNATURES ${new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase()}`} value={data.kpi.signatures} sub={new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()} accent="#4F7A38" />
            <KpiCard label="REVENU MOIS" value={`${(data.kpi.ca / 1000).toFixed(1)}K€`} sub="EUROS · TTC" accent="#4F7A38" spark={[8, 9.5, 10.2, 11, 12.8, 13.5, data.kpi.ca / 1000]} />
            <KpiCard label="CA POTENTIEL" value={formatEur(data.kpi.ca_potentiel)} sub="PIPELINE PONDÉRÉ" accent="#D97A3D" />
          </div>
        </div>
      </header>
      <div style={{ padding: '26px 40px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <SectionLabel num="01" label="PERFORMANCE PAR COMMERCIAL" />
          <CommercialCards commerciaux={data.commerciaux} />
        </section>
        <section>
          <SectionLabel num="02" label="FUNNEL & CONVERSION" />
          <FunnelSection stages={data.funnel} />
        </section>
        <section>
          <SectionLabel num="03" label="CLASSEMENT COMMERCIAUX" />
          <ClassementSection entries={data.classement} commerciaux={data.commerciaux} />
        </section>
        <section>
          <SectionLabel num="04" label="SUIVI FORMATION" />
          <FormationSection entries={data.formation} />
        </section>
        <section>
          <SectionLabel num="05" label="PALIERS BONUS" />
          <PaliersSection commerciaux={data.commerciaux} />
        </section>
        <section>
          <SectionLabel num="06" label="SYNCHRONISATION & ACTIVITÉ" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
            <SyncSection commerciaux={data.commerciaux} />
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ marginBottom: 14 }}><Hairline label="ACTIVITÉ RÉCENTE · ÉQUIPE" /></div>
              <ActivityLog logs={data.activity} />
            </div>
          </div>
        </section>
        <section>
          <SectionLabel num="07" label="PIPELINE DÉTAILLÉ" />
          <PipelineSection prospects={data.prospects} commerciaux={data.commerciaux} variant="A" />
        </section>
      </div>
      </div>
    </div>
  );
}



