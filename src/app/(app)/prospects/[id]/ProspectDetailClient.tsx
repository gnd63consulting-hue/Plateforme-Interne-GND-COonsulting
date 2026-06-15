'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarClock,
  Check,
  Clock,
  Edit3,
  ExternalLink,
  Facebook,
  Flame,
  Globe,
  Instagram,
  Lightbulb,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Music2,
  Phone,
  Send,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  formatDate,
  labelForStatus,
  STATUS_OPTIONS,
  toneForStatus,
  type Prospect,
} from '@/lib/prospects';
import {
  iconForActivityKind,
  labelForActivityKind,
  statusChangeParts,
  type Activity,
  type ActivityKind,
} from '@/lib/activities';
import type { Sequence, SequenceEnrollment } from '@/lib/sequences';
import { formatEurExact, type Quote } from '@/lib/finance';
import SequenceEnrollPanel from './SequenceEnrollPanel';
import QuotesPanel from './QuotesPanel';
import { recordCommission } from './finance-actions';

/* ====================================================================== */
/* Constantes                                                              */
/* ====================================================================== */

/** Statuts considérés "actifs" : tant qu'on n'est ni gagné, ni perdu, ni
 *  sorti, on attend une prochaine action planifiée. Aligné sur la logique
 *  de sortie du pipeline (cf. lib/pipeline « mort » + gagne). */
const CLOSED_STATUSES = new Set([
  'gagne',
  'perdu',
  'archived',
  'pas_interesse',
  'coordonnees_invalides',
  'ne_plus_demarcher',
  'processus_termine',
]);

/** Sous-types d'appel (stockés en metadata.outcome). */
const CALL_OUTCOMES = [
  { value: 'answered', label: 'Répondu' },
  { value: 'no_answer', label: 'Pas répondu' },
  { value: 'voicemail', label: 'Messagerie' },
] as const;

type QuickKind = 'call' | 'email' | 'meeting' | 'note';

const QUICK_ACTIONS: {
  kind: QuickKind;
  label: string;
  placeholder: string;
}[] = [
  { kind: 'call', label: 'Noté un appel', placeholder: 'Comment s\'est passé l\'appel ? (facultatif)' },
  { kind: 'email', label: 'Email', placeholder: 'Objet / contenu de l\'email envoyé… (facultatif)' },
  { kind: 'meeting', label: 'RDV', placeholder: 'Date, lieu, participants, objectif du RDV…' },
  { kind: 'note', label: 'Note', placeholder: 'Note libre, contexte, rappel…' },
];

/* ====================================================================== */
/* Helpers date                                                            */
/* ====================================================================== */

/** ISO → 'yyyy-mm-ddThh:mm' (heure locale) pour <input type="datetime-local">. */
function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/** 'yyyy-mm-ddThh:mm' (heure locale saisie) → ISO UTC, ou null si vide. */
function dateTimeInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Horodatage court FR (jour + heure) pour la timeline. */
function formatStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return formatDate(iso);
  }
}

/** Date longue lisible pour le bandeau prochaine action. */
function formatRelance(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return formatDate(iso);
  }
}

function isHotClassification(classification: string | null): boolean {
  return !!classification && /chaud|hot|🔥|prioritaire/i.test(classification);
}

/* ====================================================================== */
/* Composant principal                                                     */
/* ====================================================================== */

type ProspectDetailClientProps = {
  initialProspect: Prospect;
  initialActivities: Activity[];
  activeSequences: Sequence[];
  initialEnrollment: SequenceEnrollment | null;
  initialQuotes: Quote[];
};

