import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  INTEL_SELECT_COLUMNS,
  SCORING_SOURCE,
  latestScoringByProspect,
  type ProspectIntelRow,
  type SeleneScore,
} from '@/lib/prospect-intel';
import RappelsClient, { type RappelRowVM } from './RappelsClient';

export const dynamic = 'force-dynamic';

/**
 * Vue "Rappels" (relances next_action_at) — boucle le workflow commercial.
 *
 * Quand un commercial logue un appel avec l'issue "Rappeler le X" (cf.
 * LogCallDialog), il pose `prospects.next_action_at`. Cette vue ressort tous
 * les prospects portant un rappel a venir / en retard pour que le commercial
 * les rappelle effectivement. Le commercial peut re-loguer l'appel en place :
 * cela change `next_action_at` (ou le statut) et l'item se deplace / sort tout
 * seul de la liste au prochain revalidate (composant serveur live).
 *
 * RLS : on tourne via le client serveur normal (session de l'utilisateur). La
 * policy owner-based de prospects renvoie uniquement SES prospects a un
 * commercial ; un admin voit l'ensemble (meme comportement que la liste
 * d'appel). On filtre sur assigned_to/created_by pour rester aligne sur la
 * liste d'appel : c'est la RLS qui borne reellement la visibilite.
 *
 * On ne ressort que les prospects avec un statut encore travaillable : une
 * fiche reconciliee en statut terminal (gagne/perdu/archived/...) sort
 * automatiquement, meme si elle porte encore un vieux next_action_at.
 *
 * Aucune donnee financiere lue ici (cloisonnement respecte) ; on reutilise le
 * scoring Selene pour afficher le badge de chaleur, comme la liste d'appel.
 */

/**
 * Statuts encore travaillables : la fiche reste dans les rappels tant qu'elle
 * porte un de ces statuts. Aligne sur CALLABLE_STATUSES de la liste d'appel et
 * sur l'enum de src/lib/prospects.ts. Les statuts terminaux/traites sont
 * exclus directement dans la requete.
 */
const CALLABLE_STATUSES = [
  'a_contacter',
  'a_rappeler',
  'a_recontacter',
  'en_attente_retour',
  'tentative_appel',
  'en_discussion',
  'prospecte',
];

export default async function ProspectRappelsPage() {
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
    city: string | null;
    sector: string | null;
    status: string | null;
    next_action_at: string | null;
  };

  // Prospects avec un rappel pose (next_action_at non nul), statut encore
  // travaillable, scopes par RLS a l'utilisateur. Tri ascendant : le plus en
  // retard remonte en tete.
  const { data: prospectsRaw } = await supabase
    .from('prospects')
    .select(
      'id, company_name, contact_name, prenom_contact, role_contact, phone, city, sector, status, next_action_at'
    )
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .not('next_action_at', 'is', null)
    .in('status', CALLABLE_STATUSES)
    .order('next_action_at', { ascending: true });

  const prospects = (prospectsRaw ?? []) as unknown as PRow[];
  const ids = prospects.map((p) => p.id);

  // Score Selene le plus recent par prospect (meme lecture que la liste d'appel).
  let scoreMap = new Map<string, SeleneScore>();
  if (ids.length) {
    const { data: scoreRaw } = await supabase
      .from('prospect_intel')
      .select(INTEL_SELECT_COLUMNS)
      .eq('intel_type', 'signal')
      .eq('source', SCORING_SOURCE)
      .in('prospect_id', ids)
      .order('created_at', { ascending: false });
    scoreMap = latestScoringByProspect(
      (scoreRaw ?? []) as unknown as ProspectIntelRow[]
    );
  }

  const rows: RappelRowVM[] = prospects.map((p) => {
    const s = scoreMap.get(p.id);
    const dirigeant =
      p.contact_name ??
      ([p.prenom_contact, p.role_contact].filter(Boolean).join(' ') || null);
    return {
      id: p.id,
      company: p.company_name ?? '--',
      dirigeant: dirigeant || null,
      tel: p.phone || null,
      city: p.city || null,
      sector: p.sector || null,
      status: p.status ?? null,
      nextActionAt: p.next_action_at,
      // Scoring Selene (chaleur)
      score: s?.score ?? null,
      tier: s?.tier ?? null,
      scoreLabel: s?.signalLabel ?? null,
      hasScore: !!s,
    };
  });

  return <RappelsClient rows={rows} />;
}
