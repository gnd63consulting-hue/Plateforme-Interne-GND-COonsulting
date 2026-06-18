import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';
import { ACTIVITY_SELECT_COLUMNS, type Activity } from '@/lib/activities';
import {
  ENROLLMENT_SELECT_COLUMNS,
  SEQUENCE_SELECT_COLUMNS,
  isEnrollmentOpen,
  type Sequence,
  type SequenceEnrollment,
} from '@/lib/sequences';
import { QUOTE_SELECT_COLUMNS, type Quote } from '@/lib/finance';
import {
  INTEL_SELECT_COLUMNS,
  type ProspectIntelRow,
  type EnrichmentPayload,
} from '@/lib/prospect-intel';
import ProspectIntelPanel from './ProspectIntelPanel';
import ProspectDetailClient from './ProspectDetailClient';

export const dynamic = 'force-dynamic';

/**
 * Fiche Prospect 360 — route serveur.
 *
 * Charge UN prospect par id via le client serveur (session user). La RLS
 * owner-based filtre : un commercial ne recupere que SES prospects, l'admin
 * voit tout. Fiche introuvable ou non autorisee -> notFound().
 *
 * Charge en parallele : activites recentes, sequences actives, inscription en
 * cours, devis, et l'intel d'enrichissement la plus recente (cascade FR Atlas,
 * prospect_intel). L'intel s'affiche en tete via <ProspectIntelPanel> ; le gros
 * client (ProspectDetailClient) reste inchange.
 *
 * Next 15 : `params` est une Promise a await.
 */
export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: prospectRow } = await supabase
    .from('prospects')
    .select(PROSPECT_SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!prospectRow) notFound();

  const prospect = prospectRow as unknown as Prospect;

  // Montant signe (deal_amount) — isole dans prospect_finance (RLS admin-only,
  // migration 0021). Charge uniquement pour un admin/admin_limited.
  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = me?.role === 'admin' || me?.role === 'admin_limited';

  let initialDealAmount: number | null = null;
  if (isAdmin) {
    const { data: finance } = await supabase
      .from('prospect_finance')
      .select('deal_amount')
      .eq('prospect_id', id)
      .maybeSingle();
    initialDealAmount =
      finance?.deal_amount != null ? Number(finance.deal_amount) : null;
  }

  // Timeline + sequences + inscription + devis + intel, en parallele.
  const [activityRes, sequencesRes, enrollmentRes, quotesRes, intelRes] =
    await Promise.all([
      supabase
        .from('activities')
        .select(ACTIVITY_SELECT_COLUMNS)
        .eq('prospect_id', id)
        .order('occurred_at', { ascending: false })
        .limit(30),
      supabase
        .from('sequences')
        .select(SEQUENCE_SELECT_COLUMNS)
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('sequence_enrollments')
        .select(ENROLLMENT_SELECT_COLUMNS)
        .eq('prospect_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotes')
        .select(QUOTE_SELECT_COLUMNS)
        .eq('prospect_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('prospect_intel')
        .select(INTEL_SELECT_COLUMNS)
        .eq('prospect_id', id)
        .eq('intel_type', 'enrichment')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

  const initialActivities = (activityRes.data ?? []) as unknown as Activity[];
  const activeSequences = (sequencesRes.data ?? []) as unknown as Sequence[];
  const initialQuotes = (quotesRes.data ?? []) as unknown as Quote[];

  const allEnrollments = (enrollmentRes.data ?? []) as unknown as SequenceEnrollment[];
  const activeEnrollment =
    allEnrollments.find((e) => isEnrollmentOpen(e.status)) ?? null;

  const intelRow = (intelRes.data?.[0] ?? null) as unknown as ProspectIntelRow | null;
  const intel: EnrichmentPayload | null = intelRow?.payload ?? null;
  const intelDate = intelRow?.created_at ?? null;

  return (
    <>
      <ProspectIntelPanel intel={intel} createdAt={intelDate} />
      <ProspectDetailClient
        initialProspect={prospect}
        initialActivities={initialActivities}
        activeSequences={activeSequences}
        initialEnrollment={activeEnrollment}
        initialQuotes={initialQuotes}
        initialDealAmount={initialDealAmount}
        canViewFinance={isAdmin}
      />
    </>
  );
}
