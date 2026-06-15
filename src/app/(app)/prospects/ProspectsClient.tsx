'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Filter,
  MapPin,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  formatDate,
  labelForStatus,
  STATUS_OPTIONS,
  toneForStatus,
  type Prospect,
} from '@/lib/prospects';
import ProspectModal, { type ProspectFormValues } from '@/components/ProspectModal';
import ProspectDetailsModal from '@/components/ProspectDetailsModal';
import ProspectTimeline from '@/components/ProspectTimeline';
import ProspectsHeroVisual from '@/components/ProspectsHeroVisual';
import SpeedometerGauge from '@/components/SpeedometerGauge';
import RocketProgress from '@/components/RocketProgress';

type ProspectsClientProps = {
  initialProspects: Prospect[];
  currentUserId: string;
  firstName: string;
};

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

export default function ProspectsClient({
  initialProspects,
  currentUserId,
  firstName,
}: ProspectsClientProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
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

  const supabase = useMemo(() => createClient(), []);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const watermarkY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const watermarkOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  /** Insère une activité dans la timeline du prospect (fire-and-forget).
   *  owner_id et occurred_at sont posés par défaut côté Postgres (auth.uid() /
   *  now()). RLS owner-based : un commercial n'écrit que ses propres activités. */
  function logActivity(
    prospectId: string,
    kind: 'note' | 'status_change',
    opts: { body?: string | null; metadata?: Record<string, unknown> } = {}
  ) {
    supabase
      .from('activities')
      .insert({
        prospect_id: prospectId,
        kind,
        body: opts.body ?? null,
        metadata: opts.metadata ?? null,
      })
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error(`[activities] insert ${kind} failed:`, error.message);
        }
      });
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
    const { data, error } = await supabase.from('prospects').insert(payload).select().single();
    if (error) { setError(error.message); throw error; }
    if (data) setProspects((prev) => [data as Prospect, ...prev]);
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
        logActivity(updated.id, 'status_change', {
          metadata: { from: editing.status, to: values.status },
        });
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
      if (status !== previousStatus) {
        logActivity(updated.id, 'status_change', {
          metadata: { from: previousStatus, to: status },
        });
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
      // Trace la note dans la timeline si son contenu a changé.
      if ((nextNotes ?? '') !== previousNotes && nextNotes) {
        logActivity(updated.id, 'note', { body: nextNotes });
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
  const tierProgress = nextTier ? (stats.signed / nextTier.threshold) * 100 : 100;

  return (
    <div className="relative">
      {/* Hero */}
      <header
        ref={heroRef}
        className="relative mb-12 grid min-h-[60vh] grid-cols-1 items-center gap-12 overflow-hidden lg:grid-cols-[7fr_5fr] lg:gap-16"
      >
        <motion.span
          aria-hidden
          style={{ y: watermarkY, opacity: watermarkOpacity }}
          className="pointer-events-none absolute -bottom-10 -left-4 select-none whitespace-nowrap font-display text-[20vw] font-medium leading-none tracking-tighter text-gnd-bronze/[0.04] sm:-bottom-20 sm:text-[16rem]"
        >
          Prospects.
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-gnd-amber" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
              Mon pipeline
            </span>
          </div>
          <h1 className="font-display text-display-xl font-medium leading-[0.95] tracking-tight text-gnd-bronze">
            Tes <span className="italic text-gnd-amber">prospects</span>,
            <br />
            {firstName}.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-gnd-bronze-soft sm:text-lg">
            Carnet de bord personnel. Crée, édite, fais évoluer tes prospects au fil des contacts. Ta progression et tes paliers de bonus en direct.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <ProspectsHeroVisual total={stats.total} contacted={stats.contacted} signed={stats.signed} />
        </motion.div>
      </header>

      {/* ==================================================================== */}
      {/* Dashboard cockpit — dark bronze/ink avec glow amber                    */}
      {/* ==================================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-12 overflow-hidden rounded-3xl border border-gnd-amber/15 bg-gradient-to-br from-gnd-bronze via-gnd-bronze to-gnd-ink p-6 shadow-warm-xl sm:p-8"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 0%, rgba(232, 133, 61, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 80% 100%, rgba(232, 133, 61, 0.08) 0%, transparent 50%),
            linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)
          `,
        }}
      >
        {/* HUD top bar */}
        <div className="mb-6 flex items-center justify-between border-b border-gnd-amber/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-gnd-amber shadow-[0_0_8px_rgba(232,133,61,0.8)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-gnd-amber">
              Console Personnelle · Live
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gnd-cream/50">
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-gnd-cream/70">
              <Activity className="h-3 w-3 text-gnd-amber" aria-hidden />
              {stats.total} sig.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          {/* SPEEDOMETER */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gnd-amber/10 bg-gnd-ink/40 p-6 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-gnd-amber" aria-hidden />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gnd-amber">
                Conversion
              </span>
            </div>
            <SpeedometerGauge
              value={stats.conversionRate}
              label="Taux conversion"
              formatValue={(v) => `${Math.round(v)}`}
              subtitle="%"
              subLeft={{ value: stats.contactRate, label: 'CTC' }}
              subRight={{ value: stats.rdvRate, label: 'RDV' }}
            />
            {/* Footer stats */}
            <div className="mt-4 flex w-full items-center justify-between border-t border-gnd-amber/10 pt-3 text-center">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gnd-cream/50">
                  Signés
                </p>
                <p className="font-display text-lg font-medium text-gnd-cream">{stats.signed}</p>
              </div>
              <div className="h-6 w-px bg-gnd-amber/20" />
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gnd-cream/50">
                  Total
                </p>
                <p className="font-display text-lg font-medium text-gnd-cream">{stats.total}</p>
              </div>
              <div className="h-6 w-px bg-gnd-amber/20" />
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gnd-cream/50">
                  Bonus
                </p>
                <p className="font-display text-lg font-medium text-gnd-amber">
                  {earnedBonus} €
                </p>
              </div>
            </div>
          </div>

          {/* ROCKET + BONUS PANEL */}
          <div className="relative flex flex-col rounded-2xl border border-gnd-amber/10 bg-gnd-ink/40 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-gnd-amber" aria-hidden />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gnd-amber">
                  Trajectoire bonus
                </span>
              </div>
              <span className="rounded-full border border-gnd-amber/30 bg-gnd-amber/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-glow">
                {stats.signed} signé{stats.signed > 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="mb-1 font-display text-2xl font-medium text-gnd-cream">
              Décolle vers ton{' '}
              <span className="italic text-gnd-amber">prochain palier</span>
            </h3>
            <p className="mb-6 max-w-md text-sm text-gnd-cream/60">
              La fusée progresse en continu. Chaque palier débloqué ajoute son bonus au
              compteur.
            </p>

            <div className="flex h-52 items-stretch">
              <RocketProgress signed={stats.signed} />
            </div>

            {/* Mini progress to next tier */}
            {nextTier && (
              <div className="mt-4 border-t border-gnd-amber/10 pt-4">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-gnd-cream/60">
                  <span>Prochain palier</span>
                  <span className="text-gnd-amber">
                    {stats.signed} / {nextTier.threshold}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gnd-bronze/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgress}%` }}
                    transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow shadow-[0_0_8px_rgba(232,133,61,0.6)]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HUD bottom bar with KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gnd-amber/15 pt-4 sm:grid-cols-4">
          <HudKpi label="Total" value={stats.total} />
          <HudKpi label="Contactés" value={stats.contacted} highlight />
          <HudKpi label="RDV pris" value={stats.rdv} highlight />
          <HudKpi label="Signés" value={stats.signed} accent />
        </div>
      </motion.section>

      {/* ==================================================================== */}
      {/* Filters + actions                                                      */}
      {/* ==================================================================== */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gnd-bronze-soft" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher entreprise, contact, ville…"
              className="w-full rounded-full border border-gnd-bronze/10 bg-white py-2.5 pl-10 pr-4 text-sm text-gnd-bronze placeholder:text-gnd-bronze-faded focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gnd-bronze-soft" aria-hidden />
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="appearance-none rounded-full border border-gnd-bronze/10 bg-white py-2.5 pl-9 pr-9 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            >
              <option value="all">Tous statuts</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-full border border-gnd-bronze/10 bg-white px-4 py-2.5 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          >
            <option value={20}>20 par page</option>
            <option value={30}>30 par page</option>
            <option value={40}>40 par page</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-gnd-bronze-soft">
            {filtered.length} prospect{filtered.length > 1 ? 's' : ''}
            {(filter !== 'all' || search) ? ` / ${prospects.length}` : ''}
          </span>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gnd-bronze px-5 py-2.5 text-sm font-semibold text-gnd-cream transition-all hover:bg-gnd-ink hover:shadow-warm-lg"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau prospect
          </button>
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

      {/* Prospect cards */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-16 text-center shadow-warm">
          <p className="font-display text-xl text-gnd-bronze">Aucun prospect trouvé.</p>
          <p className="mt-2 text-sm text-gnd-bronze-soft">Ajuste tes filtres ou crée ton premier prospect.</p>
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
              onNotes={() => { setNotesFor(p); setNotesDraft(p.notes ?? ''); setRelanceDraft(toDateTimeInput(p.next_action_at)); }}
              onStatusChange={(s) => handleStatusChange(p, s)}
              hasEnrichment={hasEnrichment(p)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between rounded-2xl border border-gnd-bronze/8 bg-gnd-paper px-4 py-3 shadow-warm sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-gnd-bronze-soft">
            Page <span className="font-semibold text-gnd-bronze">{safePage}</span> sur <span className="text-gnd-bronze">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gnd-bronze transition-colors hover:bg-gnd-amber/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            {pageNumbers(safePage, totalPages).map((n, idx) =>
              n === '…' ? (
                <span key={`gap-${idx}`} className="px-2 text-xs text-gnd-bronze-faded">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors ${
                    n === safePage ? 'bg-gnd-bronze text-gnd-cream' : 'text-gnd-bronze hover:bg-gnd-amber/10'
                  }`}
                >
                  {n}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gnd-bronze transition-colors hover:bg-gnd-amber/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gnd-bronze/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gnd-bronze/8 bg-gnd-paper shadow-warm-xl">
            <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-gnd-amber to-transparent" />
            <div className="flex-1 overflow-y-auto p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-dim">Notes &amp; relance</p>
                  <h3 className="mt-1 font-display text-xl font-medium text-gnd-bronze">{notesFor.company_name}</h3>
                </div>
                <button onClick={() => setNotesFor(null)} className="rounded-full p-2 text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze" aria-label="Fermer la modale">✕</button>
              </div>
              <textarea
                rows={7}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="mt-5 w-full rounded-2xl border border-gnd-bronze/10 bg-white p-4 text-sm text-gnd-bronze placeholder:text-gnd-bronze-faded focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
                placeholder="Contexte, historique, comment s'est passé l'appel…"
              />
              <div className="mt-4">
                <label htmlFor="relance-datetime" className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim">
                  Prochaine relance
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="relance-datetime"
                    type="datetime-local"
                    value={relanceDraft}
                    onChange={(e) => setRelanceDraft(e.target.value)}
                    className="rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
                  />
                  {relanceDraft && (
                    <button
                      type="button"
                      onClick={() => setRelanceDraft('')}
                      className="text-xs font-semibold text-gnd-bronze-soft underline underline-offset-2 hover:text-gnd-bronze"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-gnd-bronze-soft">
                  Visible dans « Mes relances » (et par l&apos;admin dans son pilotage).
                </p>
              </div>

              {/* Timeline d'activité */}
              <div className="mt-6 border-t border-gnd-bronze/8 pt-5">
                <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-dim">
                  Historique d&apos;activité
                </p>
                <ProspectTimeline prospectId={notesFor.id} />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gnd-bronze/8 bg-gnd-paper p-5">
              <button onClick={() => setNotesFor(null)} className="rounded-full border border-gnd-bronze/10 bg-white px-5 py-2.5 text-sm font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream">Annuler</button>
              <button onClick={handleSaveNotes} className="rounded-full bg-gnd-bronze px-5 py-2.5 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HudKpi({ label, value, highlight, accent }: { label: string; value: number; highlight?: boolean; accent?: boolean }) {
  const fg = accent ? 'text-gnd-amber-glow' : highlight ? 'text-gnd-amber' : 'text-gnd-cream';
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-gnd-amber/10 bg-gnd-ink/40 p-3 backdrop-blur-sm">
      <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-gnd-cream/60">
        {label}
      </p>
      <p className={`font-display text-2xl font-medium ${fg}`}>{value}</p>
    </div>
  );
}

function ProspectRow({ prospect: p, index, onView, onEdit, onDelete, onNotes, onStatusChange, hasEnrichment }: {
  prospect: Prospect; index: number; onView: () => void; onEdit: () => void; onDelete: () => void; onNotes: () => void; onStatusChange: (status: string) => void; hasEnrichment: boolean;
}) {
  const statusTone = toneForStatus(p.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.4), ease: 'easeOut' }}
      className="group flex flex-col gap-4 rounded-2xl border border-gnd-bronze/8 bg-gnd-paper p-5 shadow-warm transition-all hover:-translate-y-0.5 hover:border-gnd-amber/30 hover:shadow-warm-lg sm:p-6 lg:flex-row lg:items-center"
    >
      <div className="flex flex-1 items-start gap-4 lg:max-w-[28%]">
        <Avatar text={p.company_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-base font-medium text-gnd-bronze">{p.company_name}</p>
            {p.notion_page_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gnd-amber/15 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-dim">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                Notion
              </span>
            )}
          </div>
          {p.contact_name && (
            <p className="mt-0.5 text-sm text-gnd-bronze-soft">
              {p.contact_name}
              {p.role_contact && <span className="text-gnd-bronze-faded"> · {p.role_contact}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm lg:max-w-[22%] lg:flex-1">
        {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 font-mono text-xs text-gnd-amber-dim transition-colors hover:text-gnd-amber">{p.phone}</a>}
        {p.email && (
          <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 truncate font-mono text-xs text-gnd-bronze-soft transition-colors hover:text-gnd-amber">
            {p.email}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs lg:max-w-[18%] lg:flex-1">
        {p.city && <span className="inline-flex items-center gap-1 text-gnd-bronze-soft"><MapPin className="h-3 w-3 text-gnd-bronze-faded" aria-hidden />{p.city}</span>}
        {p.sector && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-bronze-faded">{p.sector}</span>}
      </div>
      <div className="lg:max-w-[16%]">
        <select
          value={p.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`rounded-full border-0 px-3 py-1 text-xs font-semibold ${statusTone}`}
          aria-label={`Statut de ${p.company_name}`}
        >
          {!STATUS_OPTIONS.some((o) => o.value === p.status) && (
            <option value={p.status}>{labelForStatus(p.status)}</option>
          )}
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-gnd-bronze-faded">MAJ {formatDate(p.updated_at)}</p>
        {p.next_action_at && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gnd-amber/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gnd-amber-dim">
            ⏰ Relance {formatDate(p.next_action_at)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {hasEnrichment && (
          <button onClick={onView} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gnd-amber-dim transition-colors hover:bg-gnd-amber/10 hover:text-gnd-amber" aria-label="Voir l'analyse complète" title="Voir l'analyse complète">
            <Sparkles className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button onClick={onNotes} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze" aria-label={p.notes ? 'Voir les notes et la relance' : 'Ajouter des notes ou une relance'} title={p.notes ? 'Voir les notes' : 'Ajouter des notes'}>
          <StickyNote className="h-4 w-4" aria-hidden />
        </button>
        <button onClick={onEdit} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze" aria-label="Modifier" title="Modifier">
          <Edit3 className="h-4 w-4" aria-hidden />
        </button>
        <button onClick={onDelete} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-500/70 transition-colors hover:bg-rose-50 hover:text-rose-600" aria-label="Supprimer" title="Supprimer">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}

function Avatar({ text }: { text: string }) {
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h << 5) - h + text.charCodeAt(i);
    return Math.abs(h);
  }, [text]);
  const palette = [
    'from-gnd-amber to-gnd-amber-dim',
    'from-gnd-bronze to-gnd-ink',
    'from-gnd-amber-glow to-gnd-amber',
    'from-gnd-bronze-soft to-gnd-bronze',
    'from-gnd-clay to-gnd-amber-dim',
  ];
  const grad = palette[hash % palette.length];
  const initials = text.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-sm font-medium text-gnd-cream shadow-warm ${grad}`}>
      {initials || '?'}
    </div>
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
