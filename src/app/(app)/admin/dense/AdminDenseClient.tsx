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
} from '../v2/page';
import {
  PipelineSection,
  STATUS_CONFIG,
} from '@/components/admin/PipelineShared';

const FORMATION_MODULES = ['Découverte\nGND', 'Sites\nVitrines', 'Process\nvente', 'Techniques\nvente', 'Objections\ntraitement', 'Bases\ntechniques', 'Outils\nprocess'];

const PALIERS_BONUS = [
  { niveau: 1, label: 'Bronze',       icon: '🥉', signatures: 1,  bonus: 200,  color: '#A0735C' },
  { niveau: 2, label: 'Argent',       icon: '🥈', signatures: 3,  bonus: 500,  color: '#8A9DB5' },
  { niveau: 3, label: 'Or',           icon: '🥇', signatures: 5,  bonus: 1000, color: '#C49A3C' },
  { niveau: 4, label: 'Platine',      icon: '💎', signatures: 8,  bonus: 2500, color: '#7B70C4' },
  { niveau: 5, label: 'Stratosphère', icon: '🚀', signatures: 12, bonus: 5000, color: '#E8853D' },
];

function Mono({ children, size = 9, color = 'rgba(253,246,238,0.4)', spacing = '0.2em', weight = 600, style = {} }: { children: React.ReactNode; size?: number; color?: string; spacing?: string; weight?: number; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontSize: size, fontWeight: weight, textTransform: 'uppercase', letterSpacing: spacing, color, ...style }}>{children}</span>;
}
function Hairline({ label, color = '#E8853D' }: { label: string; color?: string }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 24, height: 1, background: color }} /><Mono color={color}>{label}</Mono></div>;
}

// Rich text renderer — détecte paragraphes (split par \n\n) et listes (lignes
// commençant par -, •, *, ou "1.", "2."). Sinon rend des paragraphes simples.

