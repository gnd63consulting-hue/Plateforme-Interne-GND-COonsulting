'use client';

import type { Prospect } from '@/lib/prospects';

type ProspectDetailsModalProps = {
  prospect: Prospect | null;
  onClose: () => void;
};

/**
 * Modal en lecture seule affichant l'enrichissement Notion complet d'un prospect.
 *
 * Source de vérité : Notion (cf. base "Pipeline Prospects GND"). Pour modifier
 * un de ces champs, éditer la page Notion correspondante puis lancer le sync
 * (ou attendre le cron Vercel 6h).
 *
 * Volontairement read-only : les commerciaux saisissent leurs ajouts dans le
 * panneau "Notes" (préservé au sync). Les analyses Notion restent intactes.
 */
export default function ProspectDetailsModal({
  prospect,
  onClose,
}: ProspectDetailsModalProps) {
  if (!prospect) return null;

  const decisionnaire = [
    prospect.prenom_contact,
    prospect.contact_name && !prospect.prenom_contact
      ? prospect.contact_name
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  const adressePrecise = prospect.address ?? prospect.city;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gnd-primary">
              {prospect.company_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gnd-muted">
              {prospect.sector && <span>{prospect.sector}</span>}
              {adressePrecise && (
                <>
                  <span>·</span>
                  <span>{adressePrecise}</span>
                </>
              )}
              {prospect.notion_page_id && (
                <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Synchro Notion
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gnd-muted hover:text-gnd-primary"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* ---- Décisionnaire + canal ---- */}
        <Section title="Décisionnaire & canal">
          <KV label="Contact" value={decisionnaire || prospect.contact_name} />
          <KV label="Rôle" value={prospect.role_contact} />
          <KV label="Téléphone" value={prospect.phone} />
          <KV label="Email" value={prospect.email} />
          <KV label="Site web" value={prospect.website} isLink />
        </Section>

        {/* ---- Présence digitale ---- */}
        {(prospect.instagram ||
          prospect.facebook ||
          prospect.linkedin_contact ||
          prospect.linkedin_entreprise ||
          prospect.tiktok) && (
          <Section title="Présence digitale">
            <KV label="Instagram" value={prospect.instagram} isLink />
            <KV label="Facebook" value={prospect.facebook} isLink />
            <KV
              label="LinkedIn entreprise"
              value={prospect.linkedin_entreprise}
              isLink
            />
            <KV
              label="LinkedIn contact"
              value={prospect.linkedin_contact}
              isLink
            />
            <KV label="TikTok" value={prospect.tiktok} isLink />
          </Section>
        )}

        {/* ---- Qualification ---- */}
        <Section title="Qualification">
          <KV label="Classification" value={prospect.classification} />
          <KV label="Branche" value={prospect.branche} />
          <KV label="CA estimé" value={prospect.ca_estime} />
          <KV label="Taille" value={prospect.taille_entreprise} />
          <KV
            label="Nb employés"
            value={
              prospect.nombre_employes != null
                ? String(prospect.nombre_employes)
                : null
            }
          />
          <KV
            label="Note Google"
            value={
              prospect.note_google != null
                ? `${prospect.note_google}${
                    prospect.nombre_avis != null
                      ? ` (${prospect.nombre_avis} avis)`
                      : ''
                  }`
                : null
            }
          />
        </Section>

        {/* ---- Tags ---- */}
        {(prospect.besoins_detectes?.length ||
          prospect.arguments_cles?.length) ? (
          <Section title="Tags">
            {prospect.besoins_detectes &&
              prospect.besoins_detectes.length > 0 && (
                <div className="col-span-full">
                  <div className="text-xs uppercase tracking-wide text-gnd-muted">
                    Besoins détectés
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {prospect.besoins_detectes.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            {prospect.arguments_cles &&
              prospect.arguments_cles.length > 0 && (
                <div className="col-span-full mt-2">
                  <div className="text-xs uppercase tracking-wide text-gnd-muted">
                    Arguments clés
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {prospect.arguments_cles.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </Section>
        ) : null}

        {/* ---- Analyses Notion ---- */}
        {(prospect.analyse_besoin ||
          prospect.analyse_budget ||
          prospect.analyse_timing) && (
          <Section title="Analyses">
            <Long label="Besoin" value={prospect.analyse_besoin} />
            <Long label="Budget" value={prospect.analyse_budget} />
            <Long label="Timing" value={prospect.analyse_timing} />
          </Section>
        )}

        {/* ---- Recommandation d'approche ---- */}
        {prospect.recommandation_approche && (
          <Section title="Recommandation commerciale">
            <p className="col-span-full whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {prospect.recommandation_approche}
            </p>
          </Section>
        )}

        <p className="mt-6 text-xs text-gnd-muted">
          Données issues de Notion (Pipeline Prospects GND). Pour modifier ces
          champs, éditer la page Notion correspondante. Les notes et le statut
          saisis dans cette plateforme sont préservés au sync.
        </p>
      </div>
    </div>
  );
}

// =====================================================================
// Petits sous-composants utilitaires (pas exportés)
// =====================================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gnd-muted">
        {title}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function KV({
  label,
  value,
  isLink = false,
}: {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}) {
  if (!value) return null;

  let display: React.ReactNode = value;
  if (isLink) {
    let href = value;
    if (
      label === 'Instagram' &&
      !value.startsWith('http')
    ) {
      const handle = value.replace(/^@/, '');
      href = `https://www.instagram.com/${handle}/`;
    } else if (label === 'TikTok' && !value.startsWith('http')) {
      const handle = value.replace(/^@/, '');
      href = `https://www.tiktok.com/@${handle}`;
    } else if (
      (label === 'Email' || label.includes('mail')) &&
      !value.startsWith('mailto:')
    ) {
      href = `mailto:${value}`;
    } else if (
      label === 'Téléphone' &&
      !value.startsWith('tel:')
    ) {
      href = `tel:${value}`;
    }
    display = (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="text-gnd-primary hover:underline"
      >
        {value}
      </a>
    );
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gnd-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-slate-800 break-words">{display}</div>
    </div>
  );
}

function Long({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="col-span-full">
      <div className="text-xs uppercase tracking-wide text-gnd-muted">
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value}</p>
    </div>
  );
}
