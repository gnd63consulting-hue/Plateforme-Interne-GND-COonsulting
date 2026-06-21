'use client';

import Link from 'next/link';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Flame,
  FolderOpen,
  GripVertical,
  MapPin,
  MoreHorizontal,
  Phone,
  StickyNote,
} from 'lucide-react';
import {
  formatDate,
  labelForStatus,
  type Prospect,
} from '@/lib/prospects';
import {
  PIPELINE_COLUMNS,
  columnById,
  getColumnForStatus,
  type PipelineColumnId,
} from '@/lib/pipeline';
import { evaluateRotting } from '@/lib/rotting';
import { StatusBadge } from '@/components/ui';

/** Colonnes "vivantes" (ordre pipeline) pour la navigation clavier ⬅/➡. */
const LIVE_COLUMN_IDS = PIPELINE_COLUMNS.filter((c) => !c.dead).map((c) => c.id);
const ALL_COLUMN_IDS = PIPELINE_COLUMNS.map((c) => c.id);

/** Nombre de cartes rendues d'emblée par colonne. Le bouton « Afficher plus »
 *  incrémente la limite locale de ce pas. Plafonner le DOM évite le jank sur
 *  les colonnes massives (ex. 556 cartes « À contacter »). */
const PAGE_SIZE = 30;

/** Extrait un montant € à partir de ca_estime (texte libre : "12 000 €",
 *  "12k", "12 000-15 000", "≈ 8000€"). Retourne 0 si rien d'exploitable.
 *  Pour une fourchette, prend la borne basse (prudent). */
function parseCaEstime(raw: string | null): number {
  if (!raw) return 0;
  const lower = raw.toLowerCase();
  // Cherche le premier nombre, en tolérant séparateurs d'espaces/points de milliers.
  const m = lower.match(/(\d[\d .]*\d|\d)\s*(k)?/);
  if (!m) return 0;
  let n = Number(m[1].replace(/[ .]/g, ''));
  if (Number.isNaN(n)) return 0;
  if (m[2] === 'k') n *= 1000;
  return n;
}

const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type ProspectKanbanProps = {
  prospects: Prospect[];
  /** Déplacement d'une carte vers une colonne. Le parent calcule le statut
   *  exact (resolveDropStatus), persiste, log l'activité et gère le rollback. */
  onMoveToColumn: (prospect: Prospect, columnId: PipelineColumnId) => void;
  /** Ouvre la modale notes existante (réutilisée). */
  onOpenNotes: (prospect: Prospect) => void;
};

