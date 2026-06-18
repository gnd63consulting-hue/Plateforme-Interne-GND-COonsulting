import {
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { formatDate } from '@/lib/prospects';
import {
  emailStatusTone,
  emailStatusLabel,
  statusTone,
  statusLabel,
  confidenceTone,
  telHref,
  type EnrichmentPayload,
} from '@/lib/prospect-intel';

/**
 * Panneau "Renseignements IA" en tete de la fiche 360.
 *
 * Composant SERVEUR (aucune interactivite -> que des liens tel:/mailto/href,
 * pas de bundle client). Affiche l'intel d'enrichissement la plus recente
 * (cascade FR Atlas, table prospect_intel). Rend null si le prospect n'est pas
 * encore enrichi -> la fiche reste identique a avant pour les prospects bruts.
 *
 * Cloisonnement : ne lit QUE l'intel (aucune donnee financiere). La lecture est
 * deja filtree par la RLS owner (migration 0028) cote page serveur.
 */
export default function ProspectIntelPanel({
  intel,
  createdAt,
}: {
  intel: EnrichmentPayload | null;
  createdAt: string | null;
}) {
  if (!intel) return null;

  const href = telHref(intel.tel_value);
  const pres = intel.presence_digitale;
  const presenceChips: string[] = [];
  if (pres) {
    if (pres.site === true) presenceChips.push('Site en ligne');
    if (pres.site === false) presenceChips.push('Pas de site');
    if (pres.techno) presenceChips.push(String(pres.techno));
    if (pres.mobile === false) presenceChips.push('Pas mobile');
    if (pres.https === false) presenceChips.push('Pas HTTPS');
    if (pres.social_actif) presenceChips.push('Social actif');
  }

  const facts: [string, string | null | undefined][] = [
    ['SIRET', intel.siret],
    ['Secteur', intel.naf_secteur],
    ['Effectif', intel.taille_effectif],
    ['Anciennete', intel.anciennete],
    ['Ville', intel.ville],
  ];
  const visibleFacts = facts.filter(([, v]) => v);

  const sources = Array.isArray(intel.source_urls) ? intel.source_urls : [];
  const conf = intel.confidence ?? {};
  const confFields: [string, string | undefined][] = [
    ['Dirigeant', conf.dirigeant_nom ?? conf.dirigeant],
    ['Email', conf.email_value ?? conf.email],
    ['Tel', conf.tel_value ?? conf.telephone],
    ['Societe', conf.company_match],
  ];
  const visibleConf = confFields.filter(([, v]) => v);

  return (
    <section className="mb-5 rounded-3xl border border-border-soft bg-white p-5 shadow-soft">
      {/* En-tete */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-dark" aria-hidden />
        <h2 className="font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
          Renseignements IA
        </h2>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(
            intel.status
          )}`}
        >
          {statusLabel(intel.status)}
        </span>
        {conf.overall && (
          <span
            title="Confiance globale"
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceTone(
              conf.overall
            )}`}
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {conf.overall}
          </span>
        )}
        {createdAt && (
          <span className="ml-auto text-[11px] text-muted-warm">
            Enrichi le {formatDate(createdAt)}
          </span>
        )}
      </div>

      {/* Dirigeant + coordonnees */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {intel.dirigeant_nom && (
            <p className="font-marcellus text-lg text-choco">
              {intel.dirigeant_nom}
              {intel.dirigeant_role ? (
                <span className="ml-2 font-inter text-sm text-muted-warm">
                  {intel.dirigeant_role}
                </span>
              ) : null}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {intel.email_value && (
              <a
                href={`mailto:${intel.email_value}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border-soft bg-white px-2 py-1 font-medium text-ink-warm hover:bg-cream-deep"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {intel.email_value}
              </a>
            )}
            {intel.email_value && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${emailStatusTone(
                  intel.email_status
                )}`}
              >
                {emailStatusLabel(intel.email_status)}
              </span>
            )}
          </div>
        </div>

        {/* Action phone-first */}
        {href ? (
          <a
            href={href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-choco transition-colors hover:bg-brand-dark"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {intel.tel_value}
          </a>
        ) : null}
      </div>

      {/* Angle GND = le pitch */}
      {intel.angle_gnd && (
        <div className="mt-3 rounded-2xl bg-cream-deep/60 p-3 ring-1 ring-gnd-bronze/8">
          <p className="flex items-start gap-1.5 text-sm text-ink-warm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" aria-hidden />
            <span>
              <span className="font-semibold">Angle : </span>
              {intel.angle_gnd}
              {intel.signal_detecte ? (
                <span className="mt-1 block text-xs text-muted-warm">
                  Signal : {intel.signal_detecte}
                </span>
              ) : null}
            </span>
          </p>
        </div>
      )}

      {/* Faits entreprise */}
      {visibleFacts.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {visibleFacts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-warm/70">
                {k}
              </dt>
              <dd className="truncate text-sm text-ink-warm">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Presence digitale */}
      {presenceChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {presenceChips.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              <Globe className="h-3 w-3" aria-hidden />
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Confiance par champ + sources */}
      {(visibleConf.length > 0 || sources.length > 0) && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border-soft/70 pt-3 text-xs text-muted-warm">
          {visibleConf.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-ink-warm">Confiance :</span>
              {visibleConf.map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1">
                  {k}
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-semibold ${confidenceTone(
                      v
                    )}`}
                  >
                    {v}
                  </span>
                </span>
              ))}
            </p>
          )}
          {sources.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-ink-warm">Sources :</span>
              {sources.slice(0, 6).map((u, i) => (
                <a
                  key={`${u}-${i}`}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-dark underline underline-offset-2 hover:text-choco"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  source {i + 1}
                </a>
              ))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
