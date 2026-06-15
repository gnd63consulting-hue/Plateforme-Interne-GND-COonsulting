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
import { COMMISSION_SELECT_COLUMNS, type Commission } from '@/lib/finance';
import {
  PIPELINE_COLUMNS,
  getColumnForStatus,
  type PipelineColumnId,
} from '@/lib/pipeline';
import {
  type MonTableauData,
  type RecentActivityEntry,
  type StatusBreakdownEntry,
  type PipelineSnapshotColumn,
  type SnapshotCard,
} from './types';
import MonTableauClient from './MonTableauClient';

export const dynamic = 'force-dynamic';

/**
 * Tableau de bord commercial PERSONNEL — scopé au commercial courant.
 *
 * Deux prismes de commission coexistent désormais (Sprint 8) :
 *
 *   1. Commission RÉELLE (source de vérité, table `commissions`) :
 *      somme des commissions effectivement générées à la signature
 *      (montant HT signé × taux figé au moment du gain). Découpée en
 *      « à payer » / « payée ». C'est le chiffre qui compte vraiment.
 *
 *   2. Commission ESTIMÉE (héritée, depuis `ca_estime`, prisme prix service
 *      GND via sumCaMidpointGndPriceEur) : projection du pipeline en cours
 *      → commission potentielle. Garde aussi une estimation « réalisée »
 *      depuis les midpoints des signatures, à titre indicatif.
 *
 * Le CA potentiel/réalisé reste calculé comme avant (cohérent cockpit admin
 * v2). Le prisme est TOUJOURS « prix service GND » — cf. ca-utils.ts.
 *
 * Sprint 10 (redesign mockup) : on calcule en plus un SNAPSHOT pipeline
 * (colonnes kanban vivantes + quelques cartes d'aperçu par colonne) réutilisant
 * la logique de groupement existante (`getColumnForStatus`/`PIPELINE_COLUMNS`),
 * sans fetch supplémentaire — les prospects sont déjà chargés.
 *
 * Sprint 10.1 (résumé compact) : sur le DASHBOARD le pipeline est un résumé
 * scannable (cartes-étapes), pas un clone du Kanban. On ne rend donc qu'un
 * APERÇU très court par colonne (cf. SNAPSHOT_CARDS_PER_COLUMN) — le Kanban
 * complet reste sur /prospects.
 */

/** Statuts encore « en jeu » pour le CA potentiel (pipeline en cours). */
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

/**
 * Nombre de cartes d'aperçu rendues par colonne dans le snapshot.
 * Volontairement TRÈS court (résumé dashboard, pas le Kanban complet) : au plus
 * 2 prospects par étape, le reste est résumé par « +N de plus ».
 */
const SNAPSHOT_CARDS_PER_COLUMN = 2;

function isHot(p: Prospect): boolean {
  return (
    !!p.classification &&
    /chaud|hot|🔥|prioritaire/i.test(p.classification)
  );
}

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

  // Prospects scopés au commercial courant (RLS owner + filtre explicite).
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

  // Commissions RÉELLES du commercial. Filtre explicite sur commercial_id :
  // la RLS commissions_select_own scope déjà au user, mais un admin (qui a
  // commissions_admin_all) verrait TOUT — or « ma commission » doit rester
  // strictement personnelle. On force donc le filtre côté requête.
  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select(COMMISSION_SELECT_COLUMNS)
    .eq('commercial_id', user.id)
    .order('created_at', { ascending: false });

  const commissions = (commissionsRaw ?? []) as unknown as Commission[];

  // ---- Calculs CA (prisme prix service GND, via ca-utils) -------------------
  const signedProspects = prospects.filter((p) => p.status === 'gagne');
  const activeProspects = prospects.filter((p) =>
    PIPELINE_ACTIVE_STATUSES.has(p.status)
  );

  const caRealise = sumCaMidpointGndPriceEur(signedProspects);
  const caPotentiel = sumCaMidpointGndPriceEur(activeProspects);

  // ---- Commission ESTIMÉE (depuis ca_estime) -------------------------------
  const commissionRate =
    profile?.commission_rate != null ? Number(profile.commission_rate) : null;
  const commissionPct =
    commissionRate != null ? Math.round(commissionRate * 100) : null;
  const commissionEstimeeRealisee =
    commissionRate != null ? Math.round(caRealise * commissionRate) : 0;
  const commissionPotentielle =
    commissionRate != null ? Math.round(caPotentiel * commissionRate) : 0;

  // ---- Commission RÉELLE (table commissions, source de vérité) -------------
  let commissionReelleAPayer = 0;
  let commissionReellePayee = 0;
  for (const c of commissions) {
    if (c.statut === 'a_payer') commissionReelleAPayer += Number(c.amount);
    else if (c.statut === 'paye') commissionReellePayee += Number(c.amount);
    // 'annule' ignoré.
  }
  commissionReelleAPayer = Math.round(commissionReelleAPayer);
  commissionReellePayee = Math.round(commissionReellePayee);
  const commissionReelleTotale =
    commissionReelleAPayer + commissionReellePayee;

  // ---- Répartition par statut (compte + valeur), funnel ---------------------
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

  // ---- Snapshot pipeline (réf mockup) ---------------------------------------
  // Regroupement par colonne kanban via la MÊME logique que /prospects
  // (getColumnForStatus). Colonnes vivantes uniquement (on n'affiche pas
  // « Sorties » sur le dashboard). Aucune requête supplémentaire.
  const byColumn = new Map<PipelineColumnId, Prospect[]>();
  for (const col of PIPELINE_COLUMNS) byColumn.set(col.id, []);
  for (const p of prospects) {
    byColumn.get(getColumnForStatus(p.status))?.push(p);
  }
  const pipelineSnapshot: PipelineSnapshotColumn[] = PIPELINE_COLUMNS.filter(
    (c) => !c.dead
  ).map((col) => {
    const list = byColumn.get(col.id) ?? [];
    const cards: SnapshotCard[] = list
      .slice(0, SNAPSHOT_CARDS_PER_COLUMN)
      .map((p) => ({
        id: p.id,
        company: p.company_name,
        contact: p.contact_name,
        city: p.city,
        phone: p.phone,
        address: p.address,
        status: p.status,
        caEstime: p.ca_estime,
        hot: isHot(p),
      }));
    return {
      id: col.id,
      label: col.label,
      count: list.length,
      valeur: sumCaMidpointGndPriceEur(list),
      cards,
    };
  });

  // ---- Relances (next_action_at) — en retard / aujourd'hui / 7j -------------
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);

  let relancesEnRetard = 0;
  let relancesAujourdhui = 0;
  let relancesAVenir = 0;
  for (const p of prospects) {
    if (!p.next_action_at) continue;
    if (CLOSED_STATUSES.has(p.status)) continue;
    const d = new Date(p.next_action_at);
    if (d < startToday) relancesEnRetard += 1;
    else if (d < endToday) relancesAujourdhui += 1;
    else if (d < endWeek) relancesAVenir += 1;
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
    pipelineSnapshot,
    caPotentiel,
    caRealise,
    commissionEstimeeRealisee,
    commissionPotentielle,
    commissionReelleAPayer,
    commissionReellePayee,
    commissionReelleTotale,
    commissionsCount: commissions.length,
    signatures: signedProspects.length,
    relancesEnRetard,
    relancesAujourdhui,
    relancesAVenir,
    activites,
  };

  return <MonTableauClient data={data} />;
}
