'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Prospect } from '@/lib/prospects';
import type {
  AdminV2PageData,
  CommercialV2,
} from '../v2/page';

// Type local étendu — Prospect ne déclare pas tous les champs Notion mais
// ils sont bien retournés par Supabase via PROSPECT_SELECT_COLUMNS.
type ProspectFull = Prospect & {
  secteur_activite?: string | null;
  taille_entreprise?: string | null;
  nombre_employes?: number | null;
  ca_estime?: string | null;
  branche?: string | null;
  note_google?: number | null;
  nombre_avis?: number | null;
  recommandation_approche?: string | null;
  analyse_besoin?: string | null;
  analyse_budget?: string | null;
  analyse_timing?: string | null;
  arguments_cles?: string[] | null;
  besoins_detectes?: string[] | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin_contact?: string | null;
  linkedin_entreprise?: string | null;
  tiktok?: string | null;
  prenom_contact?: string | null;
  role_contact?: string | null;
  notion_page_id?: string | null;
};

const PALIERS_BONUS = [
  { niveau: 1, label: 'Bronze',       icon: '🥉', signatures: 1,  bonus: 200,  color: '#A0735C' },
  { niveau: 2, label: 'Argent',       icon: '🥈', signatures: 3,  bonus: 500,  color: '#8A9DB5' },
  { niveau: 3, label: 'Or',           icon: '🥇', signatures: 5,  bonus: 1000, color: '#C49A3C' },
  { niveau: 4, label: 'Platine',      icon: '💎', signatures: 8,  bonus: 2500, color: '#7B70C4' },
  { niveau: 5, label: 'Stratosphère', icon: '🚀', signatures: 12, bonus: 5000, color: '#E8853D' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  a_contacter:  { label: 'À contacter',  color: '#8A6D6B', bg: 'rgba(138,109,107,0.12)', border: 'rgba(138,109,107,0.25)' },
  contacte:     { label: 'Contacté',     color: '#5B8AB8', bg: 'rgba(91,138,184,0.12)',  border: 'rgba(91,138,184,0.25)' },
  rdv_pris:     { label: 'RDV pris',     color: '#7B70C4', bg: 'rgba(123,112,196,0.12)', border: 'rgba(123,112,196,0.25)' },
  devis_envoye: { label: 'Devis envoyé', color: '#C49A3C', bg: 'rgba(196,154,60,0.12)',  border: 'rgba(196,154,60,0.25)' },
  gagne:        { label: 'Devis signé',  color: '#5A8A3F', bg: 'rgba(90,138,63,0.12)',   border: 'rgba(90,138,63,0.25)' },
  perdu:        { label: 'Perdu',        color: '#B5421F', bg: 'rgba(181,66,31,0.12)',   border: 'rgba(181,66,31,0.25)' },
  archived:     { label: 'Archivé',      color: '#8A6D6B', bg: 'rgba(138,109,107,0.10)', border: 'rgba(138,109,107,0.20)' },
  prospecte:    { label: 'Prospecté',    color: '#8A6D6B', bg: 'rgba(138,109,107,0.12)', border: 'rgba(138,109,107,0.25)' },
};

const CLASSIF_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  '🔥 Chaud': { color: '#E8853D', bg: 'rgba(232,133,61,0.12)', border: 'rgba(232,133,61,0.30)' },
  '🌡️ Tiède': { color: '#C49A3C', bg: 'rgba(196,154,60,0.12)', border: 'rgba(196,154,60,0.30)' },
  '❄️ Froid': { color: '#5B8AB8', bg: 'rgba(91,138,184,0.12)', border: 'rgba(91,138,184,0.25)' },
};

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