export default function ProspectDetailClient({
  initialProspect,
  initialActivities,
  activeSequences,
  initialEnrollment,
  initialQuotes,
}: ProspectDetailClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const reduceMotion = useReducedMotion();

  const [prospect, setProspect] = useState<Prospect>(initialProspect);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [visibleCount, setVisibleCount] = useState(30);
  const [status, setStatus] = useState<string>(initialProspect.status);
  const [feedback, setFeedback] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Quel panneau de saisie rapide est ouvert (kind) — un seul à la fois.
  const [openQuick, setOpenQuick] = useState<QuickKind | null>(null);
  // Modale « Montant du contrat signé » (ouverte au passage en 'gagne').
  const [winDealOpen, setWinDealOpen] = useState(false);

  // ---- Insertion d'activité (client anon, RLS owner, owner_id=auth.uid()) --
  /**
   * Insère une activité ET la prepend à la timeline locale en lisant la ligne
   * réellement créée (id + occurred_at posés par Postgres). Renvoie true en
   * cas de succès. owner_id / occurred_at sont des defaults côté BDD.
   */
  const insertActivity = useCallback(
    async (
      kind: ActivityKind,
      opts: { body?: string | null; metadata?: Record<string, unknown> } = {}
    ): Promise<boolean> => {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          prospect_id: prospect.id,
          kind,
          body: opts.body ?? null,
          metadata: opts.metadata ?? null,
        })
        .select()
        .single();
      if (error || !data) {
        // eslint-disable-next-line no-console
        console.error(`[activities] insert ${kind} failed:`, error?.message);
        return false;
      }
      setActivities((prev) => [data as Activity, ...prev]);
      return true;
    },
    [supabase, prospect.id]
  );

  // ---- Push Notion (réutilise l'endpoint Sprint 1 si la fiche est liée) ----
  const pushStatusToNotion = useCallback((prospectId: string) => {
    fetch(`/api/prospects/${prospectId}/sync-status-to-notion`, {
      method: 'POST',
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[sync-status-to-notion] failed for ${prospectId}:`, err);
    });
  }, []);

  function announce(msg: string) {
    setFeedback(msg);
  }

  /* ---- Actions rapides : appel / email / rdv / note ------------------- */
  const handleQuickActivity = useCallback(
    async (kind: QuickKind, body: string, callOutcome?: string) => {
      setErrorMsg('');
      const metadata =
        kind === 'call' && callOutcome ? { outcome: callOutcome } : undefined;
      const ok = await insertActivity(kind, {
        body: body.trim() || null,
        metadata,
      });
      if (ok) {
        setOpenQuick(null);
        announce(`${labelForActivityKind(kind)} enregistré dans la timeline.`);
      } else {
        setErrorMsg('Enregistrement impossible. Réessaie.');
      }
    },
    [insertActivity]
  );

  /* ---- Planifier une relance (update next_action_at + log note) ------- */
  const handlePlanRelance = useCallback(
    async (isoOrNull: string | null) => {
      setErrorMsg('');
      const previous = prospect.next_action_at;
      // Optimistic.
      setProspect((p) => ({ ...p, next_action_at: isoOrNull }));

      const { data, error } = await supabase
        .from('prospects')
        .update({ next_action_at: isoOrNull })
        .eq('id', prospect.id)
        .select()
        .single();

      if (error || !data) {
        // Rollback.
        setProspect((p) => ({ ...p, next_action_at: previous }));
        setErrorMsg(`Relance non enregistrée : ${error?.message ?? 'erreur'}`);
        return;
      }
      setProspect(data as Prospect);
      if (isoOrNull) {
        await insertActivity('note', {
          body: `Relance planifiée au ${formatRelance(isoOrNull)}.`,
        });
        announce('Relance planifiée et ajoutée à la timeline.');
      } else {
        announce('Relance retirée.');
      }
    },
    [supabase, prospect.id, prospect.next_action_at, insertActivity]
  );

  /* ---- Changer le statut (update + log status_change + push Notion) --- */
  const handleStatusChange = useCallback(
    async (next: string) => {
      if (next === prospect.status) return;
      setErrorMsg('');
      const previous = prospect.status;
      // Optimistic.
      setStatus(next);
      setProspect((p) => ({ ...p, status: next }));

      const { data, error } = await supabase
        .from('prospects')
        .update({ status: next })
        .eq('id', prospect.id)
        .select()
        .single();

      if (error || !data) {
        // Rollback.
        setStatus(previous);
        setProspect((p) => ({ ...p, status: previous }));
        setErrorMsg(`Statut non enregistré : ${error?.message ?? 'erreur'}`);
        return;
      }
      const updated = data as Prospect;
      setProspect(updated);
      setStatus(updated.status);
      const traced = await insertActivity('status_change', {
        metadata: { from: previous, to: next },
      });
      if (updated.notion_page_id) pushStatusToNotion(updated.id);
      announce(
        traced
          ? `Statut mis à jour : ${labelForStatus(previous)} → ${labelForStatus(next)}.`
          : `Statut mis à jour : ${labelForStatus(previous)} → ${labelForStatus(next)} — ⚠ historique non mis à jour.`
      );
      // Passage en « gagné » → capture du montant signé + commission réelle.
      if (next === 'gagne') setWinDealOpen(true);
    },
    [supabase, prospect.id, prospect.status, insertActivity, pushStatusToNotion]
  );

  /* ---- Confirmation du montant signé (modale gain) ------------------- */
  const handleConfirmDeal = useCallback(
    async (amountHt: number): Promise<boolean> => {
      setErrorMsg('');
      // Optimistic local sur deal_amount — mémorise l'ancienne valeur pour
      // pouvoir rollback si la commission n'est pas enregistrée côté serveur.
      const previousDeal = prospect.deal_amount;
      setProspect((p) => ({ ...p, deal_amount: amountHt }));
      const res = await recordCommission(prospect.id, amountHt);
      if (res.error) {
        // Rollback de l'optimistic : le montant n'a PAS été persisté.
        setProspect((p) => ({ ...p, deal_amount: previousDeal }));
        setErrorMsg(res.error);
        return false;
      }
      // La trace timeline est attendue : si elle échoue, on avertit sans
      // bloquer (le montant/commission, eux, sont bien enregistrés).
      const ok = await insertActivity('note', {
        body: `Contrat signé : ${formatEurExact(amountHt)} HT.`,
      });
      if (ok) {
        announce('Montant signé enregistré et commission générée.');
      } else {
        announce(
          'Montant signé et commission enregistrés — ⚠ historique non mis à jour.'
        );
      }
      setWinDealOpen(false);
      return true;
    },
    [prospect.id, prospect.deal_amount, insertActivity]
  );

  /* ---- Édition rapide des notes (update + log note si modifié) -------- */
  const handleSaveNotes = useCallback(
    async (nextNotesRaw: string) => {
      setErrorMsg('');
      const previous = prospect.notes ?? '';
      const nextNotes = nextNotesRaw.trim() || null;
      const { data, error } = await supabase
        .from('prospects')
        .update({ notes: nextNotes })
        .eq('id', prospect.id)
        .select()
        .single();
      if (error || !data) {
        setErrorMsg(`Notes non enregistrées : ${error?.message ?? 'erreur'}`);
        return false;
      }
      setProspect(data as Prospect);
      // Historise la note dans la timeline (datée, retrouvable même si
      // prospects.notes est écrasé plus tard). Trace attendue → on avertit
      // si elle échoue, sans bloquer l'enregistrement de la note.
      if ((nextNotes ?? '') !== previous && nextNotes) {
        const traced = await insertActivity('note', { body: nextNotes });
        announce(
          traced
            ? 'Notes enregistrées.'
            : 'Notes enregistrées — ⚠ historique non mis à jour.'
        );
        return true;
      }
      announce('Notes enregistrées.');
      return true;
    },
    [supabase, prospect.id, prospect.notes, insertActivity]
  );

  /* ---- Édition rapide des coordonnées --------------------------------- */
  const handleSaveContact = useCallback(
    async (patch: {
      phone: string | null;
      email: string | null;
      website: string | null;
      address: string | null;
      city: string | null;
    }): Promise<boolean> => {
      setErrorMsg('');
      const { data, error } = await supabase
        .from('prospects')
        .update(patch)
        .eq('id', prospect.id)
        .select()
        .single();
      if (error || !data) {
        setErrorMsg(`Coordonnées non enregistrées : ${error?.message ?? 'erreur'}`);
        return false;
      }
      setProspect(data as Prospect);
      announce('Coordonnées mises à jour.');
      return true;
    },
    [supabase, prospect.id]
  );

  /* ---- Dérivés -------------------------------------------------------- */
  const telHref = prospect.phone
    ? `tel:${prospect.phone.replace(/\s/g, '')}`
    : null;
  const mailHref = prospect.email ? `mailto:${prospect.email}` : null;
  const isActive = !CLOSED_STATUSES.has(status);
  const relanceIso = prospect.next_action_at;
  const relanceOverdueOrMissing =
    isActive && (!relanceIso || new Date(relanceIso).getTime() < Date.now());
  const isHot = isHotClassification(prospect.classification);

  const hasEnrichment = Boolean(
    prospect.analyse_besoin ||
      prospect.analyse_budget ||
      prospect.analyse_timing ||
      prospect.recommandation_approche ||
      (prospect.arguments_cles && prospect.arguments_cles.length > 0) ||
      (prospect.besoins_detectes && prospect.besoins_detectes.length > 0)
  );

  const motionProps: MotionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };

  const visibleActivities = activities.slice(0, visibleCount);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      {/* aria-live global pour le feedback des actions */}
      <div aria-live="polite" role="status" className="sr-only">
        {feedback}
      </div>

      {/* Retour */}
      <div className="mb-6">
        <Link
          href="/prospects"
          className="inline-flex items-center gap-2 rounded-full border border-gnd-bronze/10 bg-white px-4 py-2 text-sm font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux prospects
        </Link>
      </div>

      {/* ================================================================= */}
      {/* A. EN-TÊTE                                                         */}
      {/* ================================================================= */}
      <motion.header
        {...motionProps}
        className="relative mb-8 overflow-hidden rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm sm:p-8"
      >
        <div className="h-px w-full" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar text={prospect.company_name} />
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
                  Fiche prospect
                </span>
                {isHot && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                    <Flame className="h-3 w-3" aria-hidden />
                    Chaud
                  </span>
                )}
              </div>
              <h1 className="font-display text-display-md font-medium leading-[1] tracking-tight text-gnd-bronze">
                {prospect.company_name}
              </h1>
              {(prospect.contact_name || prospect.role_contact) && (
                <p className="mt-2 text-base text-gnd-bronze-soft">
                  {prospect.contact_name ?? prospect.prenom_contact ?? '—'}
                  {prospect.role_contact && (
                    <span className="text-gnd-bronze-faded">
                      {' '}
                      · {prospect.role_contact}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneForStatus(status)}`}
                >
                  {labelForStatus(status)}
                </span>
                {prospect.classification && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gnd-bronze/10 bg-white px-2.5 py-1 text-xs font-medium text-gnd-bronze-soft">
                    <Target className="h-3 w-3" aria-hidden />
                    {prospect.classification}
                  </span>
                )}
                {prospect.city && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gnd-bronze/10 bg-white px-2.5 py-1 text-xs font-medium text-gnd-bronze-soft">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {prospect.city}
                  </span>
                )}
                {prospect.deal_amount != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Banknote className="h-3 w-3" aria-hidden />
                    Signé {formatEurExact(Number(prospect.deal_amount))} HT
                  </span>
                )}
                {prospect.notion_page_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gnd-amber/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gnd-amber-dim">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Notion
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick contact buttons en-tête */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {telHref && (
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Appeler
              </a>
            )}
            {mailHref && (
              <a
                href={mailHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-gnd-bronze/10 bg-white px-4 py-2 text-sm font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Email
              </a>
            )}
          </div>
        </div>
      </motion.header>

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(20rem,24rem)]">
        {/* =============================================================== */}
        {/* COLONNE GAUCHE : infos + analyse + devis + timeline             */}
        {/* =============================================================== */}
        <div className="space-y-6">
          {/* B. BLOC INFOS */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ContactCard
              prospect={prospect}
              telHref={telHref}
              mailHref={mailHref}
              onSave={handleSaveContact}
            />
            <SocialCard prospect={prospect} />
          </section>

          {/* Qualification */}
          <QualificationCard prospect={prospect} />

          {/* Analyse & approche (enrichissement Notion) */}
          {hasEnrichment && <AnalysisSection prospect={prospect} />}

          {/* Devis (Sprint 8) */}
          <QuotesPanel prospectId={prospect.id} initialQuotes={initialQuotes} />

          {/* E. TIMELINE */}
          <section className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-8 bg-gnd-amber" />
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
                Historique d&apos;activité
              </h2>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm italic text-gnd-bronze-faded">
                Aucune activité pour l&apos;instant. Utilise les actions rapides
                pour commencer à tracer ce prospect.
              </p>
            ) : (
              <>
                <ol className="space-y-4">
                  {visibleActivities.map((a) => (
                    <TimelineItem key={a.id} activity={a} />
                  ))}
                </ol>
                {activities.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 30)}
                    className="mt-5 w-full rounded-xl border border-dashed border-gnd-bronze/12 px-3 py-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/[0.04] hover:text-gnd-bronze"
                  >
                    Voir plus ({activities.length - visibleCount} restantes)
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        {/* =============================================================== */}
        {/* COLONNE DROITE : PANNEAU ACTIONS RAPIDES (sticky)               */}
        {/* =============================================================== */}
        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <SequenceEnrollPanel
            prospectId={prospect.id}
            prospectOwnerId={prospect.assigned_to ?? prospect.created_by}
            sequences={activeSequences}
            initialEnrollment={initialEnrollment}
          />
          <ActionsPanel
            status={status}
            relanceIso={relanceIso}
            relanceOverdueOrMissing={relanceOverdueOrMissing}
            openQuick={openQuick}
            onToggleQuick={(k) => setOpenQuick((cur) => (cur === k ? null : k))}
            onQuickActivity={handleQuickActivity}
            onPlanRelance={handlePlanRelance}
            onStatusChange={handleStatusChange}
            notes={prospect.notes}
            onSaveNotes={handleSaveNotes}
          />
        </aside>
      </div>

      {/* Modale « Montant du contrat signé » */}
      {winDealOpen && (
        <WinDealModal
          companyName={prospect.company_name}
          initialAmount={prospect.deal_amount != null ? Number(prospect.deal_amount) : null}
          onConfirm={handleConfirmDeal}
          onClose={() => setWinDealOpen(false)}
        />
      )}
    </div>
  );
}

