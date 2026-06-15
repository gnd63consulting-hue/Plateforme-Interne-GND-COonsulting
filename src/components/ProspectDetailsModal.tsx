'use client';

import { useEffect } from 'react';
import {
  Banknote,
  Building2,
  Clock,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Lightbulb,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Phone,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  labelForStatus,
  toneForStatus,
  type Prospect,
} from '@/lib/prospects';

type ProspectDetailsModalProps = {
  prospect: Prospect | null;
  onClose: () => void;
};

// =====================================================================
// Themes — used by ParsedAnalysis / ThemedCard to render section header,
// bullets, and inline highlights consistently across the 4 analysis
// cards (Besoin, Timing, Budget, Recommandation).
// =====================================================================

type AnalysisTheme = {
  cardClass: string;
  headerColor: string;
  iconColor: string;
  bodyColor: string;
  sectionLabelColor: string;
  bulletColor: string;
  boldColor: string;
  linkColor: string;
  phoneBg: string;
  phoneText: string;
  handleColor: string;
};

const RECOMMENDATION_THEME: AnalysisTheme = {
  cardClass:
    'rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 ring-1 ring-amber-200/70 shadow-sm',
  headerColor: 'text-amber-800',
  iconColor: 'text-amber-700',
  bodyColor: 'text-amber-950',
  sectionLabelColor: 'text-amber-700',
  bulletColor: 'bg-amber-500/70',
  boldColor: 'text-amber-950',
  linkColor: 'text-amber-700',
  phoneBg: 'bg-amber-100/60',
  phoneText: 'text-amber-800',
  handleColor: 'text-amber-700',
};

const BESOIN_THEME: AnalysisTheme = {
  cardClass:
    'rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/60 p-4 ring-1 ring-sky-200/70 shadow-sm',
  headerColor: 'text-sky-800',
  iconColor: 'text-sky-700',
  bodyColor: 'text-sky-950',
  sectionLabelColor: 'text-sky-700',
  bulletColor: 'bg-sky-500/70',
  boldColor: 'text-sky-950',
  linkColor: 'text-sky-700',
  phoneBg: 'bg-sky-100/60',
  phoneText: 'text-sky-800',
  handleColor: 'text-sky-700',
};

const TIMING_THEME: AnalysisTheme = {
  cardClass:
    'rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/60 p-4 ring-1 ring-violet-200/70 shadow-sm',
  headerColor: 'text-violet-800',
  iconColor: 'text-violet-700',
  bodyColor: 'text-violet-950',
  sectionLabelColor: 'text-violet-700',
  bulletColor: 'bg-violet-500/70',
  boldColor: 'text-violet-950',
  linkColor: 'text-violet-700',
  phoneBg: 'bg-violet-100/60',
  phoneText: 'text-violet-800',
  handleColor: 'text-violet-700',
};

const BUDGET_THEME: AnalysisTheme = {
  cardClass:
    'rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4 ring-1 ring-emerald-200/70 shadow-sm',
  headerColor: 'text-emerald-800',
  iconColor: 'text-emerald-700',
  bodyColor: 'text-emerald-950',
  sectionLabelColor: 'text-emerald-700',
  bulletColor: 'bg-emerald-500/70',
  boldColor: 'text-emerald-950',
  linkColor: 'text-emerald-700',
  phoneBg: 'bg-emerald-100/60',
  phoneText: 'text-emerald-800',
  handleColor: 'text-emerald-700',
};

/**
 * Modal en lecture seule affichant l'enrichissement Notion complet d'un
 * prospect.
 *
 * Source de vérité : Notion (cf. base "Pipeline Prospects GND"). Pour
 * modifier un de ces champs, éditer la page Notion correspondante puis
 * lancer le sync (ou attendre le cron Vercel 6h).
 */