// Rich text renderer — détecte paragraphes (split par \n\n) et listes (lignes
// commençant par -, •, *, ou "1.", "2."). Sinon rend des paragraphes simples.
function RichText({ text, font = 'sans' }: { text: string | null | undefined; font?: 'sans' | 'serif' }) {
  if (!text) return null;
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const bulletRx = /^[-•*▪◦·]\s+|^\d+\.\s+/;
  const baseFont = font === 'serif' ? 'var(--font-fraunces)' : 'var(--font-geist-sans)';
  const baseSize = font === 'serif' ? 14 : 12;
  const baseColor = font === 'serif' ? 'rgba(253,246,238,0.85)' : 'rgba(253,246,238,0.78)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {blocks.map((block, idx) => {
        const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
        const isList = lines.length >= 2 && lines.every((l) => bulletRx.test(l));
        if (isList) {
          return (
            <ul key={idx} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lines.map((line, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontFamily: baseFont, fontSize: baseSize, lineHeight: 1.5, color: baseColor }}>
                  <span style={{ color: '#E8853D', flexShrink: 0, marginTop: 6, fontSize: 6, lineHeight: 1 }}>●</span>
                  <span style={{ flex: 1 }}>{line.replace(bulletRx, '')}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} style={{ margin: 0, fontFamily: baseFont, fontSize: baseSize, lineHeight: 1.55, color: baseColor }}>
            {block.split(/\n/).map((l, i, arr) => (
              <span key={i}>{l}{i < arr.length - 1 && <br />}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
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
// Drawer (réutilisé à l'identique de AdminDenseClient)
// ───────────────────────────────────────────────────────────────
function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ marginBottom: 10 }}><Hairline label={label} /></div>
      <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(232,133,61,0.08)', borderRadius: 12, padding: '12px 14px' }}>{children}</div>
    </div>
  );
}

function DrawerField({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0' }}>
      <Mono size={8} color="rgba(253,246,238,0.4)" style={{ minWidth: 100, textTransform: 'uppercase' }}>{k}</Mono>
      <div style={{ flex: 1, fontFamily: 'var(--font-geist-sans)', fontSize: 12, color: 'rgba(253,246,238,0.8)', wordBreak: 'break-word' }}>{v ?? <span style={{ color: 'rgba(253,246,238,0.25)' }}>—</span>}</div>
    </div>
  );
}

function ProspectDetailDrawer({ prospect, commercial, onClose }: { prospect: Prospect | null; commercial?: CommercialV2; onClose: () => void }) {
  useEffect(() => {
    if (!prospect) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [prospect, onClose]);
  if (!prospect) return null;
  const p = prospect as ProspectFull;
  const classifCfg = p.classification ? CLASSIF_CONFIG[p.classification] : null;
  const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.a_contacter;
  const fullName = [p.prenom_contact, p.contact_name].filter(Boolean).join(' ') || '—';
  const args = p.arguments_cles ?? null;
  const besoins = p.besoins_detectes ?? null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }} data-lenis-prevent>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 520, background: 'linear-gradient(135deg,#1A0F0E,#0E0807)', borderLeft: '1px solid rgba(232,133,61,0.20)', overflowY: 'auto', padding: 28, boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }} data-lenis-prevent>
        <button onClick={onClose} style={{ position: 'sticky', top: 0, float: 'right', background: 'rgba(232,133,61,0.10)', border: '1px solid rgba(232,133,61,0.25)', borderRadius: 8, padding: '5px 11px', color: '#E8853D', cursor: 'pointer', fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', zIndex: 1 }}>FERMER · ESC</button>
        <div style={{ marginBottom: 24 }}>
          <Mono color="#E8853D" spacing="0.22em" style={{ display: 'block', marginBottom: 8 }}>FICHE PROSPECT</Mono>
          <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 30, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#FDF6EE', margin: '0 0 6px' }}>{p.company_name}</h2>
          <Mono size={9} color="rgba(253,246,238,0.4)" spacing="0.15em" style={{ display: 'block', marginBottom: 10 }}>{p.city ?? '—'}{p.postal_code ? ` · ${p.postal_code}` : ''}{p.secteur_activite ? ` · ${p.secteur_activite}` : ''}</Mono>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {classifCfg && <span style={{ padding: '3px 8px', borderRadius: 999, background: classifCfg.bg, color: classifCfg.color, border: `1px solid ${classifCfg.border}`, fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{p.classification}</span>}
            <span style={{ padding: '3px 8px', borderRadius: 999, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{statusCfg.label}</span>
            {p.branche && <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(232,133,61,0.08)', color: '#E8853D', border: '1px solid rgba(232,133,61,0.20)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{p.branche}</span>}
          </div>
          {p.notion_page_id && (
            <a href={`https://www.notion.so/${p.notion_page_id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontFamily: 'var(--font-geist-mono)', fontSize: 9, color: '#E8853D', textDecoration: 'none', borderBottom: '1px solid rgba(232,133,61,0.30)', paddingBottom: 1, letterSpacing: '0.12em', textTransform: 'uppercase' }}>↗ OUVRIR SUR NOTION</a>
          )}
        </div>

        <DrawerSection label="DÉCISIONNAIRE">
          <DrawerField k="NOM" v={fullName} />
          <DrawerField k="RÔLE" v={p.role_contact} />
          <DrawerField k="EMAIL" v={p.email ? <a href={`mailto:${p.email}`} style={{ color: '#FFA060', textDecoration: 'none' }}>{p.email}</a> : null} />
          <DrawerField k="TÉLÉPHONE" v={p.phone ? <a href={`tel:${p.phone}`} style={{ color: '#FFA060', textDecoration: 'none' }}>{p.phone}</a> : null} />
          <DrawerField k="LINKEDIN" v={p.linkedin_contact ? <a href={p.linkedin_contact} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA060', textDecoration: 'none' }}>Profil →</a> : null} />
        </DrawerSection>

        <DrawerSection label="ENTREPRISE">
          <DrawerField k="ADRESSE" v={p.address ?? p.city} />
          <DrawerField k="SITE WEB" v={p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA060', textDecoration: 'none' }}>{p.website}</a> : null} />
          <DrawerField k="TAILLE" v={p.taille_entreprise} />
          <DrawerField k="EMPLOYÉS" v={p.nombre_employes} />
          <DrawerField k="CA ESTIMÉ" v={p.ca_estime} />
          <DrawerField k="NOTE GOOGLE" v={p.note_google ? `${p.note_google}/5${p.nombre_avis ? ` · ${p.nombre_avis} avis` : ''}` : null} />
        </DrawerSection>

        <DrawerSection label="RÉSEAUX SOCIAUX">
          <DrawerField k="INSTAGRAM" v={p.instagram ? <a href={p.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA060', textDecoration: 'none' }}>Voir →</a> : null} />
          <DrawerField k="FACEBOOK" v={p.facebook ? <a href={p.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA060', textDecoration: 'none' }}>Voir →</a> : null} />
          <DrawerField k="LINKEDIN" v={p.linkedin_entreprise ? <a href={p.linkedin_entreprise} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA060', textDecoration: 'none' }}>Voir →</a> : null} />
          <DrawerField k="TIKTOK" v={p.tiktok ? <a href={p.tiktok} target="_blank" rel="noopener noreferrer" style={{ color: '#FFA060', textDecoration: 'none' }}>Voir →</a> : null} />
        </DrawerSection>

        {p.recommandation_approche && (
          <DrawerSection label="RECOMMANDATION D'APPROCHE">
            <RichText text={p.recommandation_approche} font="serif" />
          </DrawerSection>
        )}

        {(p.analyse_besoin || p.analyse_budget || p.analyse_timing) && (
          <DrawerSection label="ANALYSES">
            {p.analyse_besoin && <div style={{ marginBottom: 10 }}><Mono size={8} color="#E8853D" spacing="0.18em" style={{ display: 'block', marginBottom: 4 }}>BESOIN</Mono><RichText text={p.analyse_besoin} /></div>}
            {p.analyse_budget && <div style={{ marginBottom: 10 }}><Mono size={8} color="#E8853D" spacing="0.18em" style={{ display: 'block', marginBottom: 4 }}>BUDGET</Mono><RichText text={p.analyse_budget} /></div>}
            {p.analyse_timing && <div><Mono size={8} color="#E8853D" spacing="0.18em" style={{ display: 'block', marginBottom: 4 }}>TIMING</Mono><RichText text={p.analyse_timing} /></div>}
          </DrawerSection>
        )}

        {(args && args.length > 0) || (besoins && besoins.length > 0) ? (
          <DrawerSection label="QUALIFICATION">
            {args && args.length > 0 && <div style={{ marginBottom: 10 }}><Mono size={8} color="rgba(253,246,238,0.4)" style={{ display: 'block', marginBottom: 6 }}>ARGUMENTS CLÉS</Mono><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{args.map((a) => <span key={a} style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(232,133,61,0.10)', color: '#E8853D', border: '1px solid rgba(232,133,61,0.22)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{a}</span>)}</div></div>}
            {besoins && besoins.length > 0 && <div><Mono size={8} color="rgba(253,246,238,0.4)" style={{ display: 'block', marginBottom: 6 }}>BESOINS DÉTECTÉS</Mono><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{besoins.map((b) => <span key={b} style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(160,115,92,0.10)', color: '#A0735C', border: '1px solid rgba(160,115,92,0.22)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{b}</span>)}</div></div>}
          </DrawerSection>
        ) : null}

        {commercial && (
          <DrawerSection label="ASSIGNATION">
            <DrawerField k="COMMERCIAL" v={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 22, height: 22, borderRadius: 999, background: 'linear-gradient(135deg,rgba(232,133,61,0.25),rgba(196,154,60,0.15))', border: '1px solid rgba(232,133,61,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: 9, fontWeight: 600, color: '#E8853D' }}>{commercial.initials}</span>{commercial.name}</span>} />
            <DrawerField k="EMAIL COM" v={commercial.email} />
          </DrawerSection>
        )}

        {p.notes && (
          <DrawerSection label="NOTES INTERNES">
            <RichText text={p.notes} />
          </DrawerSection>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// PipelineSection (réutilisé de AdminDenseClient — drawer, filtres, pagination, réassigner)
// ───────────────────────────────────────────────────────────────
type SortKey = 'company_name' | 'classification' | 'status' | 'updated_at';

function PipelineSection({ prospects, commerciaux }: { prospects: Prospect[]; commerciaux: CommercialV2[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCommercial = searchParams.get('commercial') ?? 'all';
  const [filterCommercial, setFilterCommercial] = useState(initialCommercial);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortCol, setSortCol] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [reassignOpen, setReassignOpen] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [detailsProspect, setDetailsProspect] = useState<Prospect | null>(null);

  useEffect(() => { setCurrentPage(1); }, [filterCommercial, filterStatus, showArchived, pageSize]);

  const handleSort = (col: SortKey) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleReassign = async (prospectId: string, newCommercialId: string | null) => {
    if (reassigning) return;
    setReassigning(prospectId);
    try {
      const res = await fetch('/api/admin/reassign-prospect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prospect_id: prospectId, new_assigned_to: newCommercialId }) });
      if (res.ok) router.refresh();
      else { const err = await res.json().catch(() => ({})); alert(`Erreur réassignation : ${err.error ?? res.statusText}`); }
    } catch (e) { alert(`Erreur réseau : ${e instanceof Error ? e.message : 'inconnue'}`); }
    finally { setReassigning(null); setReassignOpen(null); }
  };

  const filtered = useMemo(() => prospects.filter((p) => {
    if (!showArchived && p.status === 'archived') return false;
    if (filterCommercial !== 'all' && p.assigned_to !== filterCommercial) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  }), [prospects, filterCommercial, filterStatus, showArchived]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let va: string | number = '', vb: string | number = '';
    if (sortCol === 'updated_at') { va = a.updated_at ?? ''; vb = b.updated_at ?? ''; }
    else { va = ((a as unknown as Record<string, unknown>)[sortCol] as string) ?? ''; vb = ((b as unknown as Record<string, unknown>)[sortCol] as string) ?? ''; }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    const d = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? d : -d;
  }), [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const showPagination = sorted.length > pageSize;

  const cols: { key: SortKey | string; label: string; sortable: boolean }[] = [
    { key: 'company_name', label: 'PROSPECT', sortable: true },
    { key: 'score', label: 'SCORE', sortable: false },
    { key: 'classification', label: 'CLASSIF.', sortable: true },
    { key: 'status', label: 'STATUT', sortable: true },
    { key: 'decisionnaire', label: 'DÉCISIONNAIRE', sortable: false },
    { key: 'commercial', label: 'COMMERCIAL', sortable: false },
    { key: 'updated_at', label: 'PROCHAINE ACTION', sortable: true },
  ];

  const formatRel = (iso: string | null) => {
    if (!iso) return '—';
    const d = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
    if (d === 0) return "Aujourd'hui";
    if (d === 1) return 'Demain';
    if (d === -1) return 'Hier';
    if (d > 0) return `Dans ${d} j`;
    return `Il y a ${Math.abs(d)} j`;
  };

  const scoreOf = (p: Prospect): number => {
    if (p.classification === '🔥 Chaud') return 9;
    if (p.classification === '🌡️ Tiède') return 7;
    if (p.classification === '❄️ Froid') return 4;
    return 5;
  };

  const buildPageList = (): (number | 'dots')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const list: (number | 'dots')[] = [1];
    if (safePage > 4) list.push('dots');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) list.push(i);
    if (safePage < totalPages - 3) list.push('dots');
    list.push(totalPages);
    return list;
  };

  return (
    <>
      <div id="pipeline-section" style={{ background: 'rgba(253,246,238,0.03)', border: '1px solid rgba(232,133,61,0.10)', borderRadius: 18, overflow: 'visible', scrollMarginTop: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(232,133,61,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Hairline label="PIPELINE PROSPECTS" />
            <Mono size={9} color="rgba(253,246,238,0.4)">{filtered.filter((p) => p.status !== 'archived').length} ACTIFS / {prospects.length} TOTAL</Mono>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Mono size={8} color="rgba(253,246,238,0.4)" style={{ marginRight: 4 }}>COMMERCIAL :</Mono>
            {[{ id: 'all', label: 'Tous' }, ...commerciaux.map((c) => ({ id: c.id, label: c.name.split(' ')[0] }))].map((opt) => (
              <button key={opt.id} onClick={() => setFilterCommercial(opt.id)} style={{ padding: '3px 9px', borderRadius: 8, cursor: 'pointer', background: filterCommercial === opt.id ? 'rgba(232,133,61,0.15)' : 'transparent', border: `1px solid ${filterCommercial === opt.id ? 'rgba(232,133,61,0.30)' : 'rgba(232,133,61,0.10)'}`, color: filterCommercial === opt.id ? '#E8853D' : 'rgba(253,246,238,0.4)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{opt.label}</button>
            ))}
            <span style={{ width: 1, height: 14, background: 'rgba(232,133,61,0.10)', margin: '0 4px' }} />
            <Mono size={8} color="rgba(253,246,238,0.4)" style={{ marginRight: 4 }}>STATUT :</Mono>
            {[{ id: 'all', label: 'Tous' }, { id: 'a_contacter', label: 'À contacter' }, { id: 'contacte', label: 'Contacté' }, { id: 'rdv_pris', label: 'RDV' }, { id: 'devis_envoye', label: 'Devis' }, { id: 'gagne', label: 'Signé' }].map((opt) => (
              <button key={opt.id} onClick={() => setFilterStatus(opt.id)} style={{ padding: '3px 9px', borderRadius: 8, cursor: 'pointer', background: filterStatus === opt.id ? 'rgba(232,133,61,0.15)' : 'transparent', border: `1px solid ${filterStatus === opt.id ? 'rgba(232,133,61,0.30)' : 'rgba(232,133,61,0.10)'}`, color: filterStatus === opt.id ? '#E8853D' : 'rgba(253,246,238,0.4)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{opt.label}</button>
            ))}
            <button onClick={() => setShowArchived((v) => !v)} style={{ padding: '3px 9px', borderRadius: 8, cursor: 'pointer', marginLeft: 'auto', background: showArchived ? 'rgba(107,107,107,0.15)' : 'transparent', border: `1px solid ${showArchived ? 'rgba(107,107,107,0.30)' : 'rgba(232,133,61,0.10)'}`, color: showArchived ? '#8A8A8A' : 'rgba(253,246,238,0.4)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{showArchived ? '⊙' : '○'} Archivés</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
            <thead>
              <tr style={{ background: 'rgba(26,15,14,0.95)' }}>
                {cols.map((c) => (
                  <th key={c.key} onClick={() => c.sortable && handleSort(c.key as SortKey)} style={{ padding: '11px 14px', textAlign: 'left', cursor: c.sortable ? 'pointer' : 'default', userSelect: 'none', fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', whiteSpace: 'nowrap', color: sortCol === c.key ? '#E8853D' : 'rgba(253,246,238,0.4)', borderBottom: `1px solid ${sortCol === c.key ? 'rgba(232,133,61,0.25)' : 'rgba(232,133,61,0.10)'}` }}>{c.label} {c.sortable && sortCol === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                ))}
                <th style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(253,246,238,0.4)', borderBottom: '1px solid rgba(232,133,61,0.10)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p, i) => {
                const pf = p as ProspectFull;
                const isArchived = p.status === 'archived';
                const commercial = commerciaux.find((c) => c.id === p.assigned_to);
                const classifCfg = p.classification ? CLASSIF_CONFIG[p.classification] : null;
                const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.a_contacter;
                const score = scoreOf(p);
                const isReassigning = reassigning === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(232,133,61,0.05)', opacity: isArchived ? 0.45 : 1, background: i % 2 === 0 ? 'transparent' : 'rgba(253,246,238,0.008)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 13, fontWeight: 500, color: '#FDF6EE', letterSpacing: '-0.01em' }}>{p.company_name}</div>
                      <Mono size={8} color="rgba(253,246,238,0.38)" spacing="0.13em" style={{ display: 'block', marginTop: 2 }}>{p.city ?? '—'}{p.postal_code ? ` · ${p.postal_code}` : ''}</Mono>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1, background: score >= 8 ? 'rgba(232,133,61,0.12)' : score >= 6 ? 'rgba(196,154,60,0.10)' : 'rgba(138,109,107,0.10)', borderRadius: 7, padding: '3px 7px' }}>
                        <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: 15, fontWeight: 500, color: score >= 8 ? '#E8853D' : score >= 6 ? '#C49A3C' : '#8A6D6B', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
                        <Mono size={8} color="rgba(253,246,238,0.4)">/10</Mono>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{classifCfg && <span style={{ padding: '3px 8px', borderRadius: 999, background: classifCfg.bg, color: classifCfg.color, border: `1px solid ${classifCfg.border}`, fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{p.classification}</span>}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ padding: '3px 8px', borderRadius: 999, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{statusCfg.label}</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 12, color: '#FDF6EE' }}>{pf.prenom_contact || p.contact_name || '—'}</div>
                      {pf.role_contact && <Mono size={8} color="rgba(253,246,238,0.38)" spacing="0.12em" style={{ display: 'block', marginTop: 2 }}>{pf.role_contact}</Mono>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {commercial ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 999, background: 'linear-gradient(135deg,rgba(232,133,61,0.25),rgba(196,154,60,0.15))', border: '1px solid rgba(232,133,61,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces)', fontSize: 9, fontWeight: 600, color: '#E8853D' }}>{commercial.initials}</div>
                          <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: 11, color: 'rgba(253,246,238,0.4)' }}>{commercial.name.split(' ')[0]}</span>
                        </div>
                      ) : <Mono size={8} color="rgba(253,246,238,0.25)">— non assigné</Mono>}
                    </td>
                    <td style={{ padding: '10px 14px' }}><Mono size={9} color="rgba(253,246,238,0.4)" spacing="0.11em">{formatRel(p.updated_at ?? null)}</Mono></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => setDetailsProspect(p)} title="Voir la fiche prospect" aria-label="Voir la fiche prospect" style={{ padding: '4px 7px', borderRadius: 8, cursor: 'pointer', background: 'rgba(232,133,61,0.10)', border: '1px solid rgba(232,133,61,0.22)', color: '#E8853D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                        </button>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button onClick={() => setReassignOpen(reassignOpen === p.id ? null : p.id)} disabled={isReassigning} style={{ padding: '4px 9px', borderRadius: 8, cursor: isReassigning ? 'wait' : 'pointer', background: 'rgba(91,138,184,0.10)', border: '1px solid rgba(91,138,184,0.22)', color: '#5B8AB8', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{isReassigning ? '…' : 'Réassigner ↓'}</button>
                          {reassignOpen === p.id && !isReassigning && (
                            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 30, background: '#1A0F0E', border: '1px solid rgba(232,133,61,0.22)', borderRadius: 10, overflow: 'hidden', minWidth: 130, boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
                              {commerciaux.map((c) => (
                                <button key={c.id} onClick={() => handleReassign(p.id, c.id)} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: p.assigned_to === c.id ? 'rgba(232,133,61,0.08)' : 'transparent', border: 'none', cursor: 'pointer', color: p.assigned_to === c.id ? '#E8853D' : '#FDF6EE', fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.13em' }}>{c.name.split(' ')[0]} {p.assigned_to === c.id ? '✓' : ''}</button>
                              ))}
                              {p.assigned_to && <button onClick={() => handleReassign(p.id, null)} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderTop: '1px solid rgba(232,133,61,0.10)', cursor: 'pointer', color: 'rgba(253,246,238,0.5)', fontFamily: 'var(--font-geist-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.13em' }}>— Désassigner</button>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(232,133,61,0.10)', background: 'rgba(26,15,14,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Mono size={8} color="rgba(253,246,238,0.4)">{sorted.filter((p) => p.status !== 'archived').length} ACTIFS / {sorted.length} AFFICHÉS / {prospects.length} TOTAL</Mono>
            {showPagination ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Mono size={8} color="rgba(253,246,238,0.4)" style={{ marginRight: 4 }}>PAR PAGE :</Mono>
                {[20, 50, 100].map((sz) => <button key={sz} onClick={() => setPageSize(sz)} style={{ padding: '3px 8px', borderRadius: 6, cursor: 'pointer', background: pageSize === sz ? 'rgba(232,133,61,0.15)' : 'transparent', border: `1px solid ${pageSize === sz ? 'rgba(232,133,61,0.30)' : 'rgba(232,133,61,0.10)'}`, color: pageSize === sz ? '#E8853D' : 'rgba(253,246,238,0.4)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, letterSpacing: '0.12em' }}>{sz}</button>)}
                <span style={{ width: 1, height: 12, background: 'rgba(232,133,61,0.15)', margin: '0 6px' }} />
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ padding: '3px 8px', borderRadius: 6, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', background: 'transparent', border: '1px solid rgba(232,133,61,0.10)', color: safePage <= 1 ? 'rgba(253,246,238,0.2)' : 'rgba(253,246,238,0.6)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600 }}>← PRÉC.</button>
                {buildPageList().map((p, idx) => p === 'dots' ? <span key={`d-${idx}`} style={{ padding: '0 4px', color: 'rgba(253,246,238,0.3)', fontFamily: 'var(--font-geist-mono)', fontSize: 8 }}>…</span> : <button key={p} onClick={() => setCurrentPage(p)} style={{ padding: '3px 8px', borderRadius: 6, cursor: 'pointer', background: safePage === p ? 'rgba(232,133,61,0.15)' : 'transparent', border: `1px solid ${safePage === p ? 'rgba(232,133,61,0.30)' : 'rgba(232,133,61,0.10)'}`, color: safePage === p ? '#E8853D' : 'rgba(253,246,238,0.4)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600, minWidth: 22 }}>{p}</button>)}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ padding: '3px 8px', borderRadius: 6, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', background: 'transparent', border: '1px solid rgba(232,133,61,0.10)', color: safePage >= totalPages ? 'rgba(253,246,238,0.2)' : 'rgba(253,246,238,0.6)', fontFamily: 'var(--font-geist-mono)', fontSize: 8, fontWeight: 600 }}>SUIV. →</button>
                <span style={{ width: 1, height: 12, background: 'rgba(232,133,61,0.15)', margin: '0 6px' }} />
                <Mono size={8} color="rgba(232,133,61,0.5)">PAGE {safePage} / {totalPages}</Mono>
              </div>
            ) : (
              <Mono size={8} color="rgba(232,133,61,0.35)">GND PIPELINE · ADMIN · JAPON</Mono>
            )}
          </div>
        </div>
      </div>
      <ProspectDetailDrawer prospect={detailsProspect} commercial={detailsProspect ? commerciaux.find((c) => c.id === detailsProspect.assigned_to) : undefined} onClose={() => setDetailsProspect(null)} />
    </>
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
            <PipelineSection prospects={data.prospects} commerciaux={data.commerciaux} />
          </div>

        </div>
      </div>
    </div>
  );
}
