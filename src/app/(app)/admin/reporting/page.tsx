import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';
import { COMMISSION_SELECT_COLUMNS, type Commission } from '@/lib/finance';
import {
  conversionFunnel,
  weightedForecast,
  periodCompare,
  monthPeriods,
  STAGE_PROBABILITY,
  type FunnelStage,
  type WeightedForecast,
  type PeriodCompareResult,
  type ForecastDeal,
  type ProspectForCompare,
  type CommissionForCompare,
} from '@/lib/reporting';
import ReportingClient, { type ProspectExportRow } from './ReportingClient';

export const dynamic = 'force-dynamic';

/**
 * /admin/reporting — Reporting avancé (admin-only).
 *
 * Gate d'accès : FULL-admin (admin / admin_limited), EXACTEMENT comme
 * /admin/commissions et /admin/doublons — cet écran affiche des MONTANTS
 * (deal_amount, CA signé, commissions), donc il est réservé aux admins
 * pleins, pas aux assistants. Le layout /admin gate déjà la console au sens
 * large (hasConsoleAccess) ; on renforce ici au niveau page comme les autres
 * pages financières.
 *
 * Lecture des montants : `prospect_finance` (RLS admin-only, migration 0021)
 * via le client server RLS-bound — un admin connecté passe la policy
 * `prospect_finance_admin_all`. Même approche que commissions (qui lit la
 * table `commissions` en s'appuyant sur la RLS admin). Aucun service-role
 * n'est nécessaire ici (lecture seule, dans une page déjà admin-gated).
 */
const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type Me = { id: string; email: string; full_name: string | null; role: string };

export type ReportingPageData = {
  adminName: string;
  funnel: FunnelStage[];
  forecast: WeightedForecast;
  /** Probabilités utilisées (défauts STAGE_PROBABILITY) — exposées pour l'UI. */
  probabilities: typeof STAGE_PROBABILITY;
  compare: PeriodCompareResult;
  periodLabels: { current: string; previous: string };
  /** Lignes prospects pour l'export CSV (PAS de montants — export commercial). */
  exportRows: ProspectExportRow[];
  totals: { prospects: number; openDeals: number; withAmount: number };
};

export default async function ReportingPage() {
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

  // Données en parallèle : prospects (RLS admin → tout), commissions (RLS
  // admin), prospect_finance (RLS admin-only), users (pour résoudre le
  // commercial dans l'export).
  const [
    { data: prospectsRaw },
    { data: commissionsRaw },
    { data: financeRaw },
    { data: usersRaw },
  ] = await Promise.all([
    supabase
      .from('prospects')
      .select(PROSPECT_SELECT_COLUMNS)
      .order('created_at', { ascending: false }),
    supabase.from('commissions').select(COMMISSION_SELECT_COLUMNS),
    supabase.from('prospect_finance').select('prospect_id, deal_amount'),
    supabase.from('users').select('id, full_name, email'),
  ]);

  const prospects = (prospectsRaw ?? []) as unknown as Prospect[];
  const commissions = (commissionsRaw ?? []) as unknown as Commission[];
  const finance = (financeRaw ?? []) as {
    prospect_id: string;
    deal_amount: number | null;
  }[];
  const users = (usersRaw ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
  }[];

  const amountByProspect = new Map<string, number | null>();
  for (const f of finance) amountByProspect.set(f.prospect_id, f.deal_amount);

  const userName = new Map<string, string>();
  for (const u of users) {
    userName.set(u.id, u.full_name ?? u.email.split('@')[0]);
  }

  // ----- Bloc 1 : Funnel de conversion -----
  const funnel = conversionFunnel(prospects);

  // ----- Bloc 2 : Forecast pondéré -----
  const deals: ForecastDeal[] = prospects.map((p) => ({
    status: p.status,
    dealAmount: amountByProspect.get(p.id) ?? null,
  }));
  const forecast = weightedForecast(deals);

  // ----- Bloc 3 : Comparaison de périodes (ce mois vs mois dernier) -----
  const { current, previous } = monthPeriods();
  const prospectsForCompare: ProspectForCompare[] = prospects.map((p) => ({
    created_at: p.created_at,
    status: p.status,
    dealAmount: amountByProspect.get(p.id) ?? null,
  }));
  const commissionsForCompare: CommissionForCompare[] = commissions.map((c) => ({
    created_at: c.created_at,
    base_amount: c.base_amount,
    amount: c.amount,
  }));
  const compare = periodCompare(
    prospectsForCompare,
    commissionsForCompare,
    current,
    previous
  );

  const monthFmt = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const periodLabels = {
    current: monthFmt.format(current.start),
    previous: monthFmt.format(previous.start),
  };

  // ----- Bloc 4 : Export CSV (commercial-facing → AUCUN montant) -----
  const exportRows: ProspectExportRow[] = prospects.map((p) => ({
    entreprise: p.company_name ?? '',
    contact: p.contact_name ?? '',
    email: p.email ?? '',
    statut: p.status ?? '',
    commercial: p.assigned_to ? userName.get(p.assigned_to) ?? '' : '',
    date: p.created_at ?? '',
  }));

  const openDeals = forecast.breakdown.reduce((s, b) => s + b.dealCount, 0);
  const withAmount = deals.filter(
    (d) => d.dealAmount != null && Number(d.dealAmount) > 0
  ).length;

  const data: ReportingPageData = {
    adminName: (me.full_name ?? me.email.split('@')[0]).split(/[\s.]+/)[0],
    funnel,
    forecast,
    probabilities: STAGE_PROBABILITY,
    compare,
    periodLabels,
    exportRows,
    totals: { prospects: prospects.length, openDeals, withAmount },
  };

  return <ReportingClient data={data} />;
}
