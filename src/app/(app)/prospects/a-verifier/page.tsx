import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  INTEL_SELECT_COLUMNS,
  latestEnrichmentByProspect,
  type ProspectIntelRow,
  type LatestEnrichment,
} from '@/lib/prospect-intel';
import AVerifierClient, { type AVerifierRowVM } from './AVerifierClient';

export const dynamic = 'force-dynamic';

/**
 * File "A verifier" : revue humaine des enrichissements Atlas marques
 * `a_verifier_humain`.
 *
 * Atlas (cascade FR) ecrit une ligne prospect_intel (intel_type='enrichment',
 * source 'atlas.fr_cascade.*') par prospect traite. Le payload porte un champ
 * `status` (cf. EnrichmentPayload dans src/lib/prospect-intel.ts) qui vaut soit
 * 'enrichi' (match SIRENE solide + email ok) soit 'a_verifier_humain' (match
 * faible / email manquant ou non verifie). Cette page liste UNIQUEMENT les
 * prospects dont l'enrichissement LE PLUS RECENT est a 'a_verifier_humain', pour
 * qu'un humain jette un oeil et valide la fiche.
 *
 * Pas d'action d'ecriture en v1 : c'est une file de triage / visibilite. La
 * validation se fait sur la fiche (/prospects/[id]). Comme la page est un
 * composant serveur live, une fiche re-enrichie en 'enrichi' (ou re-traitee)
 * sort automatiquement de la file au prochain chargement.
 *
 * RLS : on ne lit que les prospects de l'utilisateur (assigned_to OU created_by)
 * et leur intel scopee (policy 0028). Aucune donnee financiere ici.
 *
 * Degrade proprement : si la migration 0028 n'est pas appliquee, prospect_intel
 * renvoie 0 ligne pour un commercial -> file vide, sans erreur.
 */
export default async function ProspectsAVerifierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  type PRow = {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    prenom_contact: string | null;
    role_contact: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    sector: string | null;
    status: string | null;
    website: string | null;
  };

  const { data: prospectsRaw } = await supabase
    .from('prospects')
    .select(
      'id, company_name, contact_name, prenom_contact, role_contact, phone, email, city, sector, status, website'
    )
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const prospects = (prospectsRaw ?? []) as unknown as PRow[];
  const ids = prospects.map((p) => p.id);

  let intelMap = new Map<string, LatestEnrichment>();
  if (ids.length) {
    const { data: intelRaw } = await supabase
      .from('prospect_intel')
      .select(INTEL_SELECT_COLUMNS)
      .eq('intel_type', 'enrichment')
      .in('prospect_id', ids)
      .order('created_at', { ascending: false });
    intelMap = latestEnrichmentByProspect(
      (intelRaw ?? []) as unknown as ProspectIntelRow[]
    );
  }

  // On ne garde que les prospects dont l'enrichissement LE PLUS RECENT est a
  // 'a_verifier_humain'. Les 'enrichi' (et ceux sans intel) sont exclus.
  const prospectById = new Map(prospects.map((p) => [p.id, p]));
  const rows: AVerifierRowVM[] = [];
  for (const [pid, e] of intelMap) {
    if (e.status !== 'a_verifier_humain') continue;
    const p = prospectById.get(pid);
    if (!p) continue;

    const dirigeant =
      e.dirigeant_nom ??
      p.contact_name ??
      ([p.prenom_contact, p.role_contact].filter(Boolean).join(' ') || null);

    // Raisons lisibles du "a verifier" : on s'appuie sur les champs du payload
    // (graceful si absents). email_status non 'valid' -> email a verifier ;
    // confidence overall low/medium -> matching faible ; siret absent -> pas de
    // rapprochement SIRENE solide.
    const emailStatus = e.email_status ?? null;
    const emailValue = e.email_value || p.email || null;
    const confidence = e.confidence?.overall ?? null;
    const reasons: string[] = [];
    if (!emailValue) {
      reasons.push('Email manquant');
    } else if (emailStatus && emailStatus !== 'valid') {
      reasons.push('Email non verifie');
    }
    if (!e.siret) reasons.push('SIRENE non rapproche');
    if (confidence === 'low') reasons.push('Matching faible');
    else if (confidence === 'medium') reasons.push('Matching a confirmer');
    if (reasons.length === 0) reasons.push('A verifier');

    rows.push({
      id: p.id,
      company: p.company_name ?? '--',
      dirigeant: dirigeant || null,
      dirigeantRole: e.dirigeant_role ?? p.role_contact ?? null,
      tel: e.tel_value || p.phone || null,
      email: emailValue,
      emailStatus,
      city: e.ville || p.city || null,
      sector: e.naf_secteur || p.sector || null,
      status: p.status ?? null,
      siret: e.siret ?? null,
      angle: e.angle_gnd ?? null,
      signal: e.signal_detecte ?? null,
      confidence,
      sourceCount: Array.isArray(e.source_urls) ? e.source_urls.length : 0,
      reasons,
      enrichedAt: e._created_at,
    });
  }

  // Plus anciens en tete : ce sont les fiches qui "pourrissent" le plus.
  rows.sort((a, b) => {
    const ta = Date.parse(a.enrichedAt || '') || 0;
    const tb = Date.parse(b.enrichedAt || '') || 0;
    return ta - tb || a.company.localeCompare(b.company);
  });

  return <AVerifierClient rows={rows} />;
}
