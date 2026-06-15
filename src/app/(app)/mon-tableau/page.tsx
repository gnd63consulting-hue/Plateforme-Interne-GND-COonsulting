import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  PROSPECT_SELECT_COLUMNS,
  STATUS_OPTIONS,
  type Prospect,
} from '@/lib/prospects';
import {
  ACTIVITY_SELECT_COLUMNS,
  type Activity,
} from '@/lib/activities';
import { sumCaMidpointGndPriceEur } from '@/lib/ca-utils';
import MonTableauClient from './MonTableauClient';

export const dynamic = 'force-dynamic';

/**
 * Tableau de bord commercial PERSONNEL — scopé au commercial courant.
 *
 * Les chiffres sont calculés avec EXACTEMENT la même logique que le cockpit
 * admin v2 (src/app/(app)/admin/v2/page.tsx) pour rester cohérents :
 *   - CA réalisé    = sumCaMidpointGndPriceEur(status='gagne')
 *   - CA potentiel  = sumCaMidpointGndPriceEur(statuts encore en jeu :
 *                     a_contacter / contacte / rdv_pris / devis_envoye).
 *     On EXCLUT 'gagne' du potentiel (déjà compté dans le réalisé), comme
 *     le header KPI global de l'admin v2.
 *   - Commission    = CA × users.commission_rate (réalisée + potentielle,
 *                     affichées distinctement).
 *
 * Le prisme est TOUJOURS « prix service GND » (sumCaMidpointGndPriceEur),
 * jamais le CA entreprise du prospect — cf. avertissements de ca-utils.ts.
 */

/** Statuts encore « en jeu » pour le CA potentiel (pipeline en cours).
 *  Aligné sur CA_POTENTIEL_ACTIVE_STATUSES du cockpit admin v2. */
const PIPELINE_ACTIVE_STATUSES = new Set([
  'a_contacter',
  'contacte',
  'rdv_pris',
  'devis_envoye',
]);

/** Statuts considérés « clos » (sortis du pipeline actif). */
const CLOSED_STATUSES = new Set([
  'gagne',
  'perdu',
  'archived',
  'pas_interesse',
  'coordonnees_invalides',
  'ne_plus_demarcher',
  'processus_termine',
]);

/** Paliers bonus officiels (identiques à l'onboarding commercial). */
export const BONUS_TIERS = [
  { contrats: 20, bonus: 250 },
  { contrats: 25, bonus: 500 },
  { contrats: 30, bonus: 750 },
] as const;

export type StatusBreakdownEntry = {
  status: string;
  label: string;
  tone: string;
  count: number;
  /** Valeur GND (prix service) cumulée pour ce statut, en €. */
  valeur: number;
};

export type RecentActivityEntry = {
  id: string;
  kind: string;
  body: string | null;
  occurred_at: string;
  company: string | null;
};

export type MonTableauData = {
  prenom: string;
  commissionRate: number | null; // décimal (0.10 = 10%)
  commissionPct: number | null; // entier %
  // Pipeline
  prospectsTotal: number; // tous prospects scopés
  pipelineActifCount: number; // prospects encore en jeu
  statusBreakdown: StatusBreakdownEntry[];
  // CA
  caPotentiel: number; // € — pipeline en cours (prix service GND)
  caRealise: number; // € — signatures (prix service GND)
  // Commission
  commissionRealisee: number; // €
  commissionPotentielle: number; // €
  // Signatures / paliers
  signatures: number; // nb prospects 'gagne'
  // Relances
  relancesEnRetard: number;
  relancesAujourdhui: number;
  // Activité
  activites: RecentActivityEntry[];
};

