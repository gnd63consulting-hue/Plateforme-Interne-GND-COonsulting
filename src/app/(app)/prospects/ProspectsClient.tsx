'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Filter,
  FolderOpen,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  formatDate,
  labelForStatus,
  STATUS_OPTIONS,
  type Prospect,
} from '@/lib/prospects';
import { pastelClassesForStatus } from '@/lib/status-tone';
import { phoneKey9 } from '@/lib/dedup';
import { insertActivityRow } from '@/lib/activities';
import { resolveDropStatus, type PipelineColumnId } from '@/lib/pipeline';
import ProspectModal, { type ProspectFormValues } from '@/components/ProspectModal';
import ProspectDetailsModal from '@/components/ProspectDetailsModal';
import ProspectTimeline from '@/components/ProspectTimeline';
import ProspectKanban from '@/components/ProspectKanban';
import { SectionHeader, StatCard, Button, Avatar } from '@/components/ui';

type ProspectsClientProps = {
  initialProspects: Prospect[];
  currentUserId: string;
  firstName: string;
};

type ViewMode = 'table' | 'kanban';
const VIEW_STORAGE_KEY = 'gnd:prospects:view';

/** Statuts qui appellent une date de relance (on propose d'en poser une). */
const FOLLOWUP_STATUSES = new Set([
  'a_rappeler',
  'en_attente_retour',
  'a_recontacter',
]);

/** ISO → 'yyyy-mm-ddThh:mm' (heure locale) pour un <input type="datetime-local">. */
function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Décale en heure locale pour que la valeur affichée corresponde au fuseau
  // du commercial (toISOString() renverrait l'UTC).
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/** 'yyyy-mm-ddThh:mm' (heure locale saisie) → ISO UTC, ou null si vide. */
function dateTimeInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value); // interprété en heure locale
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Normalise un email comme la colonne générée email_norm (migration 0013). */
function normEmail(email: string): string | null {
  const v = email.trim().toLowerCase();
  return v || null;
}

