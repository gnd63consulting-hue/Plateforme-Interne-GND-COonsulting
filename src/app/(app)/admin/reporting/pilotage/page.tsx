import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { labelForStatus } from '@/lib/prospects';
import {
  INTEL_SELECT_COLUMNS,
  latestEnrichmentByProspect,
  type ProspectIntelRow,
} from '@/lib/prospect-intel';
import PilotageClient, { type PilotageData } from './PilotageClient';

export const dynamic = 'force-dynamic';

/**
 * /admin/reporting/pilotage — Reporting funnel LIVE (pilotage sans agent).
 *
 * Objectif : donner aux admins une lecture de pilotage en temps reel
 * (recalculee a chaque chargement) qui reproduit le rapport que produit
 * l'agent Pythie/Cyrus — SANS dependre de l'agent. Base totale, repartition
 * par statut, comptage des enrichis Atlas, qualite de la donnee et lecture
 * phone-first.
 *
 * Cloisonnement (regle dure) : on raisonne en COMPTES et en POURCENTAGES,
 * JAMAIS en euros. On ne lit AUCUNE colonne financiere (pas de deal_amount,
 * pas de prospect_finance, pas de commissions). Le `select` sur prospects est
 * volontairement minimal (statut + coordonnees + assignation).
 *
 * Gate d'acces : FULL-admin (admin / admin_limited), EXACTEMENT comme
 * /admin/pipelines et /admin/reporting. Le layout /admin gate deja la console
 * (hasConsoleAccess) ; on renforce ici au niveau page (defense en profondeur).
 *
 * Lecture : client service-role (createAdminClient) comme /admin/pipelines —
 * l'admin voit toute la base, et aucune donnee financiere ne transite par ce
 * client (on selectionne explicitement des colonnes non-financieres).
 */
const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type Me = { id: string; email: string; full_name: string | null; role: string };

type ProspectPilotRow = {
  status: string | null;
  phone: string | null;
  email: string | null;
  assigned_to: string | null;
  merged_into: string | null;
};

export default async function PilotagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meRaw } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();
  const me = meRaw as Me | null;
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const admin = createAdminClient();

  // Deux lectures en parallele :
  //  - prospects : colonnes NON financieres uniquement (statut + qualite data).
  //  - prospect_intel : lignes d'enrichissement Atlas (cascade FR), triees
  //    created_at DESC pour ne garder que la plus recente par prospect.
  const [{ data: prospectsRaw }, { data: intelRaw }] = await Promise.all([
    admin
      .from('prospects')
      .select('status, phone, email, assigned_to, merged_into'),
    admin
      .from('prospect_intel')
      .select(INTEL_SELECT_COLUMNS)
      .eq('intel_type', 'enrichment')
      .order('created_at', { ascending: false }),
  ]);

  // Base : on EXCLUT les fiches fusionnees (merged_into NON NULL) — elles sont
  // des doublons absorbes, pas des prospects vivants. C'est la meme base que
  // celle que Pythie rapporte ("base totale" = fiches maitres).
  const prospects = ((prospectsRaw ?? []) as ProspectPilotRow[]).filter(
    (p) => p.merged_into == null
  );
  const baseTotale = prospects.length;

  // ---- Bloc 2 : repartition par statut ----
  const statusCounts = new Map<string, number>();
  for (const p of prospects) {
    const key = p.status ?? '(sans statut)';
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  }
  const repartition = Array.from(statusCounts.entries())
    .map(([status, count]) => ({
      status,
      label: status === '(sans statut)' ? 'Sans statut' : labelForStatus(status),
      count,
      pct: baseTotale > 0 ? count / baseTotale : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Quelques statuts cles surlignes pour la lecture rapide (a contacter vs la
  // suite du funnel). Les valeurs sont des comptes bruts, jamais des euros.
  const countByStatus = (s: string) => statusCounts.get(s) ?? 0;
  const highlights = {
    aContacter: countByStatus('a_contacter'),
    contacte: countByStatus('contacte'),
    rdvPris: countByStatus('rdv_pris'),
    gagne: countByStatus('gagne'),
    perdu: countByStatus('perdu'),
  };

  // ---- Bloc 3 : enrichis Atlas ----
  // Une ligne d'enrichissement par prospect (la plus recente). On compte les
  // prospects DISTINCTS qui ont une ligne d'enrichissement, puis on split selon
  // payload.status ('enrichi' vs 'a_verifier_humain').
  const latestIntel = latestEnrichmentByProspect(
    (intelRaw ?? []) as unknown as ProspectIntelRow[]
  );
  let enrichis = 0;
  let aVerifier = 0;
  let autreStatutIntel = 0;
  let emailValide = 0;
  for (const payload of latestIntel.values()) {
    if (payload.status === 'enrichi') enrichis += 1;
    else if (payload.status === 'a_verifier_humain') aVerifier += 1;
    else autreStatutIntel += 1;
    if (payload.email_status === 'valid') emailValide += 1;
  }
  const enrichisDistincts = latestIntel.size;

  // ---- Bloc 4 : qualite data ----
  const hasTel = (p: ProspectPilotRow) => !!(p.phone && p.phone.trim());
  const hasEmail = (p: ProspectPilotRow) => !!(p.email && p.email.trim());
  const sansTel = prospects.filter((p) => !hasTel(p)).length;
  const sansEmail = prospects.filter((p) => !hasEmail(p)).length;
  const nonAssignes = prospects.filter((p) => p.assigned_to == null).length;
  const avecTel = baseTotale - sansTel;

  // ---- Bloc 5 : lecture phone-first ----
  // Email "valide" = nb de prospects dont la DERNIERE ligne d'enrichissement
  // porte email_status='valid' (donnee Atlas). Si l'enrichissement n'a pas
  // tourne (latestIntel vide), on degrade sur le nb de prospects avec un email
  // non-null (heuristique de repli, signalee dans l'UI).
  const emailEnrichmentDispo = latestIntel.size > 0;
  const emailValideEffectif = emailEnrichmentDispo
    ? emailValide
    : prospects.filter((p) => hasEmail(p)).length;
  const pctTel = baseTotale > 0 ? avecTel / baseTotale : 0;
  const pctEmailValide = baseTotale > 0 ? emailValideEffectif / baseTotale : 0;

  const data: PilotageData = {
    adminName: (me.full_name ?? me.email.split('@')[0]).split(/[\s.]+/)[0],
    baseTotale,
    repartition,
    highlights,
    enrichissement: {
      distincts: enrichisDistincts,
      enrichis,
      aVerifier,
      autre: autreStatutIntel,
    },
    qualite: { sansTel, sansEmail, nonAssignes, avecTel },
    phoneFirst: {
      avecTel,
      pctTel,
      emailValide: emailValideEffectif,
      pctEmailValide,
      emailEnrichmentDispo,
    },
  };

  return <PilotageClient data={data} />;
}