function Speedo({ value = 38, size = 88 }: { value?: number; size?: number }) {
  const angle = -135 + (value / 100) * 270;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 90deg,#3D1F1E,#A0735C,#FDF6EE,#A0735C,#3D1F1E)', padding: 3 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 30%,#2A1311 0%,#0E0807 100%)', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs><linearGradient id={`sg-dense-${size}`} x1="0" x2="1"><stop offset="0" stopColor="#D4732A" /><stop offset="1" stopColor="#FFA060" /></linearGradient></defs>
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(232,133,61,0.12)" strokeWidth="2.5" strokeDasharray="179" strokeDashoffset="60" transform="rotate(135 50 50)" strokeLinecap="round" />
            <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#sg-dense-${size})`} strokeWidth="2.5" strokeDasharray={`${(value / 100) * 119} 999`} transform="rotate(135 50 50)" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: size * 0.35, background: 'linear-gradient(180deg,transparent 8%,#FDF6EE 14%,#FDF6EE 82%,#E8853D 100%)', borderRadius: 1, transformOrigin: '50% 100%', transform: `translate(-50%,-100%) rotate(${angle + 90}deg)`, transition: 'transform 1s cubic-bezier(0.22,1,0.36,1)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: 999, background: 'radial-gradient(circle,#FDF6EE,#A0735C)', transform: 'translate(-50%,-50%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: size * 0.22, fontWeight: 500, color: '#FDF6EE', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}<span style={{ color: '#E8853D', fontSize: size * 0.13 }}>%</span></span>
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
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, transform: 'translateX(-50%)', background: 'repeating-linear-gradient(to bottom,rgba(232,133,61,0.35) 0px,rgba(232,133,61,0.35) 3px,transparent 3px,transparent 7px)' }} />
      {Array.from({ length: total }).map((_, i) => {
        const levelIdx = total - 1 - i;
        const reached = levelIdx < palier;
        const isActive = levelIdx === palier - 1;
        const topPx = Math.round((i / (total - 1)) * (height - DOT));
        return (
          <div key={i} style={{ position: 'absolute', top: topPx, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isActive ? 18 : DOT, height: isActive ? 26 : DOT }}>
            {isActive ? (
              <svg width="18" height="26" viewBox="0 0 44 64" style={{ filter: 'drop-shadow(0 0 5px rgba(232,133,61,0.9))' }}><path d="M22 4 L32 20 L32 40 L12 40 L12 20 Z" fill="#FDF6EE" stroke="#A0735C" strokeWidth="0.8" /><path d="M22 4 L32 20 L12 20 Z" fill="#E8853D" /><circle cx="22" cy="27" r="5" fill="#E8853D" /><path d="M12 32 L4 46 L12 40 Z" fill="#D4732A" /><path d="M32 32 L40 46 L32 40 Z" fill="#D4732A" /><path d="M15 40 Q19 54 22 48 Q25 54 29 40 Z" fill="#FFA060" /></svg>
            ) : (
              <div style={{ width: DOT, height: DOT, borderRadius: 999, background: reached ? '#E8853D' : 'rgba(253,246,238,0.10)', boxShadow: reached ? '0 0 6px rgba(232,133,61,0.55)' : 'none', border: reached ? '1px solid rgba(232,133,61,0.6)' : '1px solid rgba(253,246,238,0.15)' }} />
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
    <div style={{ background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(232,133,61,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Hairline label="FUNNEL DE CONVERSION" />
        <Mono size={9} color="rgba(253,246,238,0.4)">PAR ÉTAPE PIPELINE</Mono>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((f) => {
          const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.a_contacter;
          const barW = total > 0 ? Math.max((f.count / total) * 100, f.count > 0 ? 2 : 0) : 0;
          return (
            <div key={f.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 110, flexShrink: 0 }}><span style={{ padding: '3px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{f.label}</span></div>
              <div style={{ flex: 1, height: 20, borderRadius: 999, background: 'rgba(253,246,238,0.02)', border: '1px solid rgba(232,133,61,0.06)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${barW}%`, background: `linear-gradient(90deg,${cfg.color}BB,${cfg.color})`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)', display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: f.count > 0 ? 24 : 0 }}>
                  {f.count > 0 && <Mono size={9} color="rgba(253,246,238,0.9)">{f.count}</Mono>}
                </div>
                {f.count === 0 && <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}><Mono size={9} color="rgba(253,246,238,0.4)">0</Mono></div>}
              </div>
              <div style={{ width: 36, flexShrink: 0, textAlign: 'right' }}><Mono size={9} color={f.convPct && f.convPct !== '~' ? cfg.color : 'rgba(253,246,238,0.4)'}>{f.convPct ?? '—'}</Mono></div>
            </div>
          );
        })}
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid rgba(232,133,61,0.10)' }}><Mono size={8} color="rgba(253,246,238,0.4)">LE POURCENTAGE INDIQUE LE PASSAGE DEPUIS L&apos;ÉTAPE PRÉCÉDENTE. STATUTS PERDU/ARCHIVÉ EXCLUS.</Mono></div>
      </div>
    </div>
  );
}

function ClassementSection({ entries, commerciaux }: { entries: ClassementEntry[]; commerciaux: CommercialV2[] }) {
  if (entries.length === 0) return null;
  const podium = [entries[1], entries[0], entries[2]].filter(Boolean);
  const fourth = entries[3];
  const rankColors = ['#E8853D', '#C49A3C', '#A0735C'];
  return (
    <div style={{ background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(232,133,61,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="CLASSEMENT COMMERCIAUX" /><Mono size={9} color="rgba(253,246,238,0.38)">PODIUM · CA POTENTIEL</Mono></div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 10, alignItems: 'end', marginBottom: 14 }}>
          {podium.map((c) => {
            if (!c) return null;
            const rankIdx = c.rank - 1;
            const isFirst = c.rank === 1;
            const rCol = rankColors[rankIdx] ?? 'rgba(253,246,238,0.3)';
            const commercial = commerciaux.find(x => x.id === c.id);
            const cardBg = isFirst ? 'radial-gradient(circle at 30% 10%,rgba(232,133,61,0.15) 0%,rgba(232,133,61,0.04) 60%),linear-gradient(160deg,rgba(61,31,30,0.8),rgba(26,15,14,0.95))' : 'transparent';
            const cardBd = isFirst ? `${rCol}50` : 'rgba(232,133,61,0.10)';
            return (
              <div key={c.id} style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: isFirst ? '18px 16px' : '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: isFirst ? `0 0 24px ${rCol}18` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: isFirst ? 40 : 32, height: isFirst ? 40 : 32, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg,${rCol}35,${rCol}15)`, border: `1.5px solid ${rCol}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: isFirst ? 15 : 12, fontWeight: 600, color: rCol }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontFamily: 'var(--font-fraunces)', fontSize: isFirst ? 15 : 12, fontWeight: 500, color: rCol }}>#{c.rank}</span>{isFirst && <span style={{ fontSize: 12 }}>🏆</span>}</div>
                    <div style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: isFirst ? 12 : 11, fontWeight: 600, color: '#FDF6EE', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Speedo value={commercial?.conversion ?? 0} size={isFirst ? 68 : 52} /></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: isFirst ? 22 : 16, fontWeight: 500, color: '#5A8A3F', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{c.ca}<span style={{ fontSize: isFirst ? 12 : 10, color: 'rgba(253,246,238,0.38)' }}> k€</span></div>
                  <Mono size={7} color="rgba(253,246,238,0.38)" style={{ display: 'block', marginTop: 4 }}>CA POTENTIEL</Mono>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: 'rgba(253,246,238,0.06)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${c.pct}%`, borderRadius: 999, background: `linear-gradient(90deg,${rCol}70,${rCol})` }} /></div>
                <Mono size={7} color="rgba(253,246,238,0.38)" style={{ textAlign: 'center' }}>{c.prospects} PROSPECTS</Mono>
              </div>
            );
          })}
        </div>
        {fourth && (
          <div style={{ background: 'rgba(253,246,238,0.02)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mono size={10} color="rgba(253,246,238,0.38)" weight={700}>#4</Mono>
            <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: 'rgba(253,246,238,0.06)', border: '1px solid rgba(232,133,61,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: 10, fontWeight: 600, color: 'rgba(253,246,238,0.38)' }}>{fourth.initials}</div>
            <div style={{ flex: 1, fontFamily: 'var(--font-geist-sans)', fontSize: 12, color: 'rgba(253,246,238,0.38)' }}>{fourth.name}</div>
            <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 14, color: 'rgba(253,246,238,0.38)', fontVariantNumeric: 'tabular-nums' }}>{fourth.ca} k€</div>
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
        <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: u.isAdmin ? 'linear-gradient(135deg,#7B70C4,#5B5090)' : 'linear-gradient(135deg,rgba(232,133,61,0.25),rgba(196,154,60,0.15))', border: `1px solid ${u.isAdmin ? 'rgba(123,112,196,0.4)' : 'rgba(232,133,61,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: 11, fontWeight: 600, color: u.isAdmin ? '#C0B8FF' : '#E8853D' }}>{u.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12, fontWeight: 600, color: '#FDF6EE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
          {u.isAdmin && <Mono size={7} color="#C0B8FF" spacing="0.15em">Admin</Mono>}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {u.progress.map((done, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: done ? 22 : 18, height: done ? 22 : 18, borderRadius: 999, background: done ? 'linear-gradient(135deg,#E8853D,#FFA060)' : 'rgba(253,246,238,0.05)', border: `2px solid ${done ? 'rgba(232,133,61,0.55)' : 'rgba(253,246,238,0.12)'}`, boxShadow: done ? '0 0 8px rgba(232,133,61,0.40)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done === 1 && <span style={{ fontSize: 9, color: '#3D1F1E', fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ width: 2, height: 6, background: done ? 'rgba(232,133,61,0.45)' : 'rgba(253,246,238,0.06)' }} />
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: 3, borderRadius: 999, background: 'rgba(253,246,238,0.06)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${(u.completed / u.total) * 100}%`, background: 'linear-gradient(90deg,#D4732A,#FFA060)', boxShadow: '0 0 6px rgba(232,133,61,0.35)' }} />
        </div>
      </div>
      <div style={{ width: 80, flexShrink: 0, textAlign: 'right', paddingLeft: 16 }}>
        <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 16, fontWeight: 500, color: u.completed === u.total && u.completed > 0 ? '#5A8A3F' : u.completed > 0 ? '#E8853D' : 'rgba(253,246,238,0.38)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{u.completed}<span style={{ fontSize: 11, color: 'rgba(253,246,238,0.38)' }}>/{u.total}</span></div>
        {u.lastActivity && <Mono size={7} color="rgba(253,246,238,0.38)" spacing="0.12em" style={{ display: 'block', marginTop: 3 }}>{u.lastActivity}</Mono>}
      </div>
    </div>
  );
  const groupLabel = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 6px', paddingLeft: 196 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(232,133,61,0.10)' }} />
      <Mono size={7} color="rgba(253,246,238,0.38)" spacing="0.2em">{label}</Mono>
      <div style={{ width: 80 }} />
    </div>
  );
  return (
    <div style={{ background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(232,133,61,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="SUIVI FORMATION" /><Mono size={9} color="rgba(253,246,238,0.38)">7 MODULES · {entries.length} MEMBRES</Mono></div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 196, marginBottom: 0 }}>
          {FORMATION_MODULES.map((mod, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(253,246,238,0.38)', writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre' }}>{mod}</div>
            </div>
          ))}
          <div style={{ width: 80 }} />
        </div>
        {admins.length > 0 && groupLabel('ADMINISTRATEURS')}
        {admins.map((u, i) => renderRow(u, i, admins))}
        {commercials.length > 0 && groupLabel('COMMERCIAUX')}
        {commercials.map((u, i) => renderRow(u, i, commercials))}
      </div>
      <div style={{ padding: '10px 24px', borderTop: '1px solid rgba(232,133,61,0.10)' }}><Mono size={7} color="rgba(253,246,238,0.38)">7 MODULES · PROGRESSION EN TEMPS RÉEL · AUTO-SYNC NOTION</Mono></div>
    </div>
  );
}

function PaliersSection({ commerciaux }: { commerciaux: CommercialV2[] }) {
  const maxPalier = commerciaux.length > 0 ? Math.max(...commerciaux.map((c) => c.palier)) : 0;
  return (
    <div style={{ background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(232,133,61,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="PALIERS BONUS" /><Mono size={9} color="rgba(253,246,238,0.38)">PAR COMMERCIAL · MENSUEL</Mono></div>
      <div style={{ padding: '20px 24px 24px' }}>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
            {PALIERS_BONUS.map((p) => {
              const reached = p.niveau <= maxPalier;
              const isActive = p.niveau === maxPalier;
              const nodeSize = isActive ? 52 : reached ? 40 : 32;
              return (
                <div key={p.niveau} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: nodeSize, height: nodeSize, borderRadius: 999, background: isActive ? `radial-gradient(circle at 35% 35%, ${p.color}, ${p.color}88)` : reached ? `${p.color}22` : 'rgba(253,246,238,0.05)', border: `2px solid ${reached ? p.color + '80' : 'rgba(253,246,238,0.12)'}`, boxShadow: isActive ? `0 0 18px ${p.color}55` : reached ? `0 0 8px ${p.color}30` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isActive ? 24 : reached ? 18 : 16 }}>{p.icon}</div>
                  <div style={{ width: 2, height: 10, background: reached ? p.color + '60' : 'rgba(253,246,238,0.08)' }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 4, borderRadius: 999, background: 'rgba(253,246,238,0.06)', overflow: 'visible' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, width: `${maxPalier > 0 ? ((maxPalier - 1) / (PALIERS_BONUS.length - 1)) * 100 : 0}%`, background: 'linear-gradient(90deg,#D4732A,#E8853D)', boxShadow: '0 0 8px rgba(232,133,61,0.4)' }} />
            {PALIERS_BONUS.map((p, i) => {
              const reached = p.niveau <= maxPalier;
              const leftPct = (i / (PALIERS_BONUS.length - 1)) * 100;
              return <div key={p.niveau} style={{ position: 'absolute', top: '50%', left: `${leftPct}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: 999, background: reached ? p.color : 'rgba(253,246,238,0.15)', border: '2px solid rgba(26,15,14,0.8)', boxShadow: reached ? `0 0 6px ${p.color}60` : 'none', zIndex: 1 }} />;
            })}
          </div>
        </div>
        <div style={{ display: 'flex', marginBottom: 20 }}>
          {PALIERS_BONUS.map((p) => {
            const reached = p.niveau <= maxPalier;
            const isActive = p.niveau === maxPalier;
            return (
              <div key={p.niveau} style={{ flex: 1, textAlign: 'center', paddingTop: 8 }}>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: isActive ? 20 : 15, fontWeight: 500, color: isActive ? p.color : reached ? p.color : 'rgba(253,246,238,0.38)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 3 }}>+{p.bonus}€</div>
                <Mono size={8} color={reached ? p.color : 'rgba(253,246,238,0.38)'} spacing="0.15em" style={{ display: 'block', marginBottom: 2 }}>{p.label}</Mono>
                <Mono size={8} color="rgba(253,246,238,0.38)">{p.signatures} sig.</Mono>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(232,133,61,0.10)', flexWrap: 'wrap' }}>
          {commerciaux.map((c) => (
            <div key={c.id} style={{ flex: '1 1 140px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(135deg,rgba(232,133,61,0.25),rgba(196,154,60,0.15))', border: '1px solid rgba(232,133,61,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: 11, fontWeight: 600, color: '#E8853D' }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12, fontWeight: 600, color: '#FDF6EE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.split(' ')[0]}</div>
                <Mono size={8} color="#E8853D" spacing="0.15em">{PALIERS_BONUS[c.palier - 1]?.icon ?? '○'} PALIER {c.palier}/5</Mono>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityLog({ logs, max }: { logs: ActivityEntry[]; max?: number }) {
  const typeColor: Record<string, string> = { 'STATUT CHANGED': '#5B8AB8', 'NOTE ADDED': 'rgba(253,246,238,0.3)', 'DEVIS SENT': '#5A8A3F', 'SYNC NOTION': 'rgba(232,133,61,0.6)' };
  const visible = max ? logs.slice(0, max) : logs;
  if (visible.length === 0) return <Mono size={9} color="rgba(253,246,238,0.4)">Aucune activité récente</Mono>;
  return (
    <div>
      {visible.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < visible.length - 1 ? '1px solid rgba(232,133,61,0.06)' : 'none', alignItems: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: log.user === 'system' ? 'rgba(253,246,238,0.04)' : 'rgba(232,133,61,0.10)', border: '1px solid rgba(232,133,61,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: 11, fontWeight: 600, color: '#E8853D' }}>{log.userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Mono size={8} color={typeColor[log.type] ?? 'rgba(253,246,238,0.3)'}>{log.type}</Mono>
              <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12, color: 'rgba(253,246,238,0.75)' }}>{log.company}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <Mono size={8} color="rgba(253,246,238,0.3)">{log.date}</Mono>
              {log.detail && <Mono size={8} color="rgba(253,246,238,0.3)">{log.detail}</Mono>}
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
    <div style={{ background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(232,133,61,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Hairline label="SYNC NOTION" /><Mono size={9} color="rgba(253,246,238,0.4)">{relSync()}</Mono></div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Mono size={8} color="rgba(253,246,238,0.4)" style={{ marginRight: 4 }}>CIBLE :</Mono>
          {[{ id: 'all', label: 'Tous' }, ...commerciaux.map((c) => ({ id: c.id, label: c.name.split(' ')[0] }))].map((opt) => (
            <button key={opt.id} onClick={() => setTarget(opt.id)} style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', background: target === opt.id ? 'rgba(232,133,61,0.15)' : 'rgba(253,246,238,0.04)', border: `1px solid ${target === opt.id ? 'rgba(232,133,61,0.30)' : 'rgba(253,246,238,0.08)'}`, color: target === opt.id ? '#E8853D' : 'rgba(253,246,238,0.4)', fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{opt.label}</button>
          ))}
        </div>
        <button onClick={doSync} disabled={syncing} style={{ width: '100%', padding: '11px 0', borderRadius: 12, cursor: syncing ? 'not-allowed' : 'pointer', background: syncing ? 'rgba(232,133,61,0.08)' : 'linear-gradient(90deg,#D4732A,#E8853D,#FFA060)', border: syncing ? '1px solid rgba(232,133,61,0.18)' : 'none', color: syncing ? '#E8853D' : '#3D1F1E', fontFamily: 'var(--font-geist-mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', boxShadow: syncing ? 'none' : '0 0 20px rgba(232,133,61,0.25)' }}>{syncing ? 'SYNCHRONISATION…' : 'Synchroniser Notion → Prospects'}</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[{ l: 'INSERTED', v: result.inserted, c: '#5A8A3F' }, { l: 'UPDATED', v: result.updated, c: '#E8853D' }, { l: 'DELETED', v: result.deleted, c: '#B5421F' }, { l: 'SKIPPED', v: result.skipped, c: 'rgba(253,246,238,0.4)' }].map((item) => (
            <div key={item.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'rgba(253,246,238,0.02)', border: '1px solid rgba(232,133,61,0.10)' }}>
              <Mono size={8} color="rgba(253,246,238,0.4)">{item.l}</Mono>
              <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 700, color: item.c, fontVariantNumeric: 'tabular-nums' }}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// VARIANTE C — Dense data (2 colonnes)
// ═══════════════════════════════════════════════════════════════

// Top bar de variantes (cockpit / dense / japon). Conforme à la source design
// `Vue Admin v2-print.html` lignes 1138-1157. Dupliqué localement — DRY refactor
// avec PR #4 (variante G activée).
function TopBarVariantSwitcher({ active }: { active: 'A' | 'C' | 'G' }) {
  const variants: { k: 'A' | 'C' | 'G'; label: string; href: string; disabled?: boolean }[] = [
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
            href={v.disabled ? '#' : v.href}
            onClick={(e) => { if (v.disabled) e.preventDefault(); }}
            title={v.disabled ? 'Bientôt disponible' : undefined}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              cursor: v.disabled ? 'not-allowed' : 'pointer',
              opacity: v.disabled ? 0.4 : 1,
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

export default function AdminDenseClient({ data }: { data: AdminV2PageData }) {
  // density='normal' hardcoded — toggle viendra avec PR #4 (TweaksPanel)
  const pad = 20;
  const gap = 16;
  const bg = '#1A0F0E';

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBarVariantSwitcher active="C" />
      <div style={{ flex: 1, background: bg, overflowY: 'auto' }}>

      {/* Header ultra-compact */}
      <header style={{
        padding: `${pad}px ${pad + 8}px`,
        borderBottom: '1px solid rgba(232,133,61,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: '#E8853D',
              boxShadow: '0 0 6px rgba(232,133,61,0.8)',
              animation: 'pulse 2s infinite',
              display: 'inline-block',
            }} />
            <Mono color="#E8853D" spacing="0.22em">VUE ADMIN · LIVE · {monthLabel}</Mono>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: 32,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-0.025em',
            color: '#FDF6EE',
            margin: 0,
          }}>
            Notre <span style={{ fontStyle: 'italic', color: '#E8853D' }}>pipeline</span>, {data.adminName}.
          </h1>
        </div>

        {/* KPI inline strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { l: 'LIVE', v: data.kpi.live as number | string, a: undefined as string | undefined },
            { l: '🔥 CHAUDS', v: data.kpi.chauds, a: '#E8853D' },
            { l: 'SIGNÉS', v: data.kpi.signatures, a: '#5A8A3F' },
            { l: 'CA', v: `${(data.kpi.ca / 1000).toFixed(1)}K€`, a: '#5A8A3F' },
          ].map((k) => (
            <div key={k.l} style={{
              background: 'rgba(253,246,238,0.04)',
              border: '1px solid rgba(232,133,61,0.10)',
              borderRadius: 10,
              padding: '8px 14px',
              textAlign: 'center',
              minWidth: 80,
            }}>
              <Mono size={8} color="rgba(232,133,61,0.7)" style={{ display: 'block', marginBottom: 4 }}>{k.l}</Mono>
              <div style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1,
                color: k.a ?? '#FDF6EE',
                fontVariantNumeric: 'tabular-nums',
              }}>{k.v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* 2-col layout */}
      <div style={{
        padding: `${pad}px ${pad + 8}px`,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap,
        alignItems: 'start',
      }}>
        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0 }}>
          <FunnelSection stages={data.funnel} />
          <FormationSection entries={data.formation} />
          <SyncSection commerciaux={data.commerciaux} />
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0 }}>
          <ClassementSection entries={data.classement} commerciaux={data.commerciaux} />
          <PaliersSection commerciaux={data.commerciaux} />

          {/* Activity compact */}
          <div style={{
            background: 'rgba(253,246,238,0.03)',
            border: '1px solid rgba(232,133,61,0.10)',
            borderRadius: 18,
            padding: 16,
          }}>
            <div style={{ marginBottom: 10 }}><Hairline label="ACTIVITÉ RÉCENTE" /></div>
            <ActivityLog logs={data.activity} max={5} />
          </div>

          {/* Commerciaux stacked mini */}
          <div style={{
            background: 'rgba(253,246,238,0.03)',
            border: '1px solid rgba(232,133,61,0.10)',
            borderRadius: 18,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(232,133,61,0.08)' }}>
              <Hairline label="COMMERCIAUX" />
            </div>
            {data.commerciaux.map((c, i) => (
              <div key={c.id} style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: i < data.commerciaux.length - 1 ? '1px solid rgba(232,133,61,0.06)' : 'none',
              }}>
                <Speedo value={c.conversion} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-fraunces)',
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#FDF6EE',
                    letterSpacing: '-0.01em',
                  }}>{c.name}</div>
                  <Mono size={8} color="rgba(253,246,238,0.35)" style={{ display: 'block', marginTop: 2 }}>{c.email}</Mono>
                </div>
                <RocketMini palier={c.palier} total={5} height={60} />
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Mono size={8} color="#E8853D">P{c.palier}/5</Mono>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline pleine largeur en bas */}
      <div style={{ padding: `0 ${pad + 8}px ${pad + 8}px` }}>
        <div style={{ marginBottom: 12 }}><Hairline label="PIPELINE PROSPECTS" /></div>
        <PipelineSection prospects={data.prospects} commerciaux={data.commerciaux} variant="C" />
      </div>
      </div>
    </div>
  );
}


