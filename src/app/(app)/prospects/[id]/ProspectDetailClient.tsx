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
import RecallDatePicker from '@/components/gnd/RecallDatePicker';
import ProspectIntelPanel from './ProspectIntelPanel';
import GenerateMockupButton from './GenerateMockupButton';
import type { EnrichmentPayload } from '@/lib/prospect-intel';
import type { MockupRow } from '@/lib/site-mockup';
import type { SiteBriefRow } from '@/lib/site-brief';

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
  // Montant HT signé — chargé en SSR depuis prospect_finance UNIQUEMENT pour un
  // admin (migration 0021). null = absent OU rôle non autorisé à le voir.
  initialDealAmount: number | null;
  // L'utilisateur courant peut-il voir/saisir les montants financiers ?
  // (admin / admin_limited). Pour les autres rôles, on n'affiche rien.
  canViewFinance: boolean;
  // Renseignements IA (intel d'enrichissement) + maquette Studio — déplacés
  // depuis la route serveur pour s'afficher SOUS le hero, en tête de la colonne
  // gauche. Présentation uniquement : aucune logique de fetch ici.
  intel?: EnrichmentPayload | null;
  intelCreatedAt?: string | null;
  mockup?: MockupRow | null;
  brief?: SiteBriefRow | null;
  mockupProspectId?: string;
};