export default function ProspectsClient({
  initialProspects,
  currentUserId,
  firstName,
}: ProspectsClientProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [view, setView] = useState<ViewMode>('table');
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [viewing, setViewing] = useState<Prospect | null>(null);
  const [notesFor, setNotesFor] = useState<Prospect | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [relanceDraft, setRelanceDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Avertissement non bloquant : l'écriture prospect a réussi mais la trace
  // d'historique (activité) a échoué. Affiché via aria-live, sans bloquer.
  const [traceWarn, setTraceWarn] = useState<string | null>(null);
  // Alerte anti-doublon non bloquante : payload en attente + libellé du match.
  const [dupWarn, setDupWarn] = useState<{
    payload: Record<string, unknown>;
    match: string;
    reason: 'email' | 'phone';
  } | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Restaure le choix de vue (table/kanban) depuis localStorage au montage.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'kanban' || saved === 'table') setView(saved);
    } catch {
      /* localStorage indisponible (SSR/privé) — on garde le défaut. */
    }
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* no-op */
    }
  }

  /** Insère une activité dans la timeline du prospect et ATTEND le résultat.
   *  Plus de fire-and-forget : on renvoie { ok } pour que l'appelant puisse
   *  avertir le commercial si la trace d'historique a échoué (traçabilité
   *  fiable, Sprint 9). owner_id et occurred_at sont posés par défaut côté
   *  Postgres (auth.uid() / now()). RLS owner-based : un commercial n'écrit
   *  que ses propres activités. */
  async function logActivity(
    prospectId: string,
    kind: 'note' | 'status_change',
    opts: { body?: string | null; metadata?: Record<string, unknown> } = {}
  ): Promise<{ ok: boolean }> {
    return insertActivityRow(supabase, prospectId, kind, opts);
  }

  /** Avertissement de trace : l'enregistrement principal a réussi mais
   *  l'historique n'a pas pu être mis à jour. Non bloquant. */
  function warnTraceFailed() {
    setTraceWarn('✓ Enregistré — ⚠ historique non mis à jour, réessayez.');
  }

  // Stats personnelles
  const stats = useMemo(() => {
    const total = prospects.length;
    const byStatus = prospects.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});
    const contacted = total - (byStatus.a_contacter ?? 0);
    const rdv = byStatus.rdv_pris ?? 0;
    const signed = byStatus.gagne ?? 0;
    const conversionRate = total > 0 ? (signed / total) * 100 : 0;
    const contactRate = total > 0 ? (contacted / total) * 100 : 0;
    const rdvRate = total > 0 ? (rdv / total) * 100 : 0;
    return { total, byStatus, contacted, rdv, signed, conversionRate, contactRate, rdvRate };
  }, [prospects]);

  // Filter + search + pagination
  const filtered = useMemo(() => {
    let list = prospects;
    if (filter !== 'all') list = list.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.company_name.toLowerCase().includes(q) ||
          (p.contact_name?.toLowerCase().includes(q) ?? false) ||
          (p.city?.toLowerCase().includes(q) ?? false) ||
          (p.sector?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [prospects, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // Mutations
  function pushStatusToNotion(prospectId: string) {
    fetch(`/api/prospects/${prospectId}/sync-status-to-notion`, { method: 'POST' }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[sync-status-to-notion] failed for prospect ${prospectId}:`, err);
    });
  }

  /**
   * Cherche un prospect EXISTANT (parmi ceux du commercial — RLS owner) qui
   * partage le même email (normalisé) ou les 9 derniers chiffres du téléphone.
   * Check best-effort : en cas d'erreur réseau, on ne bloque pas la création.
   */
  async function findDuplicate(
    email: string | null,
    phone: string | null
  ): Promise<{ match: string; reason: 'email' | 'phone' } | null> {
    const eNorm = email ? normEmail(email) : null;
    const pKey = phone ? phoneKey9(phone.replace(/\D/g, '')) : null;
    if (!eNorm && !pKey) return null;

    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('company_name, email_norm, phone_norm, status')
        .neq('status', 'archived')
        .or(
          [eNorm ? `email_norm.eq.${eNorm}` : null, pKey ? `phone_norm.ilike.%${pKey}` : null]
            .filter(Boolean)
            .join(',')
        )
        .limit(5);
      if (error || !data) return null;
      for (const row of data as {
        company_name: string;
        email_norm: string | null;
        phone_norm: string | null;
      }[]) {
        if (eNorm && row.email_norm === eNorm) {
          return { match: row.company_name, reason: 'email' };
        }
        if (pKey && row.phone_norm && phoneKey9(row.phone_norm) === pKey) {
          return { match: row.company_name, reason: 'phone' };
        }
      }
      return null;
    } catch {
      return null; // jamais bloquant
    }
  }

  /** Exécute réellement l'insert d'un prospect et met à jour l'état local. */
  async function insertProspect(payload: Record<string, unknown>) {
    const { data, error } = await supabase.from('prospects').insert(payload).select().single();
    if (error) { setError(error.message); throw error; }
    if (data) setProspects((prev) => [data as Prospect, ...prev]);
  }

  async function handleCreate(values: ProspectFormValues) {
    setError(null);
    const payload = {
      created_by: currentUserId,
      assigned_to: currentUserId,
      company_name: values.company_name.trim(),
      contact_name: values.contact_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      sector: values.sector.trim() || null,
      city: values.city.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
    };

    // Prévention anti-doublon (non bloquante) : si une fiche existe déjà avec
    // le même email/téléphone, on affiche une alerte et on attend confirmation.
    const dup = await findDuplicate(payload.email, payload.phone);
    if (dup) {
      setDupWarn({ payload, match: dup.match, reason: dup.reason });
      return; // l'insert se fera via confirmCreateDespiteDuplicate()
    }

    await insertProspect(payload);
  }

  /** Confirme la création malgré un doublon détecté. */
  async function confirmCreateDespiteDuplicate() {
    if (!dupWarn) return;
    const payload = dupWarn.payload;
    setDupWarn(null);
    try {
      await insertProspect(payload);
      setCreateOpen(false);
    } catch {
      /* erreur déjà posée dans setError */
    }
  }

  async function handleEdit(values: ProspectFormValues) {
    if (!editing) return;
    setError(null);
    const patch = {
      company_name: values.company_name.trim(),
      contact_name: values.contact_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      sector: values.sector.trim() || null,
      city: values.city.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
    };
    const { data, error } = await supabase.from('prospects').update(patch).eq('id', editing.id).select().single();
    if (error) { setError(error.message); throw error; }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      if (values.status !== editing.status) {
        setTraceWarn(null);
        const { ok } = await logActivity(updated.id, 'status_change', {
          metadata: { from: editing.status, to: values.status },
        });
        if (!ok) warnTraceFailed();
        if (updated.notion_page_id) pushStatusToNotion(updated.id);
      }
    }
  }

  async function handleStatusChange(prospect: Prospect, status: string) {
    setError(null);
    const previousStatus = prospect.status;
    const { data, error } = await supabase.from('prospects').update({ status }).eq('id', prospect.id).select().single();
    if (error) { setError(error.message); return; }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? updated : p)));
      setTraceWarn(null);
      if (status !== previousStatus) {
        const { ok } = await logActivity(updated.id, 'status_change', {
          metadata: { from: previousStatus, to: status },
        });
        if (!ok) warnTraceFailed();
      }
      if (updated.notion_page_id) pushStatusToNotion(updated.id);
      // Statut de relance sans date posee → on propose d'en planifier une.
      if (FOLLOWUP_STATUSES.has(status) && !updated.next_action_at) {
        setNotesFor(updated);
        setNotesDraft(updated.notes ?? '');
        setRelanceDraft('');
      }
    }
  }

  /**
   * Déplacement Kanban : carte → colonne de pipeline. Calcule le statut exact
   * (resolveDropStatus), applique un optimistic update, persiste via le client
   * anon (RLS owner), log l'activité status_change {from,to} (helper Sprint 1)
   * et rollback si l'update échoue.
   */
  async function handleMoveToColumn(prospect: Prospect, columnId: PipelineColumnId) {
    setError(null);
    const previousStatus = prospect.status;
    const nextStatus = resolveDropStatus(previousStatus, columnId);
    if (nextStatus === previousStatus) return; // pas de changement réel

    // Optimistic update.
    setProspects((prev) =>
      prev.map((p) => (p.id === prospect.id ? { ...p, status: nextStatus } : p))
    );

    const { data, error } = await supabase
      .from('prospects')
      .update({ status: nextStatus })
      .eq('id', prospect.id)
      .select()
      .single();

    if (error) {
      // Rollback.
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? { ...p, status: previousStatus } : p))
      );
      setError(`Déplacement impossible : ${error.message}`);
      return;
    }

    if (data) {
      const updated = data as Prospect;
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? updated : p)));
      setTraceWarn(null);
      const { ok } = await logActivity(updated.id, 'status_change', {
        metadata: { from: previousStatus, to: nextStatus },
      });
      if (!ok) warnTraceFailed();
      if (updated.notion_page_id) pushStatusToNotion(updated.id);
      // Statut de relance sans date posée → propose d'en planifier une.
      if (FOLLOWUP_STATUSES.has(nextStatus) && !updated.next_action_at) {
        setNotesFor(updated);
        setNotesDraft(updated.notes ?? '');
        setRelanceDraft('');
      }
    }
  }

  function openNotes(prospect: Prospect) {
    setNotesFor(prospect);
    setNotesDraft(prospect.notes ?? '');
    setRelanceDraft(toDateTimeInput(prospect.next_action_at));
  }

  async function handleDelete(prospect: Prospect) {
    if (!confirm(`Supprimer le prospect « ${prospect.company_name} » ?`)) return;
    setError(null);
    const { error } = await supabase.from('prospects').delete().eq('id', prospect.id);
    if (error) { setError(error.message); return; }
    setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
  }

  async function handleSaveNotes() {
    if (!notesFor) return;
    setError(null);
    const previousNotes = notesFor.notes ?? '';
    const nextNotes = notesDraft.trim() || null;
    const next_action_at = dateTimeInputToIso(relanceDraft);
    const { data, error } = await supabase
      .from('prospects')
      .update({ notes: nextNotes, next_action_at })
      .eq('id', notesFor.id)
      .select()
      .single();
    if (error) { setError(error.message); return; }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) => prev.map((p) => (p.id === notesFor.id ? updated : p)));
      setTraceWarn(null);
      // Trace la note dans la timeline si son contenu a changé. La note est
      // historisée (datée, retrouvable) même si prospects.notes est écrasé
      // plus tard. On attend le résultat : si la trace échoue, on avertit.
      if ((nextNotes ?? '') !== previousNotes && nextNotes) {
        const { ok } = await logActivity(updated.id, 'note', { body: nextNotes });
        if (!ok) warnTraceFailed();
      }
    }
    setNotesFor(null);
  }

  function hasEnrichment(p: Prospect): boolean {
    return Boolean(
      p.analyse_besoin || p.analyse_budget || p.analyse_timing ||
      p.recommandation_approche || (p.arguments_cles && p.arguments_cles.length > 0) ||
      (p.besoins_detectes && p.besoins_detectes.length > 0) ||
      p.instagram || p.facebook || p.linkedin_contact || p.linkedin_entreprise || p.tiktok ||
      p.ca_estime || p.classification || p.role_contact
    );
  }

  // Bonus calculation
  const TIERS = [
    { threshold: 5, bonus: 200 },
    { threshold: 10, bonus: 500 },
    { threshold: 15, bonus: 1000 },
    { threshold: 20, bonus: 2500 },
  ];
  const earnedBonus = TIERS.filter((t) => stats.signed >= t.threshold).reduce((sum, t) => sum + t.bonus, 0);
  const nextTier = TIERS.find((t) => stats.signed < t.threshold);

  return (
    <div className="relative">
      {/* ---- En-tête sobre (Design System Sprint 10) ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-7"
      >
        <SectionHeader
          as="h1"
          eyebrow="Mon pipeline"
          title="Mes prospects"
          subtitle={`Carnet de bord de ${firstName} — crée, édite et fais évoluer tes prospects au fil des contacts. Progression et paliers de bonus en direct.`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-choco tabular-nums">
                <Trophy className="h-3.5 w-3.5 text-brand-dark" aria-hidden />
                Bonus&nbsp;: {earnedBonus} €
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nouveau
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* ---- Bandeau KPI léger (StatCard DS) ---- */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" aria-hidden />}
          label="Total prospects"
          value={String(stats.total)}
          delta={`${stats.contacted} contactés`}
          deltaDirection={stats.contacted > 0 ? 'up' : 'flat'}
        />
        <StatCard
          icon={<Target className="h-5 w-5" aria-hidden />}
          label="RDV pris"
          value={String(stats.rdv)}
          delta={stats.rdvRate > 0 ? `${Math.round(stats.rdvRate)}%` : undefined}
          deltaDirection={stats.rdv > 0 ? 'up' : 'flat'}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
          label="Taux de conversion"
          value={`${Math.round(stats.conversionRate)}%`}
          delta={`${stats.signed} signé${stats.signed > 1 ? 's' : ''}`}
          deltaDirection={stats.signed > 0 ? 'up' : 'flat'}
        />
        <StatCard
          accent
          icon={<Award className="h-5 w-5" aria-hidden />}
          label="Signés"
          value={String(stats.signed)}
          delta={nextTier ? `→ ${nextTier.threshold}` : 'max'}
          deltaDirection={stats.signed > 0 ? 'up' : 'flat'}
          sub={
            nextTier ? (
              <span>
                Plus que{' '}
                <strong className="text-choco tabular-nums">
                  {nextTier.threshold - stats.signed}
                </strong>{' '}
                pour {nextTier.bonus} €
              </span>
            ) : (
              <span className="text-emerald-700">Tous paliers atteints</span>
            )
          }
        />
      </div>

      {/* ==================================================================== */}
      {/* Filters + actions                                                      */}
      {/* ==================================================================== */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Toggle Table / Kanban */}
          <div
            role="group"
            aria-label="Mode d'affichage"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-soft bg-white p-1 shadow-soft"
          >
            <button
              type="button"
              onClick={() => changeView('table')}
              aria-pressed={view === 'table'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'table'
                  ? 'bg-brand text-choco'
                  : 'text-muted-warm hover:bg-cream-deep'
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              Liste
            </button>
            <button
              type="button"
              onClick={() => changeView('kanban')}
              aria-pressed={view === 'kanban'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'kanban'
                  ? 'bg-brand text-choco'
                  : 'text-muted-warm hover:bg-cream-deep'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Kanban
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher entreprise, contact, ville…"
              className="w-full rounded-full border border-border-soft bg-white py-2.5 pl-10 pr-4 text-sm text-ink-warm placeholder:text-muted-warm/70 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" aria-hidden />
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="appearance-none rounded-full border border-border-soft bg-white py-2.5 pl-9 pr-9 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">Tous statuts</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {view === 'table' && (
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-full border border-border-soft bg-white px-4 py-2.5 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value={20}>20 par page</option>
              <option value={30}>30 par page</option>
              <option value={40}>40 par page</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-inter text-[11px] uppercase tracking-[0.15em] text-muted-warm">
            {filtered.length} prospect{filtered.length > 1 ? 's' : ''}
            {(filter !== 'all' || search) ? ` / ${prospects.length}` : ''}
          </span>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau prospect
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Avertissement de trace non bloquant : enregistrement OK mais
          historique non mis à jour. L'action principale a réussi. */}
      {traceWarn && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <span>{traceWarn}</span>
          <button
            type="button"
            onClick={() => setTraceWarn(null)}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
          >
            OK
          </button>
        </div>
      )}

      {/* Alerte anti-doublon non bloquante */}
      {dupWarn && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            ⚠️ Un prospect avec ce{' '}
            {dupWarn.reason === 'email' ? 'email' : 'téléphone'} existe déjà :{' '}
            <strong>{dupWarn.match}</strong>. Créer quand même&nbsp;?
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDupWarn(null)}
              className="rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmCreateDespiteDuplicate}
              className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Créer quand même
            </button>
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Vue Kanban                                                             */}
      {/* ==================================================================== */}
      {view === 'kanban' ? (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border-soft bg-cream p-16 text-center shadow-soft">
            <p className="font-marcellus text-xl text-choco">Aucun prospect trouvé.</p>
            <p className="mt-2 text-sm text-muted-warm">Ajuste tes filtres ou crée ton premier prospect.</p>
          </div>
        ) : (
          <ProspectKanban
            prospects={filtered}
            onMoveToColumn={handleMoveToColumn}
            onOpenNotes={openNotes}
          />
        )
      ) : (
        <>
          {/* Prospect cards (vue Liste) */}
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border-soft bg-cream p-16 text-center shadow-soft">
              <p className="font-marcellus text-xl text-choco">Aucun prospect trouvé.</p>
              <p className="mt-2 text-sm text-muted-warm">Ajuste tes filtres ou crée ton premier prospect.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginated.map((p, i) => (
                <ProspectRow
                  key={p.id}
                  prospect={p}
                  index={i}
                  onView={() => setViewing(p)}
                  onEdit={() => setEditing(p)}
                  onDelete={() => handleDelete(p)}
                  onNotes={() => openNotes(p)}
                  onStatusChange={(s) => handleStatusChange(p, s)}
                  hasEnrichment={hasEnrichment(p)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between rounded-2xl border border-border-soft bg-cream px-4 py-3 shadow-soft sm:px-6">
              <p className="font-inter text-[11px] uppercase tracking-[0.15em] text-muted-warm">
                Page <span className="font-semibold text-choco">{safePage}</span> sur <span className="text-choco">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-warm transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                {pageNumbers(safePage, totalPages).map((n, idx) =>
                  n === '…' ? (
                    <span key={`gap-${idx}`} className="px-2 text-xs text-muted-warm/70">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors ${
                        n === safePage ? 'bg-brand text-choco' : 'text-ink-warm hover:bg-brand-soft'
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-warm transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ProspectModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} title="Nouveau prospect" submitLabel="Créer le prospect" />
      <ProspectModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
        initial={editing ? {
          company_name: editing.company_name,
          contact_name: editing.contact_name ?? '',
          phone: editing.phone ?? '',
          email: editing.email ?? '',
          website: editing.website ?? '',
          sector: editing.sector ?? '',
          city: editing.city ?? '',
          status: editing.status,
          notes: editing.notes ?? '',
        } : undefined}
        title={editing ? `Modifier : ${editing.company_name}` : 'Modifier'}
        submitLabel="Enregistrer"
      />
      <ProspectDetailsModal prospect={viewing} onClose={() => setViewing(null)} />

      {notesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-choco/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border-soft bg-cream shadow-soft-lg">
            <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-brand to-transparent" />
            <div className="flex-1 overflow-y-auto p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark">Notes &amp; relance</p>
                  <h3 className="mt-1 font-marcellus text-xl font-normal text-choco">{notesFor.company_name}</h3>
                </div>
                <button onClick={() => setNotesFor(null)} className="rounded-full p-2 text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm" aria-label="Fermer la modale">✕</button>
              </div>
              <textarea
                rows={7}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="mt-5 w-full rounded-2xl border border-border-soft bg-white p-4 text-sm text-ink-warm placeholder:text-muted-warm/70 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Contexte, historique, comment s'est passé l'appel…"
              />
              <div className="mt-4">
                <label htmlFor="relance-datetime" className="mb-1.5 block font-inter text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-dark">
                  Prochaine relance
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="relance-datetime"
                    type="datetime-local"
                    value={relanceDraft}
                    onChange={(e) => setRelanceDraft(e.target.value)}
                    className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm text-ink-warm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  {relanceDraft && (
                    <button
                      type="button"
                      onClick={() => setRelanceDraft('')}
                      className="text-xs font-semibold text-muted-warm underline underline-offset-2 hover:text-ink-warm"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-warm">
                  Visible dans « Mes relances » (et par l&apos;admin dans son pilotage).
                </p>
              </div>

              {/* Lien vers la fiche 360 complète */}
              <div className="mt-5">
                <Link
                  href={`/prospects/${notesFor.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-pale"
                >
                  <FolderOpen className="h-4 w-4" aria-hidden />
                  Ouvrir la fiche complète
                </Link>
              </div>

              {/* Timeline d'activité */}
              <div className="mt-6 border-t border-border-soft pt-5">
                <p className="mb-3 font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
                  Historique d&apos;activité
                </p>
                <ProspectTimeline prospectId={notesFor.id} />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-border-soft bg-cream p-5">
              <Button variant="outline" size="sm" onClick={() => setNotesFor(null)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveNotes}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProspectRow({ prospect: p, index, onView, onEdit, onDelete, onNotes, onStatusChange, hasEnrichment }: {
  prospect: Prospect; index: number; onView: () => void; onEdit: () => void; onDelete: () => void; onNotes: () => void; onStatusChange: (status: string) => void; hasEnrichment: boolean;
}) {
  const statusTone = pastelClassesForStatus(p.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.4), ease: 'easeOut' }}
      className="group flex flex-col gap-4 rounded-2xl border border-border-soft bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft-md sm:p-6 lg:flex-row lg:items-center"
    >
      <div className="flex flex-1 items-start gap-4 lg:max-w-[28%]">
        <Avatar name={p.company_name} size="lg" tone="choco" className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/prospects/${p.id}`}
              className="truncate font-marcellus text-base font-normal text-choco underline-offset-4 transition-colors hover:text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
              title="Ouvrir la fiche 360"
            >
              {p.company_name}
            </Link>
            {p.notion_page_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-inter text-[8px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                Notion
              </span>
            )}
          </div>
          {p.contact_name && (
            <p className="mt-0.5 text-sm text-muted-warm">
              {p.contact_name}
              {p.role_contact && <span className="text-muted-warm/70"> · {p.role_contact}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm lg:max-w-[22%] lg:flex-1">
        {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 font-inter text-xs text-brand-dark transition-colors hover:text-brand">{p.phone}</a>}
        {p.email && (
          <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 truncate font-inter text-xs text-muted-warm transition-colors hover:text-brand-dark">
            {p.email}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs lg:max-w-[18%] lg:flex-1">
        {p.city && <span className="inline-flex items-center gap-1 text-muted-warm"><MapPin className="h-3 w-3 text-muted-warm/70" aria-hidden />{p.city}</span>}
        {p.sector && <span className="font-inter text-[10px] uppercase tracking-[0.15em] text-muted-warm/70">{p.sector}</span>}
      </div>
      <div className="lg:max-w-[16%]">
        <select
          value={p.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}
          aria-label={`Statut de ${p.company_name}`}
        >
          {!STATUS_OPTIONS.some((o) => o.value === p.status) && (
            <option value={p.status}>{labelForStatus(p.status)}</option>
          )}
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="mt-1 font-inter text-[9px] uppercase tracking-[0.15em] text-muted-warm/70">MAJ {formatDate(p.updated_at)}</p>
        {p.next_action_at && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-inter text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-dark">
            ⏰ Relance {formatDate(p.next_action_at)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/prospects/${p.id}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-brand-soft hover:text-brand-dark"
          aria-label={`Ouvrir la fiche de ${p.company_name}`}
          title="Ouvrir la fiche 360"
        >
          <FolderOpen className="h-4 w-4" aria-hidden />
        </Link>
        {hasEnrichment && (
          <button onClick={onView} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-dark transition-colors hover:bg-brand-soft hover:text-brand" aria-label="Voir l'analyse complète" title="Voir l'analyse complète">
            <Sparkles className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button onClick={onNotes} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm" aria-label={p.notes ? 'Voir les notes et la relance' : 'Ajouter des notes ou une relance'} title={p.notes ? 'Voir les notes' : 'Ajouter des notes'}>
          <StickyNote className="h-4 w-4" aria-hidden />
        </button>
        <button onClick={onEdit} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm" aria-label="Modifier" title="Modifier">
          <Edit3 className="h-4 w-4" aria-hidden />
        </button>
        <button onClick={onDelete} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500/70 transition-colors hover:bg-rose-50 hover:text-rose-600" aria-label="Supprimer" title="Supprimer">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [];
  out.push(1);
  if (current > 3) out.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}