/* ====================================================================== */
/* Modale « Montant du contrat signé (HT) »                                */
/* ====================================================================== */

function WinDealModal({
  companyName,
  initialAmount,
  onConfirm,
  onClose,
}: {
  companyName: string;
  initialAmount: number | null;
  onConfirm: (amountHt: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(
    initialAmount != null ? String(initialAmount) : ''
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function confirm() {
    const n = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) {
      setErr('Saisis un montant HT valide.');
      return;
    }
    setErr('');
    setSaving(true);
    const ok = await onConfirm(Math.round(n * 100) / 100);
    setSaving(false);
    if (!ok) setErr('Enregistrement impossible. Réessaie.');
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gnd-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Montant du contrat signé"
    >
      <div className="w-full max-w-md rounded-3xl border border-gnd-bronze/10 bg-gnd-paper p-6 shadow-warm-lg">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Banknote className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="font-display text-xl font-medium text-gnd-bronze">
              Contrat signé 🎉
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-4 text-sm text-gnd-bronze-soft">
          Indique le montant HT du contrat signé avec{' '}
          <strong className="text-gnd-bronze">{companyName}</strong>. Il
          déclenche le calcul de ta commission réelle.
        </p>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
            Montant HT signé (€)
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder="Ex. 8500"
            className="w-full rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2.5 text-lg font-semibold tabular-nums text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
        </label>

        {err && (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {err}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* D + C : PANNEAU ACTIONS RAPIDES                                         */
/* ====================================================================== */

function ActionsPanel({
  status,
  relanceIso,
  relanceOverdueOrMissing,
  openQuick,
  onToggleQuick,
  onQuickActivity,
  onPlanRelance,
  onStatusChange,
  notes,
  onSaveNotes,
}: {
  status: string;
  relanceIso: string | null;
  relanceOverdueOrMissing: boolean;
  openQuick: QuickKind | null;
  onToggleQuick: (k: QuickKind) => void;
  onQuickActivity: (k: QuickKind, body: string, callOutcome?: string) => Promise<void>;
  onPlanRelance: (isoOrNull: string | null) => Promise<void>;
  onStatusChange: (next: string) => Promise<void>;
  notes: string | null;
  onSaveNotes: (next: string) => Promise<boolean>;
}) {
  return (
    <div className="space-y-4">
      {/* D. PROCHAINE ACTION IMPOSÉE — bandeau */}
      <NextActionBanner
        relanceIso={relanceIso}
        overdueOrMissing={relanceOverdueOrMissing}
        onPlanRelance={onPlanRelance}
      />

      {/* Panneau actions */}
      <section className="rounded-3xl border border-gnd-amber/20 bg-gnd-paper p-5 shadow-warm-lg">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-gnd-amber" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
            Actions rapides
          </h2>
        </div>

        {/* Boutons 1-clic */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.kind}
              type="button"
              onClick={() => onToggleQuick(qa.kind)}
              aria-expanded={openQuick === qa.kind}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                openQuick === qa.kind
                  ? 'border-gnd-amber bg-gnd-amber/10 text-gnd-amber-dim'
                  : 'border-gnd-bronze/10 bg-white text-gnd-bronze hover:border-gnd-amber/40 hover:bg-gnd-cream'
              }`}
            >
              <span aria-hidden>{iconForActivityKind(qa.kind)}</span>
              {qa.label}
            </button>
          ))}
        </div>

        {/* Champ de saisie de l'action ouverte */}
        {openQuick && (
          <QuickEntry
            key={openQuick}
            kind={openQuick}
            placeholder={
              QUICK_ACTIONS.find((q) => q.kind === openQuick)?.placeholder ?? ''
            }
            onSubmit={onQuickActivity}
            onCancel={() => onToggleQuick(openQuick)}
          />
        )}

        {/* Planifier une relance */}
        <div className="mt-5 border-t border-gnd-bronze/8 pt-5">
          <RelancePlanner relanceIso={relanceIso} onPlanRelance={onPlanRelance} />
        </div>

        {/* Changer le statut */}
        <div className="mt-5 border-t border-gnd-bronze/8 pt-5">
          <label
            htmlFor="fiche-status"
            className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
          >
            Statut du prospect
          </label>
          <select
            id="fiche-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2.5 text-sm font-semibold text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          >
            {!STATUS_OPTIONS.some((o) => o.value === status) && (
              <option value={status}>{labelForStatus(status)}</option>
            )}
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Édition rapide des notes */}
        <div className="mt-5 border-t border-gnd-bronze/8 pt-5">
          <NotesEditor notes={notes} onSave={onSaveNotes} />
        </div>
      </section>
    </div>
  );
}

/* ---- D. Bandeau prochaine action ------------------------------------- */

function NextActionBanner({
  relanceIso,
  overdueOrMissing,
  onPlanRelance,
}: {
  relanceIso: string | null;
  overdueOrMissing: boolean;
  onPlanRelance: (isoOrNull: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save() {
    const iso = dateTimeInputToIso(value);
    if (!iso) return;
    setSaving(true);
    await onPlanRelance(iso);
    setSaving(false);
    setValue('');
  }

  if (overdueOrMissing) {
    return (
      <section
        className="rounded-3xl border border-gnd-amber bg-gnd-amber/10 p-5 shadow-warm"
        aria-label="Prochaine action requise"
      >
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-gnd-amber-dim" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-medium text-gnd-bronze">
              ⚠️ Planifie ta prochaine action
            </p>
            <p className="mt-0.5 text-xs text-gnd-bronze-soft">
              {relanceIso
                ? `Relance dépassée (${formatDate(relanceIso)}). Pose une nouvelle date.`
                : 'Aucune relance prévue sur ce prospect actif.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-label="Date et heure de la prochaine relance"
                className="rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
              />
              <button
                type="button"
                onClick={save}
                disabled={!value || saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gnd-amber px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gnd-amber-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                Planifier
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-5 shadow-warm"
      aria-label="Prochaine relance"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 shrink-0 text-gnd-amber" aria-hidden />
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim">
            Prochaine relance
          </p>
          <p className="mt-0.5 font-display text-base font-medium text-gnd-bronze">
            {relanceIso ? formatRelance(relanceIso) : 'Aucune'}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---- C. Saisie d'une action rapide ----------------------------------- */

function QuickEntry({
  kind,
  placeholder,
  onSubmit,
  onCancel,
}: {
  kind: QuickKind;
  placeholder: string;
  onSubmit: (k: QuickKind, body: string, callOutcome?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState('');
  const [outcome, setOutcome] = useState<string>('answered');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSubmit(kind, body, kind === 'call' ? outcome : undefined);
    setSaving(false);
    setBody('');
  }

  return (
    <div className="mt-3 rounded-2xl border border-gnd-amber/20 bg-white p-3">
      {kind === 'call' && (
        <div
          role="group"
          aria-label="Résultat de l'appel"
          className="mb-2 flex flex-wrap gap-1.5"
        >
          {CALL_OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              aria-pressed={outcome === o.value}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                outcome === o.value
                  ? 'bg-gnd-bronze text-gnd-cream'
                  : 'bg-gnd-cream text-gnd-bronze-soft hover:bg-gnd-sand'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        aria-label={`Détail — ${labelForActivityKind(kind)}`}
        autoFocus
        className="w-full resize-y rounded-xl border border-gnd-bronze/10 bg-white p-2.5 text-sm text-gnd-bronze placeholder:text-gnd-bronze-faded focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gnd-bronze px-3.5 py-1.5 text-xs font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

/* ---- Planificateur de relance (panneau) ------------------------------ */

function RelancePlanner({
  relanceIso,
  onPlanRelance,
}: {
  relanceIso: string | null;
  onPlanRelance: (isoOrNull: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState(toDateTimeInput(relanceIso));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onPlanRelance(dateTimeInputToIso(value));
    setSaving(false);
  }

  async function clear() {
    setValue('');
    setSaving(true);
    await onPlanRelance(null);
    setSaving(false);
  }

  return (
    <div>
      <label
        htmlFor="fiche-relance"
        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim"
      >
        Planifier une relance
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="fiche-relance"
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-xl border border-gnd-bronze/10 bg-white px-3 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !value}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gnd-bronze px-3.5 py-2 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Check className="h-4 w-4" aria-hidden />
          )}
          OK
        </button>
      </div>
      {relanceIso && (
        <button
          type="button"
          onClick={clear}
          disabled={saving}
          className="mt-2 text-xs font-semibold text-gnd-bronze-soft underline underline-offset-2 hover:text-gnd-bronze disabled:opacity-50"
        >
          Retirer la relance
        </button>
      )}
    </div>
  );
}

/* ---- F. Édition rapide des notes ------------------------------------- */

function NotesEditor({
  notes,
  onSave,
}: {
  notes: string | null;
  onSave: (next: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber-dim">
          Notes
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(notes ?? '');
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:text-gnd-bronze"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden />
            {notes ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Contexte, historique, points clés sur ce prospect…"
            aria-label="Notes du prospect"
            autoFocus
            className="w-full resize-y rounded-xl border border-gnd-bronze/10 bg-white p-2.5 text-sm text-gnd-bronze placeholder:text-gnd-bronze-faded focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gnd-bronze px-3.5 py-1.5 text-xs font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              Enregistrer
            </button>
          </div>
        </>
      ) : notes ? (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-sm text-gnd-bronze-soft ring-1 ring-gnd-bronze/8">
          {notes}
        </p>
      ) : (
        <p className="text-xs italic text-gnd-bronze-faded">
          Aucune note pour ce prospect.
        </p>
      )}
    </div>
  );
}

/* ====================================================================== */
/* B. Cartes infos                                                         */
/* ====================================================================== */

function ContactCard({
  prospect,
  telHref,
  mailHref,
  onSave,
}: {
  prospect: Prospect;
  telHref: string | null;
  mailHref: string | null;
  onSave: (patch: {
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
  }) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(prospect.phone ?? '');
  const [email, setEmail] = useState(prospect.email ?? '');
  const [website, setWebsite] = useState(prospect.website ?? '');
  const [address, setAddress] = useState(prospect.address ?? '');
  const [city, setCity] = useState(prospect.city ?? '');

  function reset() {
    setPhone(prospect.phone ?? '');
    setEmail(prospect.email ?? '');
    setWebsite(prospect.website ?? '');
    setAddress(prospect.address ?? '');
    setCity(prospect.city ?? '');
  }

  async function save() {
    setSaving(true);
    const ok = await onSave({
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  const websiteHref = prospect.website
    ? prospect.website.startsWith('http')
      ? prospect.website
      : `https://${prospect.website}`
    : null;
  const adresse = prospect.address ?? prospect.city;

  return (
    <InfoCard
      icon={<User className="h-4 w-4" />}
      title="Coordonnées"
      action={
        !editing ? (
          <button
            type="button"
            onClick={() => {
              reset();
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:text-gnd-bronze"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden />
            Modifier
          </button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-2">
          <Field label="Téléphone" value={phone} onChange={setPhone} type="tel" />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Site web" value={website} onChange={setWebsite} />
          <Field label="Adresse" value={address} onChange={setAddress} />
          <Field label="Ville" value={city} onChange={setCity} />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gnd-bronze px-3.5 py-1.5 text-xs font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <KVLine
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Téléphone"
            value={prospect.phone}
            href={telHref}
          />
          <KVLine
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            value={prospect.email}
            href={mailHref}
            truncate
          />
          <KVLine
            icon={<Globe className="h-3.5 w-3.5" />}
            label="Site web"
            value={prospect.website}
            href={websiteHref}
            external
            truncate
          />
          <KVLine
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Adresse"
            value={adresse}
          />
          {!prospect.phone &&
            !prospect.email &&
            !prospect.website &&
            !adresse && (
              <p className="text-xs italic text-gnd-bronze-faded">
                Aucune coordonnée renseignée.
              </p>
            )}
        </div>
      )}
    </InfoCard>
  );
}

function SocialCard({ prospect }: { prospect: Prospect }) {
  const socials = [
    {
      icon: <Instagram className="h-4 w-4" />,
      label: 'Instagram',
      value: prospect.instagram,
      href: (v: string) =>
        v.startsWith('http')
          ? v
          : `https://www.instagram.com/${v.replace(/^@/, '')}/`,
    },
    {
      icon: <Facebook className="h-4 w-4" />,
      label: 'Facebook',
      value: prospect.facebook,
      href: (v: string) => v,
    },
    {
      icon: <Linkedin className="h-4 w-4" />,
      label: 'LinkedIn entreprise',
      value: prospect.linkedin_entreprise,
      href: (v: string) => v,
    },
    {
      icon: <Linkedin className="h-4 w-4" />,
      label: 'LinkedIn contact',
      value: prospect.linkedin_contact,
      href: (v: string) => v,
    },
    {
      icon: <Music2 className="h-4 w-4" />,
      label: 'TikTok',
      value: prospect.tiktok,
      href: (v: string) =>
        v.startsWith('http') ? v : `https://www.tiktok.com/@${v.replace(/^@/, '')}`,
    },
  ].filter((s) => s.value);

  return (
    <InfoCard icon={<Globe className="h-4 w-4" />} title="Réseaux sociaux">
      {socials.length === 0 ? (
        <p className="text-xs italic text-gnd-bronze-faded">
          Aucune présence sociale renseignée.
        </p>
      ) : (
        <div className="space-y-1">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href(s.value as string)}
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-1.5 flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-gnd-cream"
            >
              <span className="shrink-0 text-gnd-bronze-faded">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
                  {s.label}
                </p>
                <p className="truncate text-sm text-gnd-amber-dim">{s.value}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gnd-bronze-faded" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </InfoCard>
  );
}

function QualificationCard({ prospect }: { prospect: Prospect }) {
  const noteGoogle =
    prospect.note_google != null
      ? `${prospect.note_google}${
          prospect.nombre_avis != null ? ` · ${prospect.nombre_avis} avis` : ''
        }`
      : null;
  return (
    <InfoCard icon={<TrendingUp className="h-4 w-4" />} title="Qualification">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          icon={<Banknote className="h-3.5 w-3.5" />}
          label="CA estimé"
          value={prospect.ca_estime}
        />
        <Stat
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Secteur"
          value={prospect.sector}
        />
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label="Taille"
          value={prospect.taille_entreprise}
        />
        <Stat
          icon={<Star className="h-3.5 w-3.5" />}
          label="Note Google"
          value={noteGoogle}
        />
      </div>
    </InfoCard>
  );
}

/* ====================================================================== */
/* Analyse & approche (enrichissement Notion)                              */
/* ====================================================================== */

function AnalysisSection({ prospect }: { prospect: Prospect }) {
  return (
    <section className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-px w-8 bg-gnd-amber" />
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
          Analyse &amp; approche
        </h2>
      </div>

      {/* Tags : besoins + arguments */}
      {((prospect.besoins_detectes && prospect.besoins_detectes.length > 0) ||
        (prospect.arguments_cles && prospect.arguments_cles.length > 0)) && (
        <div className="mb-5 space-y-3">
          {prospect.besoins_detectes && prospect.besoins_detectes.length > 0 && (
            <TagGroup
              icon={<Tag className="h-3.5 w-3.5" />}
              title="Besoins détectés"
              tags={prospect.besoins_detectes}
              tone="bg-sky-50 text-sky-700 ring-sky-200"
            />
          )}
          {prospect.arguments_cles && prospect.arguments_cles.length > 0 && (
            <TagGroup
              icon={<Lightbulb className="h-3.5 w-3.5" />}
              title="Arguments clés"
              tags={prospect.arguments_cles}
              tone="bg-emerald-50 text-emerald-700 ring-emerald-200"
            />
          )}
        </div>
      )}

      {/* Blocs d'analyse (texte) */}
      <div className="space-y-4">
        {prospect.analyse_besoin && (
          <AnalysisBlock
            icon={<Target className="h-4 w-4" />}
            title="Analyse du besoin"
            text={prospect.analyse_besoin}
            accent="border-sky-200 bg-sky-50/60"
            headColor="text-sky-800"
          />
        )}
        {prospect.analyse_timing && (
          <AnalysisBlock
            icon={<Clock className="h-4 w-4" />}
            title="Analyse du timing"
            text={prospect.analyse_timing}
            accent="border-violet-200 bg-violet-50/60"
            headColor="text-violet-800"
          />
        )}
        {prospect.analyse_budget && (
          <AnalysisBlock
            icon={<Banknote className="h-4 w-4" />}
            title="Analyse du budget"
            text={prospect.analyse_budget}
            accent="border-emerald-200 bg-emerald-50/60"
            headColor="text-emerald-800"
          />
        )}
        {prospect.recommandation_approche && (
          <AnalysisBlock
            icon={<Lightbulb className="h-4 w-4" />}
            title="Recommandation commerciale"
            text={prospect.recommandation_approche}
            accent="border-amber-200 bg-amber-50/70"
            headColor="text-amber-800"
          />
        )}
      </div>
    </section>
  );
}

function AnalysisBlock({
  icon,
  title,
  text,
  accent,
  headColor,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  accent: string;
  headColor: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <div
        className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${headColor}`}
      >
        <span aria-hidden>{icon}</span>
        {title}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gnd-bronze">
        {text}
      </p>
    </div>
  );
}

function TagGroup({
  icon,
  title,
  tags,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  tags: string[];
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
        <span aria-hidden>{icon}</span>
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* E. Timeline item                                                        */
/* ====================================================================== */

function TimelineItem({ activity: a }: { activity: Activity }) {
  const { from, to } = statusChangeParts(a.metadata);
  const outcome =
    a.metadata && typeof a.metadata.outcome === 'string'
      ? (a.metadata.outcome as string)
      : null;
  const outcomeLabel =
    outcome === 'answered'
      ? 'Répondu'
      : outcome === 'no_answer'
        ? 'Pas répondu'
        : outcome === 'voicemail'
          ? 'Messagerie'
          : null;

  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gnd-cream text-sm ring-1 ring-gnd-bronze/10"
        aria-hidden
      >
        {iconForActivityKind(a.kind)}
      </span>
      <div className="min-w-0 flex-1 border-b border-gnd-bronze/6 pb-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gnd-bronze-soft">
            {labelForActivityKind(a.kind)}
          </span>
          {outcomeLabel && (
            <span className="rounded-full bg-gnd-sand px-2 py-0.5 text-[10px] font-semibold text-gnd-bronze-soft">
              {outcomeLabel}
            </span>
          )}
          <span className="font-mono text-[11px] text-gnd-bronze-faded">
            {formatStamp(a.occurred_at)}
          </span>
        </div>
        {a.kind === 'status_change' && (from || to) ? (
          <p className="mt-0.5 text-sm text-gnd-bronze-soft">
            {from ? labelForStatus(from) : '—'} <span aria-hidden>→</span>{' '}
            <span className="font-medium text-gnd-bronze">
              {to ? labelForStatus(to) : '—'}
            </span>
          </p>
        ) : a.body ? (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gnd-bronze">
            {a.body}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* ====================================================================== */
/* Primitives UI                                                           */
/* ====================================================================== */

function InfoCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-5 shadow-warm">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gnd-bronze-faded">
          <span aria-hidden className="text-gnd-amber-dim">
            {icon}
          </span>
          {title}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function KVLine({
  icon,
  label,
  value,
  href,
  external,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string | null;
  external?: boolean;
  truncate?: boolean;
}) {
  if (!value) return null;
  const valueClass = `text-sm text-gnd-bronze ${truncate ? 'truncate' : 'break-words'}`;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-gnd-bronze-faded" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={`${valueClass} text-gnd-amber-dim hover:underline`}
          >
            {value}
          </a>
        ) : (
          <p className={valueClass}>{value}</p>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl bg-white p-2.5 ring-1 ring-gnd-bronze/8">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
        {icon}
        {label}
      </div>
      <p className="mt-1 break-words text-sm font-semibold text-gnd-bronze">
        {value ?? '—'}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-1.5 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
      />
    </label>
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
  const initials =
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-xl font-medium text-gnd-cream shadow-warm ${grad}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