export default function ProspectDetailClient({
  initialProspect,
  initialActivities,
  activeSequences,
  initialEnrollment,
  initialQuotes,
  initialDealAmount,
  canViewFinance,
  intel,
  intelCreatedAt,
  mockup,
  brief,
  mockupProspectId,
}: ProspectDetailClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const reduceMotion = useReducedMotion();

  const [prospect, setProspect] = useState<Prospect>(initialProspect);
  // Montant signé géré en état local séparé : il ne vit plus sur l'objet
  // prospect (déplacé dans prospect_finance, RLS admin-only — migration 0021).
  const [dealAmount, setDealAmount] = useState<number | null>(initialDealAmount);
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
      // Optimistic local sur dealAmount (état séparé, le montant ne vit plus
      // sur l'objet prospect — migration 0021). Mémorise l'ancienne valeur pour
      // pouvoir rollback si la commission n'est pas enregistrée côté serveur.
      const previousDeal = dealAmount;
      setDealAmount(amountHt);
      const res = await recordCommission(prospect.id, amountHt);
      if (res.error) {
        // Rollback de l'optimistic : le montant n'a PAS été persisté.
        setDealAmount(previousDeal);
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
    [prospect.id, dealAmount, insertActivity]
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
      <div className="mb-4">
        <Link
          href="/prospects"
          className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-ink-warm transition hover:bg-cream-deep card-hover"
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
        className="surface-chocolate relative mb-4 overflow-hidden rounded-[16px] p-5 sm:p-6"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute right-5 top-1 select-none font-marcellus text-[104px] leading-none text-cream/[0.08]"
        >
          {prospect.company_name?.charAt(0) ?? '·'}
        </span>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden
              className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[15px] bg-brand font-marcellus text-2xl text-[#3A2017] shadow-[0_8px_22px_rgba(201,106,43,0.45)]"
            >
              {prospect.company_name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? '')
                .join('') || '?'}
            </span>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-grotesk text-[11px] uppercase tracking-[0.14em] text-[#E7A86F]">
                  <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
                  Fiche prospect
                </span>
                {isHot && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F2C29B]">
                    <Flame className="h-3 w-3" aria-hidden />
                    Chaud
                  </span>
                )}
              </div>
              <h1 className="font-marcellus text-[2rem] font-medium leading-[1.05] text-cream sm:text-4xl">
                {prospect.company_name}
              </h1>
              {(prospect.contact_name || prospect.role_contact) && (
                <p className="mt-1.5 text-sm text-cream/60">
                  {prospect.contact_name ?? prospect.prenom_contact ?? '—'}
                  {prospect.role_contact && (
                    <span> · {prospect.role_contact}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Quick contact buttons en-tête */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {telHref && (
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-[#3A2017] shadow-[0_8px_22px_rgba(201,106,43,0.4)] transition hover:bg-brand-dark"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Appeler
              </a>
            )}
            {mailHref && (
              <a
                href={mailHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream/25 px-4 py-2.5 text-sm text-cream transition hover:bg-cream/10"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Email
              </a>
            )}
          </div>
        </div>

        {/* Rangée badges — clair sur chocolat */}
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-[#F2C29B]">
            {labelForStatus(status)}
          </span>
          {prospect.note_google != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/80">
              <Star className="h-3 w-3 text-brand" aria-hidden />
              <span className="font-num tabular-nums">{prospect.note_google}</span>
            </span>
          )}
          {prospect.classification && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/80">
              <Target className="h-3 w-3 text-brand" aria-hidden />
              {prospect.classification}
            </span>
          )}
          {prospect.sector && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/80">
              <Building2 className="h-3 w-3 text-brand" aria-hidden />
              {prospect.sector}
            </span>
          )}
          {prospect.city && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/80">
              <MapPin className="h-3 w-3 text-brand" aria-hidden />
              {prospect.city}
            </span>
          )}
          {canViewFinance && dealAmount != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-[#F2C29B]">
              <Banknote className="h-3 w-3" aria-hidden />
              Signé{' '}
              <span className="font-num tabular-nums">
                {formatEurExact(Number(dealAmount))}
              </span>{' '}
              HT
            </span>
          )}
          {prospect.notion_page_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/80">
              <Sparkles className="h-3 w-3 text-brand" aria-hidden />
              Notion
            </span>
          )}
        </div>
      </motion.header>

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-2xl border border-danger-fg/20 bg-danger-bg p-3.5 text-sm text-danger-fg"
        >
          {errorMsg}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.62fr_1fr]">
        {/* =============================================================== */}
        {/* COLONNE GAUCHE : infos + analyse + devis + timeline             */}
        {/* =============================================================== */}
        <div className="flex flex-col gap-3">
          {/* Renseignements IA — affiché en tête, juste sous le hero */}
          {intel ? (
            <div className="panel p-4">
              <ProspectIntelPanel
                intel={intel}
                createdAt={intelCreatedAt ?? null}
              />
            </div>
          ) : null}

          {/* Maquette Studio — rangée compacte une ligne */}
          {mockupProspectId ? (
            <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt"
                >
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-burnt">
                    Maquette Studio
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#6F5A50]">
                    Genere une maquette one-page a partir de ce prospect.
                  </p>
                </div>
              </div>
              <GenerateMockupButton
                prospectId={mockupProspectId}
                mockup={mockup ?? null}
                brief={brief ?? null}
              />
            </section>
          ) : null}

          {/* B. BLOC INFOS */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2 font-grotesk text-[11px] uppercase tracking-[0.12em] text-brand-burnt">
              <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
              Historique d&apos;activité
            </div>
            {activities.length === 0 ? (
              <div className="divider-warm flex items-center gap-2.5 pt-3 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
                  <Clock className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-[13px] text-[#6F5A50]">
                  Aucune activité pour l&apos;instant. Utilise les actions rapides
                  pour commencer à tracer ce prospect.
                </p>
              </div>
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
                    className="mt-5 w-full rounded-2xl border border-dashed border-[rgba(74,36,26,0.10)] px-3 py-2.5 text-center font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-burnt transition hover:bg-cream-deep hover:text-choco"
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
        <aside className="self-start lg:sticky lg:top-4 flex flex-col gap-3">
          {prospect.note_google != null && (
            <section className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-grotesk text-xs text-muted-warm">
                  <Star className="h-3.5 w-3.5 text-brand" aria-hidden />
                  Note Google
                </span>
                {isHot && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF1E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-burnt">
                    <Flame className="h-3 w-3" aria-hidden />
                    Prioritaire
                  </span>
                )}
              </div>
              <p className="mt-1 font-num text-4xl font-medium tabular-nums text-[#3A2017]">
                {prospect.note_google}
                {prospect.nombre_avis != null && (
                  <span className="ml-2 align-middle text-sm text-muted-warm">
                    · <span className="font-num tabular-nums">{prospect.nombre_avis}</span> avis
                  </span>
                )}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-cream-edge shadow-[inset_0_1px_2px_rgba(74,36,26,0.18)]">
                <div
                  className="h-1.5 rounded-full bg-brand"
                  style={{
                    width: `${Math.max(0, Math.min(100, (Number(prospect.note_google) / 5) * 100))}%`,
                  }}
                />
              </div>
            </section>
          )}
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
          initialAmount={dealAmount != null ? Number(dealAmount) : null}
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2A1510]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Montant du contrat signé"
    >
      <div className="surface-ceramic w-full max-w-md rounded-[28px] p-6 shadow-ceramic">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ok-bg text-ok-fg">
              <Banknote className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="font-marcellus text-xl font-medium text-choco">
              Contrat signé 🎉
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1.5 text-muted-warm transition hover:bg-cream-deep hover:text-choco"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-4 text-sm text-[#6F5A50]">
          Indique le montant HT du contrat signé avec{' '}
          <strong className="text-choco">{companyName}</strong>. Il
          déclenche le calcul de ta commission réelle.
        </p>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
            Montant HT signé (€)
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder="Ex. 8500"
            className="w-full rounded-2xl border border-border-soft bg-cream/60 px-3.5 py-2.5 font-num text-lg font-semibold tabular-nums text-choco focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
        </label>

        {err && (
          <p role="alert" className="mt-2 text-sm text-danger-fg">
            {err}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-warm transition hover:bg-cream-deep hover:text-choco"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:opacity-50"
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
    <div className="flex flex-col gap-3">
      {/* D. PROCHAINE ACTION IMPOSÉE — bandeau */}
      <NextActionBanner
        relanceIso={relanceIso}
        overdueOrMissing={relanceOverdueOrMissing}
        onPlanRelance={onPlanRelance}
      />

      {/* Panneau actions */}
      <section className="panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] uppercase tracking-[0.12em] text-brand-burnt">
            Actions rapides
          </span>
        </div>

        {/* Boutons 1-clic — pills ghost */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.kind}
              type="button"
              onClick={() => onToggleQuick(qa.kind)}
              aria-expanded={openQuick === qa.kind}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-sm font-medium transition ${
                openQuick === qa.kind
                  ? 'border-brand bg-[#FBF1E8] text-brand-burnt'
                  : 'border-[rgba(74,36,26,0.18)] bg-white text-choco hover:border-brand/40 hover:bg-[#FBF1E8]'
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
        <div className="divider-warm mt-3 pt-3">
          <RelancePlanner relanceIso={relanceIso} onPlanRelance={onPlanRelance} />
        </div>

        {/* Changer le statut */}
        <div className="divider-warm mt-3 pt-3">
          <label
            htmlFor="fiche-status"
            className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
          >
            Statut du prospect
          </label>
          <select
            id="fiche-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full rounded-2xl border border-border-soft bg-cream/60 px-3.5 py-2.5 text-sm font-semibold text-choco focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
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
        <div className="divider-warm mt-3 pt-3">
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
        className="panel-accent p-4"
        aria-label="Prochaine action requise"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-marcellus text-base font-medium text-choco">
              ⚠️ Planifie ta prochaine action
            </p>
            <p className="mt-0.5 text-xs text-[#6F5A50]">
              {relanceIso
                ? `Relance dépassée (${formatDate(relanceIso)}). Pose une nouvelle date.`
                : 'Aucune relance prévue sur ce prospect actif.'}
            </p>
            <div className="mt-2 space-y-2 rounded-xl bg-white/75 p-3">
              <RecallDatePicker value={value} onChange={setValue} />
              <button
                type="button"
                onClick={save}
                disabled={!value || saving}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] shadow-[0_8px_22px_rgba(201,106,43,0.30)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
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
      className="panel-accent p-4"
      aria-label="Prochaine relance"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FBF1E8] text-brand-burnt">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="flex items-center gap-1.5 font-grotesk text-[11px] uppercase tracking-[0.12em] text-brand-burnt">
            <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            Prochaine relance
          </p>
          <p className="mt-0.5 font-num text-base font-medium tabular-nums text-choco">
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
    <div className="mt-3 rounded-2xl border border-brand/20 bg-cream/40 p-3">
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
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                outcome === o.value
                  ? 'bg-brand text-[#2A1810]'
                  : 'bg-white text-muted-warm hover:bg-cream-deep'
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
        className="w-full resize-y rounded-2xl border border-border-soft bg-white p-2.5 text-sm text-ink-warm placeholder:text-muted-warm/70 focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-warm transition hover:bg-cream-deep hover:text-choco"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
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
        className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt"
      >
        Planifier une relance
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/75 p-3">
        <RecallDatePicker value={value} onChange={setValue} />
        <button
          type="button"
          onClick={save}
          disabled={saving || !value}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-semibold text-[#2A1810] shadow-[0_8px_22px_rgba(201,106,43,0.30)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
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
          className="mt-2 text-xs font-semibold text-muted-warm underline underline-offset-2 hover:text-ink-warm disabled:opacity-50"
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
        <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
          Notes
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(notes ?? '');
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-warm transition hover:text-choco"
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
            className="w-full resize-y rounded-2xl border border-border-soft bg-cream/60 p-2.5 text-sm text-ink-warm placeholder:text-muted-warm/70 focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-warm transition hover:bg-cream-deep hover:text-choco"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:opacity-50"
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
        <p className="whitespace-pre-wrap break-words rounded-2xl bg-cream/50 p-3 text-sm text-ink-warm ring-1 ring-[rgba(74,36,26,0.10)]">
          {notes}
        </p>
      ) : (
        <p className="text-xs italic text-muted-warm/70">
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
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-warm transition hover:text-choco"
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
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-warm transition hover:bg-cream-deep hover:text-choco"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:opacity-50"
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
        <div>
          <KVLine
            icon={<Phone className="h-3.5 w-3.5" />}
            label="Téléphone"
            value={prospect.phone}
            href={telHref}
            numeric
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
              <p className="text-xs italic text-muted-warm/70">
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
        <p className="text-xs italic text-muted-warm/70">
          Aucune présence sociale renseignée.
        </p>
      ) : (
        <div>
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href(s.value as string)}
              target="_blank"
              rel="noopener noreferrer"
              className="divider-warm flex items-center gap-2 py-1.5 transition first:border-t-0 first:pt-0 hover:bg-cream-deep"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-pale text-brand-burnt">{s.icon}</span>
              <p className="shrink-0 font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
                {s.label}
              </p>
              <p className="min-w-0 flex-1 truncate text-right text-sm text-ink-warm">{s.value}</p>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-warm/70" aria-hidden />
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
      <div className="flex flex-wrap gap-x-0 gap-y-2">
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
    <section className="panel p-4">
      <div className="mb-3 flex items-center gap-2 font-grotesk text-[11px] uppercase tracking-[0.12em] text-brand-burnt">
        <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
        Analyse &amp; approche
      </div>

      {/* Tags : besoins + arguments */}
      {((prospect.besoins_detectes && prospect.besoins_detectes.length > 0) ||
        (prospect.arguments_cles && prospect.arguments_cles.length > 0)) && (
        <div className="mb-3 space-y-2.5">
          {prospect.besoins_detectes && prospect.besoins_detectes.length > 0 && (
            <TagGroup
              icon={<Tag className="h-3.5 w-3.5" />}
              title="Besoins détectés"
              tags={prospect.besoins_detectes}
              tone="bg-info-bg text-info-fg ring-[rgba(49,104,156,0.25)]"
            />
          )}
          {prospect.arguments_cles && prospect.arguments_cles.length > 0 && (
            <TagGroup
              icon={<Lightbulb className="h-3.5 w-3.5" />}
              title="Arguments clés"
              tags={prospect.arguments_cles}
              tone="bg-ok-bg text-ok-fg ring-[rgba(74,36,26,0.12)]"
            />
          )}
        </div>
      )}

      {/* Blocs d'analyse — grille 2×2, un bloc accent sombre */}
      <div className="grid grid-cols-2 gap-2.5">
        {prospect.analyse_besoin && (
          <AnalysisBlock
            icon={<Target className="h-3.5 w-3.5" />}
            title="Analyse du besoin"
            text={prospect.analyse_besoin}
          />
        )}
        {prospect.analyse_timing && (
          <AnalysisBlock
            icon={<Clock className="h-3.5 w-3.5" />}
            title="Analyse du timing"
            text={prospect.analyse_timing}
          />
        )}
        {prospect.analyse_budget && (
          <AnalysisBlock
            icon={<Banknote className="h-3.5 w-3.5" />}
            title="Analyse du budget"
            text={prospect.analyse_budget}
          />
        )}
        {prospect.recommandation_approche && (
          <AnalysisBlock
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            title="Recommandation commerciale"
            text={prospect.recommandation_approche}
            dark
          />
        )}
      </div>
    </section>
  );
}

/**
 * Découpe un texte d'analyse en sous-sections « intitulé en gras + corps ».
 *
 * Présentation uniquement : ne modifie pas la donnée, ne fait que repérer les
 * intitulés (courte amorce capitalisée terminée par un point, ex. « Identité de
 * l'entreprise. », « Présence digitale actuelle. », « Manques identifiés. »)
 * pour les afficher en label eyebrow + corps resserré. Si aucun intitulé n'est
 * détecté, retourne le texte tel quel en un seul bloc de corps.
 */
function splitAnalysisLeads(
  text: string
): { lead: string | null; body: string }[] {
  const re = /(^|\n|\.\s+)([A-ZÀ-ÖØ-Þ][^.\n]{2,60}?)\.(?=\s)/g;
  const out: { lead: string | null; body: string }[] = [];
  let lastIndex = 0;
  let pendingLead: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const leadText = match[2].trim();
    // Une amorce = phrase courte sans espace-final ambigu ; on ignore les
    // fragments qui ressemblent à une phrase normale (présence de virgule
    // longue déjà couverte par la limite de longueur ci-dessus).
    const bodyChunk = text.slice(lastIndex, match.index).trim();
    if (bodyChunk || pendingLead) {
      out.push({ lead: pendingLead, body: bodyChunk });
    }
    pendingLead = leadText;
    lastIndex = re.lastIndex;
  }

  const tail = text.slice(lastIndex).trim();
  if (pendingLead || tail) {
    out.push({ lead: pendingLead, body: tail });
  }

  // Filtre les blocs totalement vides (lead null + body vide).
  const cleaned = out.filter((s) => s.lead || s.body);
  if (cleaned.length === 0) return [{ lead: null, body: text.trim() }];
  return cleaned;
}

function AnalysisBody({ text, dark }: { text: string; dark?: boolean }) {
  const sections = splitAnalysisLeads(text);
  const leadTone = dark ? 'text-[#F2C29B]' : 'text-brand-burnt';
  const bodyTone = dark ? 'text-cream/85' : 'text-[#5C3A2C]';

  return (
    <div>
      {sections.map((s, i) => (
        <div
          key={i}
          className={i > 0 ? 'divider-warm pt-3 mt-3' : undefined}
        >
          {s.lead && (
            <div
              className={`font-grotesk text-[11px] font-semibold uppercase tracking-[0.1em] ${leadTone}`}
            >
              {s.lead}
            </div>
          )}
          {s.body && (
            <p
              className={`${s.lead ? 'mt-1 ' : ''}whitespace-pre-wrap break-words text-[13px] leading-relaxed max-w-[60ch] ${bodyTone}`}
            >
              {s.body}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function AnalysisBlock({
  icon,
  title,
  text,
  dark,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <div className="surface-chocolate rounded-[10px] p-4">
        <div className="mb-2 flex items-center gap-1.5 font-grotesk text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F2C29B]">
          <span aria-hidden>{icon}</span>
          {title}
        </div>
        <AnalysisBody text={text} dark />
      </div>
    );
  }
  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center gap-1.5 font-grotesk text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-burnt">
        <span aria-hidden>{icon}</span>
        {title}
      </div>
      <AnalysisBody text={text} />
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
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
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
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-sm text-brand-burnt"
        aria-hidden
      >
        {iconForActivityKind(a.kind)}
      </span>
      <div className="min-w-0 flex-1 border-b border-[rgba(74,36,26,0.10)] pb-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-burnt">
            {labelForActivityKind(a.kind)}
          </span>
          {outcomeLabel && (
            <span className="rounded-full bg-cream-edge px-2 py-0.5 text-[10px] font-semibold text-muted-warm">
              {outcomeLabel}
            </span>
          )}
          <span className="font-num text-[11px] tabular-nums text-muted-warm/70">
            {formatStamp(a.occurred_at)}
          </span>
        </div>
        {a.kind === 'status_change' && (from || to) ? (
          <p className="mt-0.5 text-sm text-muted-warm">
            {from ? labelForStatus(from) : '—'} <span aria-hidden>→</span>{' '}
            <span className="font-medium text-ink-warm">
              {to ? labelForStatus(to) : '—'}
            </span>
          </p>
        ) : a.body ? (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-warm">
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
    <section className="panel p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-grotesk text-[11px] uppercase tracking-[0.12em] text-brand-burnt">
          <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span aria-hidden className="text-brand-burnt">{icon}</span>
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
  numeric,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string | null;
  external?: boolean;
  truncate?: boolean;
  numeric?: boolean;
}) {
  if (!value) return null;
  const valueClass = `text-sm text-ink-warm ${numeric ? 'font-num tabular-nums' : ''} ${truncate ? 'truncate' : 'break-words'} text-right`;
  return (
    <div className="divider-warm flex items-center gap-2 py-1.5 first:border-t-0 first:pt-0">
      <span className="shrink-0 text-brand-burnt" aria-hidden>
        {icon}
      </span>
      <p className="shrink-0 font-grotesk text-[10px] uppercase tracking-[0.14em] text-brand-burnt">
        {label}
      </p>
      <div className="min-w-0 flex-1 text-right">
        {href ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={`${valueClass} block text-brand-dark hover:underline`}
          >
            {value}
          </a>
        ) : (
          <p className={`${valueClass} block`}>{value}</p>
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
    <div className="min-w-[5.5rem] flex-1 border-l border-[rgba(74,36,26,0.07)] px-3 first:border-l-0 first:pl-0">
      <div className="flex items-center gap-1 font-grotesk text-[10px] uppercase tracking-wide text-muted-warm">
        <span className="text-brand-burnt">{icon}</span>
        {label}
      </div>
      <p className="mt-0.5 break-words font-num text-sm font-medium tabular-nums text-[#3A2017]">
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
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border-soft bg-cream/60 px-3 py-2 text-sm text-ink-warm focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
      />
    </label>
  );
}
