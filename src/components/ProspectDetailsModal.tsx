'use client';

import { useEffect } from 'react';
import {
  Banknote,
  Building2,
  ExternalLink,
  Facebook,
  FileText,
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

/**
 * Modal en lecture seule affichant l'enrichissement Notion complet d'un
 * prospect.
 *
 * Source de vérité : Notion (cf. base "Pipeline Prospects GND"). Pour
 * modifier un de ces champs, éditer la page Notion correspondante puis
 * lancer le sync (ou attendre le cron Vercel 6h).
 *
 * Volontairement read-only : les commerciaux saisissent leurs ajouts dans
 * le panneau "Notes" (préservé au sync). Les analyses Notion restent
 * intactes.
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
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${classificationTone(
                    prospect.classification
                  )}`}
                >
                  <Target className="h-3 w-3" aria-hidden />
                  {prospect.classification}
                </span>
              )}
              {prospect.branche && (
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-purple-200">
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

            {/* Row 4 : Analyses */}
            {(prospect.analyse_besoin ||
              prospect.analyse_budget ||
              prospect.analyse_timing) && (
              <Card
                icon={<FileText className="h-4 w-4" />}
                title="Analyses Notion"
              >
                <Analyse label="Besoin" value={prospect.analyse_besoin} />
                <Analyse label="Budget" value={prospect.analyse_budget} />
                <Analyse label="Timing" value={prospect.analyse_timing} />
              </Card>
            )}

            {/* Row 5 : Recommandation commerciale (highlight + smart parser) */}
            {prospect.recommandation_approche && (
              <Card
                icon={<Lightbulb className="h-4 w-4 text-amber-700" />}
                title="Recommandation commerciale"
                tone="highlight"
              >
                <RecommendationContent text={prospect.recommandation_approche} />
              </Card>
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
  tone = 'default',
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: 'default' | 'highlight';
  children: React.ReactNode;
}) {
  const baseClasses =
    tone === 'highlight'
      ? 'rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 ring-1 ring-amber-200/70 shadow-sm'
      : 'rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-sm';
  return (
    <section className={baseClasses}>
      <header
        className={`mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
          tone === 'highlight' ? 'text-amber-800' : 'text-gnd-muted'
        }`}
      >
        <span aria-hidden>{icon}</span>
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

function Analyse({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gnd-muted">
        {label}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {value}
      </p>
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
// RecommendationContent : smart parser for recommandation_approche
// =====================================================================

const SECTION_MARKERS = [
  // Order matters : longer markers first to avoid prefix shadowing.
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
  'Canal optimal',
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
  for (const marker of SECTION_MARKERS) {
    const pattern = new RegExp(
      `(?<!\\n)(?<!^)(\\*{0,2}\\b${escapeRegex(marker)}\\b\\*{0,2}\\s*:)`,
      'gu'
    );
    processed = processed.replace(pattern, '\n\n$1');
  }
  return processed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function matchSectionLabel(text: string): { label: string | null; body: string } {
  for (const marker of SECTION_MARKERS) {
    const re = new RegExp(
      `^\\*{0,2}\\b${escapeRegex(marker)}\\b\\*{0,2}\\s*:\\s*`,
      'iu'
    );
    const m = text.match(re);
    if (m) {
      return {
        label: marker,
        body: text.slice(m[0].length).trim(),
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

function RecommendationContent({ text }: { text: string }) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className="max-w-3xl space-y-4">
      {paragraphs.map((p, i) => (
        <RecommendationParagraph key={i} text={p} />
      ))}
    </div>
  );
}

function RecommendationParagraph({ text }: { text: string }) {
  const { label, body } = matchSectionLabel(text);
  const sentences = splitSentences(body);

  return (
    <div>
      {label && (
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
          {label}
        </div>
      )}
      {sentences.length <= 1 ? (
        <p className="text-sm leading-7 text-amber-950">
          {renderInline(body)}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sentences.map((s, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-7 text-amber-950"
            >
              <span
                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/70"
                aria-hidden
              />
              <span className="min-w-0 flex-1">{renderInline(s)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Render a string with inline transformations:
 * - **bold** -> <strong>
 * - URLs (http/https) -> external links
 * - bare domains (xxx.vercel.app, xxx.fr, xxx.com, etc.) -> external links
 *   with auto-prepended https://
 * - emails -> mailto links
 * - French phones (+33 ... or 0 X XX XX XX XX) -> tel: links (monospace)
 * - @handles -> Instagram links
 * - SIREN [9 digits] -> monospace span
 */
function renderInline(text: string): React.ReactNode[] {
  // The bare-domain alternative MUST come AFTER the http(s):// one but BEFORE
  // any other token, otherwise it would steal characters from absolute URLs.
  // Common TLDs are listed explicitly to avoid false positives on dates
  // ("26.04.2026") or version numbers ("v2.0").
  const PATTERN =
    /(\*\*[^*\n]+\*\*)|(https?:\/\/[^\s)\]]+)|((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:vercel\.app|com|fr|org|net|io|eu|app|me|tv|design|store|restaurant|earth|digital|tech|coffee|pro|biz|info|website|space|ai|dev|cloud|page)\b)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+33\s?\d(?:[\s.-]?\d{2}){4}|\b0[1-9](?:[\s.-]?\d{2}){4}\b)|(@[a-zA-Z][a-zA-Z0-9._]{1,30})|(\bSIREN\s+(?:\d{3}\s?){2}\d{3}\b)/giu;

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
      // **bold**
      out.push(
        <strong key={`b${key++}`} className="font-semibold text-amber-950">
          {match[1].slice(2, -2)}
        </strong>
      );
    } else if (match[2]) {
      // http(s):// URL
      out.push(
        <a
          key={`u${key++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-amber-700 underline-offset-2 hover:underline"
        >
          {match[2]}
        </a>
      );
    } else if (match[3]) {
      // bare domain (e.g. faim-de-semaine-website-v2-qs3p.vercel.app)
      const href = `https://${match[3]}`;
      out.push(
        <a
          key={`d${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-amber-700 underline-offset-2 hover:underline"
        >
          {match[3]}
        </a>
      );
    } else if (match[4]) {
      // email
      out.push(
        <a
          key={`e${key++}`}
          href={`mailto:${match[4]}`}
          className="font-medium text-amber-700 underline-offset-2 hover:underline"
        >
          {match[4]}
        </a>
      );
    } else if (match[5]) {
      // phone
      const cleanPhone = match[5].replace(/[\s.-]/g, '');
      out.push(
        <a
          key={`p${key++}`}
          href={`tel:${cleanPhone}`}
          className="whitespace-nowrap rounded bg-amber-100/60 px-1 py-0.5 font-mono text-[13px] font-semibold text-amber-800 underline-offset-2 hover:underline"
        >
          {match[5]}
        </a>
      );
    } else if (match[6]) {
      // @handle (assume Instagram)
      out.push(
        <a
          key={`h${key++}`}
          href={`https://www.instagram.com/${match[6].slice(1)}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-700 underline-offset-2 hover:underline"
        >
          {match[6]}
        </a>
      );
    } else if (match[7]) {
      // SIREN
      out.push(
        <span
          key={`s${key++}`}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700"
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

const CLASSIFICATION_TONES: Record<string, string> = {
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

function classificationTone(classification: string | null): string {
  if (!classification) return 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    CLASSIFICATION_TONES[classification] ??
    'bg-slate-100 text-slate-700 ring-slate-200'
  );
}
