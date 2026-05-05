'use client';

/**
 * PipelineShared — Composant partagé pour le pipeline admin et le drawer
 * de détail d'un prospect.
 *
 * Avant cette extraction, `PipelineSection` + `ProspectDetailDrawer` +
 * helpers `RichText`/`DrawerSection`/`DrawerField` étaient dupliqués 3× dans
 *   - src/app/(app)/admin/v2/AdminV2Client.tsx     (variante A · cockpit)
 *   - src/app/(app)/admin/dense/AdminDenseClient.tsx (variante C · dense)
 *   - src/app/(app)/admin/japon/AdminJaponClient.tsx (variante G · japon)
 *
 * Le prop `variant: 'A' | 'C' | 'G'` permet de garder les micro-variations
 * de footer (label final dans la barre de pagination) tout en partageant
 * 100% de la structure logique.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Prospect } from '@/lib/prospects';
import type { CommercialV2 } from '../../app/(app)/admin/v2/page';

// ───────────────────────────────────────────────────────────────
// Type local étendu — Prospect ne déclare pas tous les champs
// retournés par PROSPECT_SELECT_COLUMNS, on les ré-expose ici.
// ───────────────────────────────────────────────────────────────
export type ProspectFull = Prospect & {
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

// ───────────────────────────────────────────────────────────────
// Configurations partagées
// ───────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  a_contacter:  { label: 'À contacter',  color: '#8A6D6B', bg: 'rgba(138,109,107,0.12)', border: 'rgba(138,109,107,0.25)' },
  contacte:     { label: 'Contacté',     color: '#5B8AB8', bg: 'rgba(91,138,184,0.12)',  border: 'rgba(91,138,184,0.25)' },
  rdv_pris:     { label: 'RDV pris',     color: '#7B70C4', bg: 'rgba(123,112,196,0.12)', border: 'rgba(123,112,196,0.25)' },
  devis_envoye: { label: 'Devis envoyé', color: '#C49A3C', bg: 'rgba(196,154,60,0.12)',  border: 'rgba(196,154,60,0.25)' },
  gagne:        { label: 'Devis signé',  color: '#5A8A3F', bg: 'rgba(90,138,63,0.12)',   border: 'rgba(90,138,63,0.25)' },
  perdu:        { label: 'Perdu',        color: '#B5421F', bg: 'rgba(181,66,31,0.12)',   border: 'rgba(181,66,31,0.25)' },
  archived:     { label: 'Archivé',      color: '#8A6D6B', bg: 'rgba(138,109,107,0.10)', border: 'rgba(138,109,107,0.20)' },
  prospecte:    { label: 'Prospecté',    color: '#8A6D6B', bg: 'rgba(138,109,107,0.12)', border: 'rgba(138,109,107,0.25)' },
};

export const CLASSIF_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  '🔥 Chaud': { color: '#E8853D', bg: 'rgba(232,133,61,0.12)', border: 'rgba(232,133,61,0.30)' },
  '🌡️ Tiède': { color: '#C49A3C', bg: 'rgba(196,154,60,0.12)', border: 'rgba(196,154,60,0.30)' },
  '❄️ Froid': { color: '#5B8AB8', bg: 'rgba(91,138,184,0.12)', border: 'rgba(91,138,184,0.25)' },
};

// ───────────────────────────────────────────────────────────────
// Helpers visuels (Mono, Hairline, RichText)
// ───────────────────────────────────────────────────────────────
function Mono({ children, size = 9, color = 'rgba(253,246,238,0.4)', spacing = '0.2em', weight = 600, style = {} }: { children: React.ReactNode; size?: number; color?: string; spacing?: string; weight?: number; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontSize: size, fontWeight: weight, textTransform: 'uppercase', letterSpacing: spacing, color, ...style }}>{children}</span>;
}

function Hairline({ label, color = '#E8853D' }: { label: string; color?: string }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-block', width: 24, height: 1, background: color }} /><Mono color={color}>{label}</Mono></div>;
}

/**
 * Rich text renderer — détecte paragraphes (split par \n\n) et listes (lignes
 * commençant par -, •, *, ou "1.", "2."). Sinon rend des paragraphes simples.
 */
export function RichText({ text, font = 'sans' }: { text: string | null | undefined; font?: 'sans' | 'serif' }) {
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

// ───────────────────────────────────────────────────────────────
// Drawer atomic helpers
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
// PipelineSection — table + filtres + pagination + drawer
// ───────────────────────────────────────────────────────────────
type SortKey = 'company_name' | 'classification' | 'status' | 'updated_at';

function variantFooterLabel(variant: 'A' | 'C' | 'G'): string {
  switch (variant) {
    case 'A': return 'GND PIPELINE · ADMIN';
    case 'C': return 'GND PIPELINE · ADMIN · DENSE';
    case 'G': return 'GND PIPELINE · ADMIN · JAPON';
  }
}

export function PipelineSection({
  prospects,
  commerciaux,
  variant = 'A',
  hideSearchPrefilter = false,
}: {
  prospects: Prospect[];
  commerciaux: CommercialV2[];
  variant?: 'A' | 'C' | 'G';
  /** Si true, ignore le ?commercial=… de l'URL (utile pour écrans déjà préfiltrés) */
  hideSearchPrefilter?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCommercial = hideSearchPrefilter ? 'all' : (searchParams.get('commercial') ?? 'all');
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
              <Mono size={8} color="rgba(232,133,61,0.35)">{variantFooterLabel(variant)}</Mono>
            )}
          </div>
        </div>
      </div>
      <ProspectDetailDrawer prospect={detailsProspect} commercial={detailsProspect ? commerciaux.find((c) => c.id === detailsProspect.assigned_to) : undefined} onClose={() => setDetailsProspect(null)} />
    </>
  );
}
