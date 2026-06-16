import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  PROSPECT_SELECT_COLUMNS,
  type Prospect,
} from '@/lib/prospects';
import {
  ACTIVITY_SELECT_COLUMNS,
  type Activity,
} from '@/lib/activities';
import {
  ENROLLMENT_SELECT_COLUMNS,
  SEQUENCE_SELECT_COLUMNS,
  isEnrollmentOpen,
  type Sequence,
  type SequenceEnrollment,
} from '@/lib/sequences';
import { QUOTE_SELECT_COLUMNS, type Quote } from '@/lib/finance';
import ProspectDetailClient from './ProspectDetailClient';

export const dynamic = 'force-dynamic';

/**
 * Fiche Prospect 360° — route serveur (Sprint 4, étendu Sprint 7 + 8).
 *
 * Charge UN prospect par id via le client serveur (session user). La RLS
 * owner-based filtre automatiquement : un commercial ne récupère que SES
 * prospects (created_by/assigned_to), l'admin voit tout. Si la fiche est
 * introuvable OU non autorisée, la requête renvoie 0 ligne → notFound().
 *
 * Charge aussi en SSR les activités récentes du prospect, les séquences
 * actives (pour le panneau d'inscription), l'inscription en cours
 * éventuelle (RLS owner sur sequence_enrollments) et les devis du prospect
 * (Sprint 8, RLS owner sur quotes).
 *
 * Next 15 : `params` est une Promise à await.
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

  // RLS owner-based : .maybeSingle() renvoie null si la fiche n'existe pas
  // OU si elle n'appartient pas au commercial courant (non autorisé).
  const { data: prospectRow } = await supabase
    .from('prospects')
    .select(PROSPECT_SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!prospectRow) notFound();

  const prospect = prospectRow as unknown as Prospect;

  // Montant signé (deal_amount) — isolé dans prospect_finance (RLS admin-only,
  // migration 0021). On ne le charge QUE pour un admin/admin_limited : la RLS
  // renverrait de toute façon 0 ligne aux autres rôles, mais on évite une
  // requête garantie vide et on rend l'intention explicite côté serveur. C'est
  // la défense applicative qui DOUBLE la défense RLS — le montant ne transite
  // jamais vers un client non-admin.
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

  // Timeline + séquences actives + inscription en cours + devis, en parallèle.
  // La RLS filtre les activités (owner), les enrollments (owner) et les
  // devis (owner). Les séquences sont lisibles par tout authenticated.
  const [activityRes, sequencesRes, enrollmentRes, quotesRes] = await Promise.all([
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
  ]);

  const initialActivities = (activityRes.data ?? []) as unknown as Activity[];
  const activeSequences = (sequencesRes.data ?? []) as unknown as Sequence[];
  const initialQuotes = (quotesRes.data ?? []) as unknown as Quote[];

  const allEnrollments = (enrollmentRes.data ?? []) as unknown as SequenceEnrollment[];
  // Inscription « ouverte » la plus récente (active ou en pause) si elle existe.
  const activeEnrollment =
    allEnrollments.find((e) => isEnrollmentOpen(e.status)) ?? null;

  return (
    <ProspectDetailClient
      initialProspect={prospect}
      initialActivities={initialActivities}
      activeSequences={activeSequences}
      initialEnrollment={activeEnrollment}
      initialQuotes={initialQuotes}
      initialDealAmount={initialDealAmount}
      canViewFinance={isAdmin}
    />
  );
}