export default function ProspectKanban({
  prospects,
  onMoveToColumn,
  onOpenNotes,
}: ProspectKanbanProps) {
  const [deadOpen, setDeadOpen] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<PipelineColumnId | null>(null);
  const draggingId = useRef<string | null>(null);
  // Région aria-live : annonce le résultat d'un déplacement (clavier ou souris).
  const [announce, setAnnounce] = useState('');
  // Limite d'affichage par colonne (rendu plafonné, +PAGE_SIZE par clic).
  const [limits, setLimits] = useState<Record<PipelineColumnId, number>>({
    a_contacter: PAGE_SIZE,
    tentative: PAGE_SIZE,
    contact_etabli: PAGE_SIZE,
    en_attente: PAGE_SIZE,
    rdv_devis: PAGE_SIZE,
    gagne: PAGE_SIZE,
    mort: PAGE_SIZE,
  });

  const showMore = useCallback((columnId: PipelineColumnId) => {
    setLimits((prev) => ({ ...prev, [columnId]: prev[columnId] + PAGE_SIZE }));
  }, []);

  // Regroupe les prospects par colonne, une seule passe.
  const byColumn = useMemo(() => {
    const groups: Record<PipelineColumnId, Prospect[]> = {
      a_contacter: [],
      tentative: [],
      contact_etabli: [],
      en_attente: [],
      rdv_devis: [],
      gagne: [],
      mort: [],
    };
    for (const p of prospects) {
      groups[getColumnForStatus(p.status)].push(p);
    }
    return groups;
  }, [prospects]);

  const move = useCallback(
    (prospect: Prospect, columnId: PipelineColumnId) => {
      const from = getColumnForStatus(prospect.status);
      if (from === columnId) return;
      onMoveToColumn(prospect, columnId);
      setAnnounce(
        `${prospect.company_name} déplacé vers « ${columnById(columnId).label} ».`
      );
    },
    [onMoveToColumn]
  );

  // Déplacement clavier : ⬅/➡ entre colonnes vivantes (depuis la carte focus).
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, prospect: Prospect) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const current = getColumnForStatus(prospect.status);
      // Si la carte est dans la colonne morte, on la réinjecte en début de pipeline.
      const idx = LIVE_COLUMN_IDS.indexOf(current as PipelineColumnId);
      if (idx === -1) {
        if (e.key === 'ArrowLeft') move(prospect, LIVE_COLUMN_IDS[0]);
        return;
      }
      const next =
        e.key === 'ArrowRight'
          ? LIVE_COLUMN_IDS[Math.min(LIVE_COLUMN_IDS.length - 1, idx + 1)]
          : LIVE_COLUMN_IDS[Math.max(0, idx - 1)];
      if (next !== current) move(prospect, next);
    },
    [move]
  );

  const liveColumns = PIPELINE_COLUMNS.filter((c) => !c.dead);
  const deadColumn = PIPELINE_COLUMNS.find((c) => c.dead)!;
  const deadCards = byColumn[deadColumn.id];

  return (
    <div>
      {/* aria-live : invisible, annonce chaque déplacement aux lecteurs d'écran */}
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>

      {/* Board borné : hauteur fixe (ne pousse pas la page), scroll horizontal
          fluide pour les colonnes. Chaque colonne scrolle verticalement seule. */}
      <div
        data-lenis-prevent
        className="flex h-[calc(100vh-260px)] min-h-[24rem] gap-4 overflow-x-auto overflow-y-hidden px-0.5 pb-2"
      >
        {liveColumns.map((col) => {
          const cards = byColumn[col.id];
          const total = cards.reduce((s, p) => s + parseCaEstime(p.ca_estime), 0);
          const isOver = dragOverCol === col.id;
          const limit = limits[col.id];
          const visible = cards.length > limit ? cards.slice(0, limit) : cards;
          const remaining = cards.length - visible.length;
          return (
            <section
              key={col.id}
              aria-label={`${col.label} — ${cards.length} prospect${cards.length > 1 ? 's' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={(e) => {
                // Ne réinitialise que si on quitte vraiment la section.
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol((c) => (c === col.id ? null : c));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const id = e.dataTransfer.getData('text/plain') || draggingId.current;
                draggingId.current = null;
                if (!id) return;
                const p = prospects.find((x) => x.id === id);
                if (p) move(p, col.id);
              }}
              className={`panel flex h-full w-[320px] shrink-0 flex-col overflow-hidden !rounded-2xl transition-colors ${
                isOver
                  ? '!bg-brand-pale ring-2 ring-brand-ring'
                  : ''
              }`}
            >
              {/* Entête colonne — sticky en tête du corps scrollable */}
              <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(74,36,26,0.08)] bg-cream/90 px-4 py-3 backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${col.accent}`} aria-hidden />
                  <h3
                    className="truncate font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-choco"
                    title={col.hint}
                  >
                    {col.label}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {total > 0 && (
                    <span
                      className="whitespace-nowrap font-num tabular-nums text-[10px] font-semibold text-brand-burnt"
                      title="CA estimé cumulé (borne basse)"
                    >
                      {eurFmt.format(total)}
                    </span>
                  )}
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center whitespace-nowrap rounded-full bg-brand-pale px-1.5 font-num tabular-nums text-[10px] font-semibold text-brand-burnt">
                    {cards.length}
                  </span>
                </div>
              </header>

              {/* Corps scrollable vertical — chaque colonne défile seule */}
              <ul
                data-lenis-prevent
                className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5"
              >
                {cards.length === 0 ? (
                  <li className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(74,36,26,0.12)] px-3 py-5 text-center font-grotesk text-[10px] uppercase tracking-[0.15em] text-muted-warm/70">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt" aria-hidden>·</span>
                    Vide
                  </li>
                ) : (
                  <>
                    {visible.map((p) => (
                      <KanbanCard
                        key={p.id}
                        prospect={p}
                        onOpenNotes={onOpenNotes}
                        onDragStart={(e) => {
                          draggingId.current = p.id;
                          e.dataTransfer.setData('text/plain', p.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          draggingId.current = null;
                          setDragOverCol(null);
                        }}
                        onKeyDown={(e) => handleCardKeyDown(e, p)}
                        onMove={(colId) => move(p, colId)}
                      />
                    ))}
                    {remaining > 0 && (
                      <li className="list-none">
                        <button
                          type="button"
                          onClick={() => showMore(col.id)}
                          className="w-full rounded-2xl border border-dashed border-[rgba(74,36,26,0.14)] px-3 py-2 text-center font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm"
                        >
                          Afficher plus (<span className="font-num tabular-nums whitespace-nowrap">{remaining}</span> restant{remaining > 1 ? 's' : ''})
                        </button>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Colonne morte / sorties — repliable */}
      <section
        aria-label={`${deadColumn.label} — ${deadCards.length} prospect${deadCards.length > 1 ? 's' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOverCol !== deadColumn.id) setDragOverCol(deadColumn.id);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverCol((c) => (c === deadColumn.id ? null : c));
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverCol(null);
          const id = e.dataTransfer.getData('text/plain') || draggingId.current;
          draggingId.current = null;
          if (!id) return;
          const p = prospects.find((x) => x.id === id);
          if (p) move(p, deadColumn.id);
        }}
        className={`panel mt-4 !rounded-2xl transition-colors ${
          dragOverCol === deadColumn.id
            ? '!bg-danger-bg ring-2 ring-danger-fg/30'
            : ''
        }`}
      >
        <h3>
          <button
            type="button"
            onClick={() => setDeadOpen((o) => !o)}
            aria-expanded={deadOpen}
            className="flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-cream-deep"
          >
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${deadColumn.accent}`} aria-hidden />
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-choco">
                {deadColumn.label}
              </span>
              <span className="font-grotesk text-[10px] text-muted-warm/80">{deadColumn.hint}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center whitespace-nowrap rounded-full bg-brand-pale px-1.5 font-num tabular-nums text-[10px] font-semibold text-brand-burnt">
                {deadCards.length}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-warm transition-transform ${deadOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </span>
          </button>
        </h3>
        {deadOpen && (
          <DeadColumnBody
            cards={deadCards}
            limit={limits[deadColumn.id]}
            onShowMore={() => showMore(deadColumn.id)}
            onOpenNotes={onOpenNotes}
            onDragStartFactory={(p) => (e) => {
              draggingId.current = p.id;
              e.dataTransfer.setData('text/plain', p.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              draggingId.current = null;
              setDragOverCol(null);
            }}
            onCardKeyDown={handleCardKeyDown}
            onMoveFactory={(p) => (colId) => move(p, colId)}
          />
        )}
      </section>
    </div>
  );
}

/* ====================================================================== */
/* Corps de la colonne morte — extrait pour garder le rendu plafonné      */
/* ====================================================================== */

type DeadColumnBodyProps = {
  cards: Prospect[];
  limit: number;
  onShowMore: () => void;
  onOpenNotes: (p: Prospect) => void;
  onDragStartFactory: (p: Prospect) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onCardKeyDown: (e: React.KeyboardEvent, p: Prospect) => void;
  onMoveFactory: (p: Prospect) => (columnId: PipelineColumnId) => void;
};

function DeadColumnBody({
  cards,
  limit,
  onShowMore,
  onOpenNotes,
  onDragStartFactory,
  onDragEnd,
  onCardKeyDown,
  onMoveFactory,
}: DeadColumnBodyProps) {
  const visible = cards.length > limit ? cards.slice(0, limit) : cards;
  const remaining = cards.length - visible.length;
  return (
    <>
      <ul className="grid grid-cols-1 gap-2.5 p-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.length === 0 ? (
          <li className="col-span-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(74,36,26,0.12)] px-3 py-5 text-center font-grotesk text-[10px] uppercase tracking-[0.15em] text-muted-warm/70">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt" aria-hidden>·</span>
            Aucune sortie
          </li>
        ) : (
          visible.map((p) => (
            <KanbanCard
              key={p.id}
              prospect={p}
              onOpenNotes={onOpenNotes}
              onDragStart={onDragStartFactory(p)}
              onDragEnd={onDragEnd}
              onKeyDown={(e) => onCardKeyDown(e, p)}
              onMove={onMoveFactory(p)}
            />
          ))
        )}
      </ul>
      {remaining > 0 && (
        <div className="px-2.5 pb-2.5">
          <button
            type="button"
            onClick={onShowMore}
            className="w-full rounded-2xl border border-dashed border-[rgba(74,36,26,0.14)] px-3 py-2 text-center font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm"
          >
            Afficher plus (<span className="font-num tabular-nums whitespace-nowrap">{remaining}</span> restant{remaining > 1 ? 's' : ''})
          </button>
        </div>
      )}
    </>
  );
}

/* ====================================================================== */
/* Carte — mémoïsée pour éviter le re-render global au drag/scroll         */
/* ====================================================================== */

type KanbanCardProps = {
  prospect: Prospect;
  onOpenNotes: (p: Prospect) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onMove: (columnId: PipelineColumnId) => void;
};

const KanbanCard = memo(function KanbanCard({
  prospect: p,
  onOpenNotes,
  onDragStart,
  onDragEnd,
  onKeyDown,
  onMove,
}: KanbanCardProps) {
  const rot = evaluateRotting(p);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHot =
    !!p.classification && /chaud|hot|🔥|prioritaire/i.test(p.classification);

  return (
    <li className="list-none">
      {/* Carte draggable : <div> HTML natif pour le DnD HTML5
          (onDragStart/onDragEnd natifs). Plus aucune animation framer-motion
          par carte — rendre 500+ cartes animées provoquait le jank. */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${p.company_name}${isHot ? ' — prioritaire' : ''}. Statut ${labelForStatus(p.status)}.${rot.rotten ? ' ' + rot.reason + '.' : ''} Entrée pour ouvrir les notes, flèches gauche/droite pour déplacer.`}
        onClick={() => onOpenNotes(p)}
        onKeyDownCapture={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onOpenNotes(p);
          }
        }}
        className={`panel card-hover group relative w-full cursor-grab !rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-ring active:cursor-grabbing ${
          rot.rotten ? 'border-l-[3px] border-l-brand' : ''
        }`}
      >
        {/* Liseré rotting : point orange + tooltip */}
        {rot.rotten && (
          <span
            className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand"
            title={rot.reason ?? undefined}
            aria-hidden
          />
        )}

        <div className="flex items-start gap-2.5">
          <GripVertical
            className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-warm/50 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pale font-grotesk text-xs font-semibold uppercase text-brand-burnt"
            aria-hidden
          >
            {p.company_name?.trim().slice(0, 2) || '··'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isHot && (
                <Flame className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Prospect prioritaire" />
              )}
              <p className="truncate font-medium text-choco">
                {p.company_name}
              </p>
            </div>
            {(p.contact_name || p.role_contact || p.city) && (
              <p className="mt-0.5 truncate text-xs text-[#6F5A50]">
                {p.contact_name}
                {p.contact_name && p.city && ' · '}
                {p.city}
                {p.role_contact && (
                  <span className="text-muted-warm/80"> · {p.role_contact}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Badge statut + valeur */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={p.status} size="sm" />
          {p.ca_estime && (
            <span className="truncate whitespace-nowrap font-num tabular-nums text-[10px] font-semibold text-brand-burnt" title="CA estimé">
              {p.ca_estime}
            </span>
          )}
        </div>

        {/* Méta : téléphone, adresse, relance */}
        <div className="mt-2.5 flex flex-col gap-1.5">
          {p.phone && (
            <span className="inline-flex items-center gap-1.5 truncate text-[11px] text-[#6F5A50]">
              <Phone className="h-3 w-3 shrink-0 text-muted-warm/70" aria-hidden />
              <span className="truncate whitespace-nowrap font-num tabular-nums">{p.phone}</span>
            </span>
          )}
          {(p.address || p.city) && (
            <span className="inline-flex items-center gap-1.5 truncate text-[11px] text-[#6F5A50]">
              <MapPin className="h-3 w-3 shrink-0 text-muted-warm/70" aria-hidden />
              <span className="truncate">{p.address ?? p.city}</span>
            </span>
          )}
          {p.next_action_at && (
            <span
              className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-grotesk text-[9px] font-semibold uppercase tracking-[0.1em] ${
                rot.overdue
                  ? 'bg-danger-bg text-danger-fg'
                  : 'bg-brand-soft text-brand-burnt'
              }`}
            >
              ⏰ Relance <span className="font-num tabular-nums">{formatDate(p.next_action_at)}</span>
            </span>
          )}
        </div>

        {/* Actions : notes + ouvrir la fiche + déplacer (alternatif au drag) */}
        <div className="mt-2.5 flex items-center justify-between border-t border-[rgba(74,36,26,0.08)] pt-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotes(p);
              }}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[10px] font-semibold text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm"
            >
              <StickyNote className="h-3.5 w-3.5" aria-hidden />
              Notes
            </button>
            <Link
              href={`/prospects/${p.id}`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Ouvrir la fiche de ${p.company_name}`}
              title="Ouvrir la fiche 360"
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[10px] font-semibold text-brand-dark transition-colors hover:bg-brand-soft"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              Fiche
            </Link>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Déplacer vers une autre colonne"
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-semibold text-brand-dark transition-colors hover:bg-brand-soft"
            >
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
            </button>
            {menuOpen && (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="panel absolute bottom-full right-0 z-20 mb-1 w-48 overflow-hidden !rounded-xl py-1 shadow-soft-lg"
              >
                {ALL_COLUMN_IDS.map((cid) => {
                  const c = columnById(cid);
                  const isCurrent = getColumnForStatus(p.status) === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      role="menuitem"
                      disabled={isCurrent}
                      onClick={() => {
                        setMenuOpen(false);
                        if (!isCurrent) onMove(cid);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                        isCurrent
                          ? 'cursor-default text-muted-warm/70'
                          : 'text-ink-warm hover:bg-brand-soft'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.accent}`} aria-hidden />
                      {c.label}
                      {isCurrent && <span className="ml-auto text-[9px] uppercase">actuel</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
});