export default async function MonTableauPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Profil : prénom + taux de commission.
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, commission_rate')
    .eq('id', user.id)
    .maybeSingle();

  // Prospects scopés au commercial courant (RLS owner + filtre explicite,
  // cohérent avec /prospects et /prospects/relances).
  const { data: prospectsRaw } = await supabase
    .from('prospects')
    .select(PROSPECT_SELECT_COLUMNS)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const prospects = (prospectsRaw ?? []) as unknown as Prospect[];

  // Activités récentes du commercial (RLS owner_id = auth.uid()).
  const { data: activitiesRaw } = await supabase
    .from('activities')
    .select(ACTIVITY_SELECT_COLUMNS)
    .order('occurred_at', { ascending: false })
    .limit(8);

  const activities = (activitiesRaw ?? []) as unknown as Activity[];

  // ---- Calculs CA (prisme prix service GND, via ca-utils) -------------------
  const signedProspects = prospects.filter((p) => p.status === 'gagne');
  const activeProspects = prospects.filter((p) =>
    PIPELINE_ACTIVE_STATUSES.has(p.status)
  );

  const caRealise = sumCaMidpointGndPriceEur(signedProspects);
  const caPotentiel = sumCaMidpointGndPriceEur(activeProspects);

  // ---- Commission ----------------------------------------------------------
  const commissionRate =
    profile?.commission_rate != null ? Number(profile.commission_rate) : null;
  const commissionPct =
    commissionRate != null ? Math.round(commissionRate * 100) : null;
  const commissionRealisee =
    commissionRate != null ? Math.round(caRealise * commissionRate) : 0;
  const commissionPotentielle =
    commissionRate != null ? Math.round(caPotentiel * commissionRate) : 0;

  // ---- Répartition par statut (compte + valeur), pipeline actif uniquement -
  // On parcourt STATUS_OPTIONS pour conserver l'ordre logique du pipeline et
  // les couleurs (tone) existantes. On n'affiche que les statuts encore en
  // jeu + 'gagne' (utile de voir les signatures dans le funnel perso).
  const FUNNEL_STATUSES = [
    'a_contacter',
    'contacte',
    'rdv_pris',
    'devis_envoye',
    'gagne',
  ];
  const statusBreakdown: StatusBreakdownEntry[] = FUNNEL_STATUSES.map(
    (statusValue) => {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusValue);
      const ofStatus = prospects.filter((p) => p.status === statusValue);
      return {
        status: statusValue,
        label: opt?.label ?? statusValue,
        tone: opt?.tone ?? 'bg-slate-100 text-slate-700',
        count: ofStatus.length,
        valeur: sumCaMidpointGndPriceEur(ofStatus),
      };
    }
  );

  const pipelineActifCount = prospects.filter(
    (p) => !CLOSED_STATUSES.has(p.status)
  ).length;

  // ---- Relances (next_action_at) — en retard / aujourd'hui ------------------
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  let relancesEnRetard = 0;
  let relancesAujourdhui = 0;
  for (const p of prospects) {
    if (!p.next_action_at) continue;
    if (CLOSED_STATUSES.has(p.status)) continue; // pas de relance sur les clos
    const d = new Date(p.next_action_at);
    if (d < startToday) relancesEnRetard += 1;
    else if (d < endToday) relancesAujourdhui += 1;
  }

  // ---- Activités récentes (résolution du nom de société) --------------------
  const companyById = new Map(prospects.map((p) => [p.id, p.company_name]));
  const activites: RecentActivityEntry[] = activities.map((a) => ({
    id: a.id,
    kind: a.kind,
    body: a.body,
    occurred_at: a.occurred_at,
    company: companyById.get(a.prospect_id) ?? null,
  }));

  const prenom =
    (profile?.full_name ?? profile?.email ?? user.email ?? '')
      .split(/[\s.]+/)[0] || 'à toi';

  const data: MonTableauData = {
    prenom,
    commissionRate,
    commissionPct,
    prospectsTotal: prospects.length,
    pipelineActifCount,
    statusBreakdown,
    caPotentiel,
    caRealise,
    commissionRealisee,
    commissionPotentielle,
    signatures: signedProspects.length,
    relancesEnRetard,
    relancesAujourdhui,
    activites,
  };

  return <MonTableauClient data={data} />;
}