export default function ProspectDetailsModal({
  prospect,
  onClose,
}: ProspectDetailsModalProps) {
  // Lock body scroll + handle Escape key while the modal is mounted.
  useEffect(() => {
    if (!prospect) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', handler);
    };
  }, [prospect, onClose]);

  if (!prospect) return null;

  const decisionnaireDisplay =
    prospect.contact_name?.trim() ||
    prospect.prenom_contact?.trim() ||
    null;
  const adressePrecise = prospect.address ?? prospect.city;
  const avatarColor = colorFromName(prospect.company_name);
  const avatarInitials = initials(prospect.company_name);
  const notionUrl = prospect.notion_page_id
    ? `https://www.notion.so/${prospect.notion_page_id.replace(/-/g, '')}`
    : null;

  // ---- Quick action URLs --------------------------------------------------
  const telHref = prospect.phone
    ? `tel:${prospect.phone.replace(/\s/g, '')}`
    : null;
  const mailHref = prospect.email ? `mailto:${prospect.email}` : null;
  const igHref = prospect.instagram
    ? prospect.instagram.startsWith('http')
      ? prospect.instagram
      : `https://www.instagram.com/${prospect.instagram.replace(/^@/, '')}/`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Détails du prospect ${prospect.company_name}`}
    >
      <div
        className="relative flex h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* STICKY HEADER                                                   */}
        {/* ============================================================== */}
        <header className="flex shrink-0 items-start gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          {/* Hash-color avatar with initials */}
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md ring-2 ring-white ${avatarColor}`}
            aria-hidden="true"
          >
            {avatarInitials}
          </div>

          {/* Title + meta + badges */}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight text-gnd-primary sm:text-2xl">
              {prospect.company_name}
            </h2>

            {/* Sector + Address */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gnd-muted sm:text-sm">
              {prospect.sector && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  {prospect.sector}
                </span>
              )}
              {adressePrecise && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{adressePrecise}</span>
                </span>
              )}
            </div>

            {/* Badges row */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {prospect.classification && (
                <span
                  title={
                    classificationTooltip(prospect.classification) ?? undefined
                  }
                  className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${classificationTone(
                    prospect.classification
                  )}`}
                >
                  {/* Don't repeat the emoji icon if it's already in the value */}
                  {!/^[\p{Emoji}]/u.test(prospect.classification) && (
                    <Target className="h-3 w-3" aria-hidden />
                  )}
                  {prospect.classification}
                </span>
              )}
              {prospect.branche && (
                <span
                  title="Type de service GND : A = Agence Créative (sites web), B = Production Audiovisuelle, C = Solutions IA"
                  className="inline-flex cursor-help items-center rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-purple-200"
                >
                  {prospect.branche}
                </span>
              )}
              {prospect.status && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${toneForStatus(
                    prospect.status
                  )}`}
                >
                  {labelForStatus(prospect.status)}
                </span>
              )}
              {prospect.notion_page_id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Synchro Notion
                </span>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-gnd-accent"
            aria-label="Fermer la modale"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* ============================================================== */}
        {/* SCROLLABLE BODY                                                  */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-4">
            {/* Row 1 : Décisionnaire & canal | Présence digitale */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card
                icon={<User className="h-4 w-4" />}
                title="Décisionnaire & canal"
              >
                <KV label="Contact" value={decisionnaireDisplay} />
                <KV label="Rôle" value={prospect.role_contact} />
                <KV label="Téléphone" value={prospect.phone} href={telHref} />
                <KV label="Email" value={prospect.email} href={mailHref} />
                <KV
                  label="Site web"
                  value={prospect.website}
                  href={prospect.website}
                  isExternal
                />
              </Card>

              <Card
                icon={<Globe className="h-4 w-4" />}
                title="Présence digitale"
              >
                <SocialLink
                  icon={<Instagram className="h-4 w-4" />}
                  label="Instagram"
                  value={prospect.instagram}
                  buildHref={(v) =>
                    v.startsWith('http')
                      ? v
                      : `https://www.instagram.com/${v.replace(/^@/, '')}/`
                  }
                />
                <SocialLink
                  icon={<Facebook className="h-4 w-4" />}
                  label="Facebook"
                  value={prospect.facebook}
                  buildHref={(v) => v}
                />
                <SocialLink
                  icon={<Linkedin className="h-4 w-4" />}
                  label="LinkedIn entreprise"
                  value={prospect.linkedin_entreprise}
                  buildHref={(v) => v}
                />
                <SocialLink
                  icon={<Linkedin className="h-4 w-4" />}
                  label="LinkedIn contact"
                  value={prospect.linkedin_contact}
                  buildHref={(v) => v}
                />
                <SocialLink
                  icon={<Music2 className="h-4 w-4" />}
                  label="TikTok"
                  value={prospect.tiktok}
                  buildHref={(v) =>
                    v.startsWith('http')
                      ? v
                      : `https://www.tiktok.com/@${v.replace(/^@/, '')}`
                  }
                />
                {!prospect.instagram &&
                  !prospect.facebook &&
                  !prospect.linkedin_contact &&
                  !prospect.linkedin_entreprise &&
                  !prospect.tiktok && (
                    <p className="text-xs italic text-gnd-muted">
                      Aucune présence sociale renseignée.
                    </p>
                  )}
              </Card>
            </div>

            {/* Row 2 : Qualification (full-width grid of stat tiles) */}
            <Card
              icon={<TrendingUp className="h-4 w-4" />}
              title="Qualification"
            >
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                <Stat
                  label="CA estimé"
                  value={prospect.ca_estime}
                  icon={<Banknote className="h-3.5 w-3.5" />}
                />
                <Stat
                  label="Taille"
                  value={prospect.taille_entreprise}
                  icon={<Users className="h-3.5 w-3.5" />}
                />
                <Stat
                  label="Note Google"
                  value={
                    prospect.note_google != null
                      ? `${prospect.note_google}${
                          prospect.nombre_avis != null
                            ? ` · ${prospect.nombre_avis}`
                            : ''
                        }`
                      : null
                  }
                  icon={<Star className="h-3.5 w-3.5" />}
                />
                <Stat
                  label="Nb employés"
                  value={
                    prospect.nombre_employes != null
                      ? String(prospect.nombre_employes)
                      : null
                  }
                />
              </div>
            </Card>

            {/* Row 3 : Tags (besoins + arguments) */}
            {((prospect.besoins_detectes &&
              prospect.besoins_detectes.length > 0) ||
              (prospect.arguments_cles &&
                prospect.arguments_cles.length > 0)) && (
              <Card icon={<Tag className="h-4 w-4" />} title="Tags">
                {prospect.besoins_detectes &&
                  prospect.besoins_detectes.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gnd-muted">
                        Besoins détectés
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {prospect.besoins_detectes.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {prospect.arguments_cles &&
                  prospect.arguments_cles.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gnd-muted">
                        Arguments clés
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {prospect.arguments_cles.map((a) => (
                          <span
                            key={a}
                            className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </Card>
            )}

            {/* Row 4 : Analyse du besoin */}
            {prospect.analyse_besoin && (
              <ThemedCard
                icon={<Target className="h-4 w-4" />}
                title="Analyse du besoin"
                theme={BESOIN_THEME}
              >
                <ParsedAnalysis
                  text={prospect.analyse_besoin}
                  theme={BESOIN_THEME}
                />
              </ThemedCard>
            )}

            {/* Row 5 : Analyse du timing */}
            {prospect.analyse_timing && (
              <ThemedCard
                icon={<Clock className="h-4 w-4" />}
                title="Analyse du timing"
                theme={TIMING_THEME}
              >
                <ParsedAnalysis
                  text={prospect.analyse_timing}
                  theme={TIMING_THEME}
                />
              </ThemedCard>
            )}

            {/* Row 6 : Analyse du budget */}
            {prospect.analyse_budget && (
              <ThemedCard
                icon={<Banknote className="h-4 w-4" />}
                title="Analyse du budget"
                theme={BUDGET_THEME}
              >
                <ParsedAnalysis
                  text={prospect.analyse_budget}
                  theme={BUDGET_THEME}
                />
              </ThemedCard>
            )}

            {/* Row 7 : Recommandation commerciale (highlight) */}
            {prospect.recommandation_approche && (
              <ThemedCard
                icon={<Lightbulb className="h-4 w-4" />}
                title="Recommandation commerciale"
                theme={RECOMMENDATION_THEME}
              >
                <ParsedAnalysis
                  text={prospect.recommandation_approche}
                  theme={RECOMMENDATION_THEME}
                />
              </ThemedCard>
            )}

            <p className="pt-1 text-center text-[11px] italic text-gnd-muted">
              Données issues de Notion (Pipeline Prospects GND). Les notes et
              le statut saisis sur la plateforme sont préservés au sync.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STICKY FOOTER ACTIONS                                            */}
        {/* ============================================================== */}
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          {telHref && (
            <FooterAction href={telHref} icon={<Phone className="h-4 w-4" />}>
              Appeler
            </FooterAction>
          )}
          {mailHref && (
            <FooterAction href={mailHref} icon={<Mail className="h-4 w-4" />}>
              Email
            </FooterAction>
          )}
          {igHref && (
            <FooterAction
              href={igHref}
              external
              icon={<Instagram className="h-4 w-4" />}
            >
              DM Instagram
            </FooterAction>
          )}
          {notionUrl && (
            <FooterAction
              href={notionUrl}
              external
              icon={<ExternalLink className="h-4 w-4" />}
            >
              Voir Notion
            </FooterAction>
          )}
        </footer>
      </div>
    </div>
  );
}

// =====================================================================
// Sous-composants utilitaires (non exportés)
// =====================================================================

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
      <header className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gnd-muted">
        <span aria-hidden>{icon}</span>
        {title}
      </header>
      {children}
    </section>
  );
}

function ThemedCard({
  icon,
  title,
  theme,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  theme: AnalysisTheme;
  children: React.ReactNode;
}) {
  return (
    <section className={theme.cardClass}>
      <header
        className={`mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${theme.headerColor}`}
      >
        <span aria-hidden className={theme.iconColor}>
          {icon}
        </span>
        {title}
      </header>
      {children}
    </section>
  );
}

function KV({
  label,
  value,
  href,
  isExternal,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
  isExternal?: boolean;
}) {
  if (!value) return null;
  const content = href ? (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-gnd-primary hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="text-slate-800">{value}</span>
  );
  return (
    <div className="mb-2 last:mb-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gnd-muted">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm">{content}</div>
    </div>
  );
}

function SocialLink({
  icon,
  label,
  value,
  buildHref,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  buildHref: (v: string) => string;
}) {
  if (!value) return null;
  const href = buildHref(value);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="-mx-1 mb-1 flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-100 last:mb-0"
    >
      <span className="shrink-0 text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gnd-muted">
          {label}
        </div>
        <div className="truncate text-sm text-gnd-primary">{value}</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-200">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gnd-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value ?? '—'}
      </div>
    </div>
  );
}

function FooterAction({
  href,
  icon,
  external,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-gnd-primary"
    >
      {icon}
      {children}
    </a>
  );
}

// =====================================================================
// ParsedAnalysis : smart parser used by all 4 analysis cards.
// Detects section markers, splits body into bullet sentences, and
// renders inline highlights (bold, URLs, emails, phones, handles, SIREN).
// =====================================================================

const SECTION_MARKERS = [
  // New 2026-04-28 markers (canonical writing convention)
  "Identité de l'entreprise",
  'Présence digitale actuelle',
  'Manques identifiés',
  'Pic de notoriété',
  'Signal commercial fort',
  'Contexte récent',
  'Fenêtre commerciale',
  'Capacité d\'investissement',
  'Indicateurs financiers',
  'Sensibilité prix',
  'Canal optimal',
  'Canal de backup',
  "Angle d'accroche",
  'Argument clé',
  // Legacy markers (kept for compatibility with older fiches)
  "STRATÉGIE D'APPROCHE RECOMMANDÉE",
  "STRATÉGIE D'APPROCHE",
  'STRUCTURE CAPITALISTIQUE RÉVÉLÉE',
  'STRUCTURE CAPITALISTIQUE',
  'ANGLE COMMERCIAL',
  'CONTRAINTES PHYSIQUES',
  'COORDONNÉES DIRIK NON RETROUVÉES VIA API',
  'EMAIL ET TÉL DIRECT JULIE/RAYMOND',
  'EMAIL ET TÉL DIRECT',
  '4 ENTITÉS OPÉRATIONNELLES TAO TAO',
  '4 ENTITÉS OPÉRATIONNELLES',
  'TÉLÉPHONES PUBLICS CONFIRMÉS',
  'TÉLÉPHONES PUBLICS',
  'JACKPOT TIMING',
  'IMPORTANT',
  'IMPÉRATIF AU 1ER CONTACT',
  'IMPÉRATIF',
  'LINKEDIN',
  'Canal de contact recommandé',
  'Angle commercial GND',
  'Angle commercial',
  'Angle',
  'Pièges/notes',
  'Pièges',
  "Stratégie d'approche",
  'Décisionnaire identifié',
  'Décisionnaires',
  'Décisionnaire',
  'Identité juridique',
  'Backup',
  'Particularité',
  'Note',
  'Args clés',
  'Arguments clés',
  'Besoins détectés',
  'Besoins',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitParagraphs(text: string): string[] {
  let processed = text.trim();
  // Inject a blank line before any inline marker to allow paragraph split.
  // Markers can be either "**Marker.**" (markdown bold + period) or
  // "**Marker:**" / "Marker:" (legacy colon style).
  for (const marker of SECTION_MARKERS) {
    const escaped = escapeRegex(marker);
    // Bold + period style (new convention 2026-04-28)
    const periodPattern = new RegExp(
      `(?<!\\n)(?<!^)(\\*{2}\\b${escaped}\\b\\.\\*{2})`,
      'gu'
    );
    processed = processed.replace(periodPattern, '\n\n$1');
    // Bold + colon style (legacy)
    const colonPattern = new RegExp(
      `(?<!\\n)(?<!^)(\\*{0,2}\\b${escaped}\\b\\*{0,2}\\s*:)`,
      'gu'
    );
    processed = processed.replace(colonPattern, '\n\n$1');
  }
  return processed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function matchSectionLabel(text: string): { label: string | null; body: string } {
  for (const marker of SECTION_MARKERS) {
    const escaped = escapeRegex(marker);
    // New convention: **Marker.** [body...]
    const periodRe = new RegExp(
      `^\\*{2}\\b${escaped}\\b\\.\\*{2}\\s*`,
      'iu'
    );
    const periodMatch = text.match(periodRe);
    if (periodMatch) {
      return {
        label: marker,
        body: text.slice(periodMatch[0].length).trim(),
      };
    }
    // Legacy: **Marker:** [body...] or Marker: [body...]
    const colonRe = new RegExp(
      `^\\*{0,2}\\b${escaped}\\b\\*{0,2}\\s*:\\s*`,
      'iu'
    );
    const colonMatch = text.match(colonRe);
    if (colonMatch) {
      return {
        label: marker,
        body: text.slice(colonMatch[0].length).trim(),
      };
    }
  }
  return { label: null, body: text };
}

function splitSentences(text: string): string[] {
  const SENTENCE_BOUNDARY =
    /(?<=[.!?])\s+(?=[A-ZÀ-ÜŒŽ\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\d])/u;
  return text
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ParsedAnalysis({
  text,
  theme,
}: {
  text: string;
  theme: AnalysisTheme;
}) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className="max-w-3xl space-y-4">
      {paragraphs.map((p, i) => (
        <ParsedParagraph key={i} text={p} theme={theme} />
      ))}
    </div>
  );
}

function ParsedParagraph({
  text,
  theme,
}: {
  text: string;
  theme: AnalysisTheme;
}) {
  const { label, body } = matchSectionLabel(text);
  const sentences = splitSentences(body);

  return (
    <div>
      {label && (
        <div
          className={`mb-1.5 text-[11px] font-bold uppercase tracking-wider ${theme.sectionLabelColor}`}
        >
          {label}
        </div>
      )}
      {sentences.length <= 1 ? (
        <p className={`text-sm leading-7 ${theme.bodyColor}`}>
          {renderInline(body, theme)}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sentences.map((s, i) => (
            <li
              key={i}
              className={`flex gap-2 text-sm leading-7 ${theme.bodyColor}`}
            >
              <span
                className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${theme.bulletColor}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{renderInline(s, theme)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderInline(text: string, theme: AnalysisTheme): React.ReactNode[] {
  const PATTERN =
    /(\*\*[^*\n]+\*\*)|(https?:\/\/[^\s)\]]+)|((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:vercel\.app|com|fr|org|net|io|eu|app|me|tv|design|store|restaurant|earth|digital|tech|coffee|pro|biz|info|website|space|ai|dev|cloud|page))(?![a-zA-Z0-9])|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+33\s?\d(?:[\s.-]?\d{2}){4}|\b0[1-9](?:[\s.-]?\d{2}){4}\b)|(@[a-zA-Z][a-zA-Z0-9._]{1,30})|(\bSIREN\s+(?:\d{3}\s?){2}\d{3}\b)/gu;

  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  PATTERN.lastIndex = 0;

  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      out.push(
        <strong key={`b${key++}`} className={`font-semibold ${theme.boldColor}`}>
          {match[1].slice(2, -2)}
        </strong>
      );
    } else if (match[2]) {
      out.push(
        <a
          key={`u${key++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`break-all font-medium underline-offset-2 hover:underline ${theme.linkColor}`}
        >
          {match[2]}
        </a>
      );
    } else if (match[3]) {
      // Bare domain (no http://) -> prepend https:// for the href
      out.push(
        <a
          key={`d${key++}`}
          href={`https://${match[3]}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`break-all font-medium underline-offset-2 hover:underline ${theme.linkColor}`}
        >
          {match[3]}
        </a>
      );
    } else if (match[4]) {
      out.push(
        <a
          key={`e${key++}`}
          href={`mailto:${match[4]}`}
          className={`font-medium underline-offset-2 hover:underline ${theme.linkColor}`}
        >
          {match[4]}
        </a>
      );
    } else if (match[5]) {
      const cleanPhone = match[5].replace(/[\s.-]/g, '');
      out.push(
        <a
          key={`p${key++}`}
          href={`tel:${cleanPhone}`}
          className={`whitespace-nowrap rounded px-1 py-0.5 font-inter text-[13px] font-semibold underline-offset-2 hover:underline ${theme.phoneBg} ${theme.phoneText}`}
        >
          {match[5]}
        </a>
      );
    } else if (match[6]) {
      out.push(
        <a
          key={`h${key++}`}
          href={`https://www.instagram.com/${match[6].slice(1)}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-medium underline-offset-2 hover:underline ${theme.handleColor}`}
        >
          {match[6]}
        </a>
      );
    } else if (match[7]) {
      out.push(
        <span
          key={`s${key++}`}
          className="rounded bg-slate-100 px-1 py-0.5 font-inter text-[12px] text-slate-700"
        >
          {match[7]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }

  return out;
}

// =====================================================================
// Visual helpers
// =====================================================================

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-pink-500',
  'bg-fuchsia-500',
  'bg-purple-500',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

// =====================================================================
// Classification — colors + tooltips
//
// New canonical values (since 2026-04-27):
//   🔥 Chaud  — priority lead, contact NOW
//   🌡️ Tiède  — good profile but with friction
//   ❄️ Froid  — requalify later, NURTURE
//
// Legacy values (Lead A/B/C, A, B, C, A (80-100), etc.) are kept as
// fallback during the migration window.
// =====================================================================

const CLASSIFICATION_TONES: Record<string, string> = {
  '🔥 Chaud': 'bg-rose-100 text-rose-800 ring-rose-200',
  '🌡️ Tiède': 'bg-amber-100 text-amber-800 ring-amber-200',
  '❄️ Froid': 'bg-sky-100 text-sky-800 ring-sky-200',
  // Legacy fallbacks
  'Lead A': 'bg-amber-100 text-amber-800 ring-amber-200',
  'Lead B': 'bg-blue-100 text-blue-800 ring-blue-200',
  'Lead C': 'bg-slate-100 text-slate-700 ring-slate-200',
  A: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'A (80-100)': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  B: 'bg-blue-100 text-blue-800 ring-blue-200',
  'B (65-79)': 'bg-blue-100 text-blue-800 ring-blue-200',
  C: 'bg-slate-100 text-slate-700 ring-slate-200',
  'C (50-64)': 'bg-slate-100 text-slate-700 ring-slate-200',
  Rejeté: 'bg-rose-100 text-rose-800 ring-rose-200',
  'Rejeté (<50)': 'bg-rose-100 text-rose-800 ring-rose-200',
};

const CLASSIFICATION_TOOLTIPS: Record<string, string> = {
  '🔥 Chaud':
    'Lead à contacter en priorité. Décisionnaire identifié, canal direct, signal timing fort.',
  '🌡️ Tiède':
    'Bon profil mais avec friction. Identité floue, dirigeant senior, ou à éduquer / requalifier.',
  '❄️ Froid':
    'À requalifier ultérieurement. NURTURE / non urgent / signal timing faible.',
};

function classificationTone(classification: string | null): string {
  if (!classification) return 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    CLASSIFICATION_TONES[classification] ??
    'bg-slate-100 text-slate-700 ring-slate-200'
  );
}

function classificationTooltip(
  classification: string | null
): string | null {
  if (!classification) return null;
  return CLASSIFICATION_TOOLTIPS[classification] ?? null;
}
