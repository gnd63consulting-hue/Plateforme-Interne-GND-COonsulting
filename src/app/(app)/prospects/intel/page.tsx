import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  INTEL_SELECT_COLUMNS,
  SCORING_SOURCE,
  CALL_PITCH_SOURCE,
  latestEnrichmentByProspect,
  latestScoringByProspect,
  latestCallPitchByProspect,
  type ProspectIntelRow,
  type LatestEnrichment,
  type SeleneScore,
  type CallPitch,
} from '@/lib/prospect-intel';
import IntelCallListClient, { type IntelRowVM } from './IntelCallListClient';

export const dynamic = 'force-dynamic';

/**
 * Liste d'appel phone-first (Hermes / enrichissement Atlas + scoring Selene).
 *
 * Affiche les prospects de l'utilisateur (RLS owner) enrichis de l'intel
 * la plus recente (prospect_intel, cascade FR) et du score Selene le plus
 * recent (prospect_intel, source='selene.scoring'). Le telephone couvre ~100%
 * de la base, l'email ~35% -> on met l'appel en avant. Aucun montant financier.
 *
 * Tri par defaut : priorite Selene (score le plus chaud en tete). Les prospects
 * sans score passent en fin de liste en conservant le sous-ordre historique
 * (enrichi > email valide > tel > alpha).
 *
 * Filtre par defaut cote client : "A appeler" — seuls les prospects dans un
 * statut encore travaillable par un commercial. Les fiches reconciliees en
 * perdu/archived/gagne/etc. sortent automatiquement de la liste d'appel : c'est
 * un composant serveur live, donc tout changement de statut se reflete au
 * prochain chargement (et au revalidate apres un appel logue). Le toggle "Voir
 * tout mon pipeline" cote client leve ce masque sans nouvelle requete : la
 * requete serveur ci-dessous ramene DEJA tous les prospects de l'utilisateur,
 * tous statuts confondus (le filtrage "appelable" est purement client).
 *
 * Degrade proprement : si la migration 0028 n'est pas encore appliquee, la
 * requete prospect_intel renvoie 0 ligne pour un commercial -> la liste
 * s'affiche sans intel ni score (coordonnees brutes du prospect), sans erreur.
 */
export default async function ProspectIntelPage() {
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
    next_action_at: string | null;
  };

  const { data: prospectsRaw } = await supabase
    .from('prospects')
    .select(
      'id, company_name, contact_name, prenom_contact, role_contact, phone, email, city, sector, status, website, next_action_at'
    )
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const prospects = (prospectsRaw ?? []) as unknown as PRow[];
  const ids = prospects.map((p) => p.id);

  let intelMap = new Map<string, LatestEnrichment>();
  let scoreMap = new Map<string, SeleneScore>();
  let callPitchMap = new Map<string, CallPitch>();
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

    // Scores Selene : meme table, intel_type='signal' + source='selene.scoring'.
    // On lit le plus recent par prospect (append-only) pour prioriser l'appel.
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

    // Pitch d'appel Nyx : meme table, intel_type='signal' + source='nyx.call_pitch'.
    const { data: pitchRaw } = await supabase
      .from('prospect_intel')
      .select(INTEL_SELECT_COLUMNS)
      .eq('intel_type', 'signal')
      .eq('source', CALL_PITCH_SOURCE)
      .in('prospect_id', ids)
      .order('created_at', { ascending: false });
    callPitchMap = latestCallPitchByProspect(
      (pitchRaw ?? []) as unknown as ProspectIntelRow[]
    );
  }

  const rows: IntelRowVM[] = prospects.map((p) => {
    const e = intelMap.get(p.id);
    const s = scoreMap.get(p.id);
    const cp = callPitchMap.get(p.id);
    const dirigeant =
      e?.dirigeant_nom ??
      p.contact_name ??
      ([p.prenom_contact, p.role_contact].filter(Boolean).join(' ') || null);
    return {
      id: p.id,
      company: p.company_name ?? '--',
      dirigeant: dirigeant || null,
      tel: e?.tel_value || p.phone || null,
      email: e?.email_value || p.email || null,
      emailStatus: e?.email_status ?? null,
      city: e?.ville || p.city || null,
      sector: e?.naf_secteur || p.sector || null,
      status: p.status ?? null,
      nextActionAt: p.next_action_at ?? null,
      enrichStatus: e?.status ?? null,
      angle: e?.angle_gnd ?? null,
      signal: e?.signal_detecte ?? null,
      presence: e?.presence_digitale ?? null,
      confidence: e?.confidence?.overall ?? null,
      sourceCount: Array.isArray(e?.source_urls) ? e!.source_urls!.length : 0,
      hasIntel: !!e,
      // Scoring Selene (priorisation appel)
      score: s?.score ?? null,
      tier: s?.tier ?? null,
      prioriteAppel: s?.prioriteAppel ?? null,
      opportuniteWeb: s?.opportuniteWeb ?? false,
      scoreLabel: s?.signalLabel ?? null,
      hasScore: !!s,
      // Pitch-helper Selene (quoi dire) — tous optionnels.
      angleSelene: s?.angleRecommande ?? null,
      raisons: s?.raisons ?? [],
      persona: s?.persona ?? null,
      fenetreAchat: s?.fenetreAchat ?? null,
      // Pitch d'appel Nyx (script tel pret-a-dire)
      callPitchHook: cp?.hookOral ?? null,
      callPitchRaison: cp?.raisonAppel ?? null,
      callPitchAngle: cp?.angle ?? null,
      callPitchObjection: cp?.objection ?? null,
      hasCallPitch: !!cp,
    };
  });

  // Tri par defaut : priorite Selene (score DESC). Sans score -> fin de liste,
  // sous-trie par les anciens signaux (enrichi > email valide > tel) puis alpha.
  const fallbackRank = (r: IntelRowVM): number => {
    let s = 0;
    if (r.enrichStatus === 'enrichi') s += 100;
    if (r.email && r.emailStatus === 'valid') s += 10;
    if (r.tel) s += 1;
    return s;
  };
  rows.sort((a, b) => {
    // Les prospects avec score Selene passent toujours devant ceux sans score.
    if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
    if (a.hasScore && b.hasScore) {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      if (sb !== sa) return sb - sa; // score le plus chaud d'abord
    }
    return (
      fallbackRank(b) - fallbackRank(a) || a.company.localeCompare(b.company)
    );
  });

  return <IntelCallListClient rows={rows} />;
}
