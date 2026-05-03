import { redirect } from 'next/navigation';
import {
  Activity,
  Banknote,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  FileSignature,
  Filter,
  GraduationCap,
  Layers,
  Mail,
  Medal,
  Phone,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';
import {
  formatDate,
  labelForStatus,
  toneForStatus,
  PROSPECT_SELECT_COLUMNS,
  type Prospect,
} from '@/lib/prospects';
import { formatEur, sumCaMidpointEur } from '@/lib/ca-utils';
import AdminSyncButton from '@/components/AdminSyncButton';
import AdminProspectsPanel from '@/components/AdminProspectsPanel';
import SpeedometerGauge from '@/components/SpeedometerGauge';
import RocketProgress from '@/components/RocketProgress';
import AnimatedNumber from '@/components/cockpit/AnimatedNumber';
import ScanLine from '@/components/cockpit/ScanLine';
import HudBlob from '@/components/cockpit/HudBlob';
import ChromeBezel from '@/components/cockpit/ChromeBezel';
import { RoleBadge } from '@/components/RoleBadge';

export const dynamic = 'force-dynamic';

type AdminUser = { id: string; email: string; full_name: string | null; role: string };
type AdminProgression = { user_id: string; module_slug: string; completed: boolean; completed_at: string | null };
type FunnelStage = { value: string; label: string; Icon: typeof Mail };

const FUNNEL_STAGES: FunnelStage[] = [
  { value: 'a_contacter', label: 'À contacter', Icon: Mail },
  { value: 'contacte', label: 'Contacté', Icon: Phone },
  { value: 'rdv_pris', label: 'RDV pris', Icon: CalendarCheck },
  { value: 'devis_envoye', label: 'Devis envoyé', Icon: FileSignature },
  { value: 'gagne', label: 'Devis signé', Icon: CheckCircle2 },
];
const ACTIVE_PIPELINE_STATUSES = new Set(['a_contacter', 'contacte', 'rdv_pris', 'devis_envoye', 'gagne']);
const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

const TEAM_TIERS = [
  { threshold: 5, bonus: '+500 €', label: 'Décollage' },
  { threshold: 15, bonus: '+2 000 €', label: 'Croisière' },
  { threshold: 30, bonus: '+5 000 €', label: 'Mach 1' },
  { threshold: 50, bonus: '+12 000 €', label: 'Orbite' },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const [{ data: usersRaw }, { data: progressionsRaw }, { data: prospectsRaw }] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role'),
    supabase.from('progressions').select('user_id, module_slug, completed, completed_at'),
    supabase.from('prospects').select(PROSPECT_SELECT_COLUMNS).order('updated_at', { ascending: false }),
  ]);

  const users = (usersRaw ?? []) as AdminUser[];
  const progressions = (progressionsRaw ?? []) as AdminProgression[];
  const prospects = (prospectsRaw ?? []) as unknown as Prospect[];

  const completedByUser = new Map<string, Set<string>>();
  const lastByUser = new Map<string, string>();
  for (const p of progressions) {
    if (!p.completed) continue;
    const set = completedByUser.get(p.user_id) ?? new Set<string>();
    set.add(p.module_slug);
    completedByUser.set(p.user_id, set);
    if (p.completed_at) {
      const prev = lastByUser.get(p.user_id);
      if (!prev || p.completed_at > prev) lastByUser.set(p.user_id, p.completed_at);
    }
  }

  const roleRank: Record<string, number> = { admin: 0, admin_limited: 1, freelance: 2 };
  const sortedUsers = [...users].sort((a, b) => {
    const ra = roleRank[a.role] ?? 99;
    const rb = roleRank[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
  });

  const userLabel = (id: string | null): string => {
    if (!id) return '— non assigné';
    const u = users.find((x) => x.id === id);
    return u?.full_name ?? u?.email ?? id.slice(0, 8);
  };

  const byStatus = new Map<string, number>();
  const byAssignee = new Map<string, number>();
  const byClassification = new Map<string, number>();
  const bySector = new Map<string, number>();
  const byBranche = new Map<string, number>();
  let wonCount = 0;
  let rdvCount = 0;
  let contactedCount = 0;

  for (const p of prospects) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    const key = p.assigned_to ?? p.created_by;
    byAssignee.set(key, (byAssignee.get(key) ?? 0) + 1);
    if (p.classification) byClassification.set(p.classification, (byClassification.get(p.classification) ?? 0) + 1);
    if (p.sector) bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + 1);
    if (p.branche) byBranche.set(p.branche, (byBranche.get(p.branche) ?? 0) + 1);
    if (p.status === 'gagne') wonCount++;
    if (p.status === 'rdv_pris') rdvCount++;
    if (p.status === 'contacte' || p.status === 'rdv_pris' || p.status === 'devis_envoye' || p.status === 'gagne') {
      contactedCount++;
    }
  }

  const activeProspects = prospects.filter((p) => ACTIVE_PIPELINE_STATUSES.has(p.status));
  const wonProspects = prospects.filter((p) => p.status === 'gagne');
  const caPotentielTotal = sumCaMidpointEur(activeProspects);
  const caSigne = sumCaMidpointEur(wonProspects);
  const conversionRate = prospects.length > 0 ? (wonCount / prospects.length) * 100 : 0;
  const contactRate = prospects.length > 0 ? (contactedCount / prospects.length) * 100 : 0;
  const rdvRate = prospects.length > 0 ? (rdvCount / prospects.length) * 100 : 0;

  const funnelCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: prospects.filter((p) => p.status === stage.value).length,
  }));
  const funnelMaxCount = Math.max(1, ...funnelCounts.map((s) => s.count));

  const ranking = [...byAssignee.entries()]
    .map(([uid, total]) => {
      const assigned = prospects.filter((p) => (p.assigned_to ?? p.created_by) === uid);
      const rdv = assigned.filter((p) => p.status === 'rdv_pris').length;
      const won = assigned.filter((p) => p.status === 'gagne').length;
      const caPotentiel = sumCaMidpointEur(assigned.filter((p) => ACTIVE_PIPELINE_STATUSES.has(p.status)));
      const caSigneCom = sumCaMidpointEur(assigned.filter((p) => p.status === 'gagne'));
      return { uid, total, rdv, won, caPotentiel, caSigneCom };
    })
    .sort((a, b) => {
      if (b.caPotentiel !== a.caPotentiel) return b.caPotentiel - a.caPotentiel;
      return b.total - a.total;
    });

  const rankingMaxCa = Math.max(1, ...ranking.map((r) => r.caPotentiel));
  const COMMERCIAL_ELIGIBLE_ROLES = new Set(['freelance', 'admin', 'admin_limited', 'commercial']);
  const commercialOptions = sortedUsers
    .filter((u) => COMMERCIAL_ELIGIBLE_ROLES.has(u.role))
    .map((u) => {
      const suffix = u.role === 'admin' ? ' (admin)' : u.role === 'admin_limited' ? ' (co-admin)' : '';
      return { id: u.id, label: `${u.full_name ?? u.email}${suffix}` };
    });

  const totalCommerciaux = ranking.length;
  const teamNextTier = TEAM_TIERS.find((t) => wonCount < t.threshold);

  return (
    <div className="relative">
      {/* Hero */}
      <header className="relative mb-12 flex min-h-[36vh] flex-col justify-end overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-4 select-none whitespace-nowrap font-display text-[20vw] font-medium leading-none tracking-tighter text-gnd-bronze/[0.04] sm:-bottom-20 sm:text-[16rem]"
        >
          Administration.
        </span>
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-gnd-amber" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-gnd-amber">
              Vue d'ensemble plateforme
            </span>
          </div>
          <h1 className="font-display text-display-xl font-medium leading-[0.95] tracking-tight text-gnd-bronze">
            Vue <span className="italic text-gnd-amber">globale</span>.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-gnd-bronze-soft sm:text-lg">
            Pilotage formation, pipeline prospects, sync Notion. Tableau de bord pour piloter l'équipe.
          </p>
        </div>
      </header>

      {/* CONSOLE PLATEFORME */}
      <CockpitPanel className="mb-10" withScanLine>
        <HudBlob position="top-right" size="lg" />
        <HudBlob position="bottom-left" size="md" />

        <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gnd-amber/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-gnd-amber shadow-[0_0_8px_rgba(232,133,61,0.8)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-gnd-amber">
              Vue Plateforme · Live
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gnd-cream/50">
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-gnd-cream/70">
              <Users className="h-3 w-3 text-gnd-amber" aria-hidden />
              {totalCommerciaux} commerc.
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-gnd-cream/70">
              <Activity className="h-3 w-3 text-gnd-amber" aria-hidden />
              {prospects.length} prosp.
            </span>
          </div>
        </div>

        {/* SPEEDOMETER + ROCKET row */}
        <div className="relative z-10 mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-between rounded-2xl border border-gnd-amber/10 bg-gnd-ink/40 p-6 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-gnd-amber" aria-hidden />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gnd-amber">
                Conversion équipe
              </span>
            </div>
            <ChromeBezel glow>
              <SpeedometerGauge
                value={conversionRate}
                label="Taux conversion"
                formatValue={(v) => `${Math.round(v)}`}
                subtitle="%"
                subLeft={{ value: contactRate, label: 'CTC' }}
                subRight={{ value: rdvRate, label: 'RDV' }}
              />
            </ChromeBezel>
            <div className="mt-4 flex w-full items-center justify-between border-t border-gnd-amber/10 pt-3 text-center">
              <KpiTriple label="Signés" value={wonCount} />
              <div className="h-6 w-px bg-gnd-amber/20" />
              <KpiTriple label="Total" value={prospects.length} />
              <div className="h-6 w-px bg-gnd-amber/20" />
              <KpiTripleStr label="CA Sig." value={formatEur(caSigne)} accent />
            </div>
          </div>

          <div className="relative flex flex-col rounded-2xl border border-gnd-amber/10 bg-gnd-ink/40 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-gnd-amber" aria-hidden />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gnd-amber">
                  Trajectoire équipe
                </span>
              </div>
              <span className="rounded-full border border-gnd-amber/30 bg-gnd-amber/10 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-gnd-amber-glow">
                {wonCount} signé{wonCount > 1 ? 's' : ''} équipe
              </span>
            </div>
            <h3 className="mb-1 font-display text-2xl font-medium text-gnd-cream">
              Décollage <span className="italic text-gnd-amber">collectif</span>
            </h3>
            <p className="mb-6 max-w-md text-sm text-gnd-cream/60">
              Chaque contrat signé par l'équipe rapproche du palier suivant. Bonus pool partagé.
            </p>
            <div className="flex h-72 items-stretch">
              <RocketProgress signed={wonCount} tiers={TEAM_TIERS} />
            </div>
            {teamNextTier && (
              <div className="mt-4 border-t border-gnd-amber/10 pt-4">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-gnd-cream/60">
                  <span>Prochain palier équipe · {teamNextTier.label}</span>
                  <span className="text-gnd-amber">{wonCount} / {teamNextTier.threshold}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gnd-bronze/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow shadow-[0_0_8px_rgba(232,133,61,0.6)] transition-all duration-700"
                    style={{ width: `${(wonCount / teamNextTier.threshold) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero KPIs */}
        <div className="relative z-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <CockpitKpi label="Total prospects" value={prospects.length} sub="actifs dans le pipeline" icon={<Users className="h-4 w-4" />} />
          <CockpitKpi label="CA potentiel" valueStr={formatEur(caPotentielTotal)} sub="midpoint pipeline" icon={<TrendingUp className="h-4 w-4" />} accent />
          <CockpitKpi label="CA signé" valueStr={formatEur(caSigne)} sub="devis signés" icon={<Banknote className="h-4 w-4" />} highlight />
          <CockpitKpi label="Devis signés" value={wonCount} sub={prospects.length > 0 ? `${Math.round((wonCount / prospects.length) * 100)} % du total` : '—'} icon={<CheckCircle2 className="h-4 w-4" />} highlight />
        </div>

        <div className="relative z-10 mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <CockpitMiniKpi label="Contactés+" value={contactedCount} icon={<Phone className="h-3 w-3" />} />
          <CockpitMiniKpi label="RDV pris" value={rdvCount} icon={<CalendarCheck className="h-3 w-3" />} />
          <CockpitMiniKpi label="Taux contact" value={Math.round(contactRate)} suffix="%" icon={<Activity className="h-3 w-3" />} />
          <CockpitMiniKpi label="Conversion" value={Math.round(conversionRate)} suffix="%" icon={<Target className="h-3 w-3" />} />
        </div>
      </CockpitPanel>

      <CockpitSection number="01" icon={<BarChart3 className="h-4 w-4" />} label="Synchronisation" accent="Notion">
        <AdminSyncButton options={commercialOptions} />
      </CockpitSection>

      <CockpitSection number="02" icon={<Filter className="h-4 w-4" />} label="Funnel de" accent="conversion">
        <CockpitPanel withScanLine>
          <HudCornerLabel label="FNL.001" />
          <div className="relative z-10 space-y-3">
            {funnelCounts.map((stage, idx) => {
              const widthPct = (stage.count / funnelMaxCount) * 100;
              const prev = idx > 0 ? funnelCounts[idx - 1].count : null;
              const conversionFromPrev = prev && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
              const intensity = idx / (funnelCounts.length - 1);
              return (
                <div key={stage.value} className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gnd-amber/15 bg-gnd-amber/10 text-gnd-amber"
                    style={{ opacity: 0.5 + intensity * 0.5 }}
                  >
                    <stage.Icon className="h-4 w-4" />
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-cream/80">
                      {stage.label}
                    </div>
                  </div>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg border border-gnd-amber/10 bg-gnd-ink/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-gnd-bronze-soft via-gnd-amber to-gnd-amber-glow shadow-[0_0_8px_rgba(232,133,61,0.4)] transition-all duration-700"
                      style={{ width: `${Math.max(2, widthPct)}%` }}
                    />
                    <div className="relative flex h-full items-center justify-end pr-3 font-mono text-xs font-bold tabular-nums text-gnd-cream">
                      {stage.count}
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    {conversionFromPrev != null ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-gnd-amber">
                        <TrendingUp className="h-3 w-3" />
                        {conversionFromPrev}%
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-gnd-bronze-faded">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="relative z-10 mt-5 border-t border-gnd-amber/10 pt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-cream/40">
            Le pourcentage indique le passage depuis l'étape précédente. Statuts perdu/archivé exclus.
          </p>
        </CockpitPanel>
      </CockpitSection>

      <CockpitSection number="03" icon={<Trophy className="h-4 w-4" />} label="Classement" accent="commerciaux" hint="tri par CA potentiel">
        <CockpitPanel padding="none" withScanLine>
          <HudCornerLabel label="RNK.001" />
          {ranking.length === 0 ? (
            <div className="px-5 py-12 text-center font-display text-base text-gnd-cream/60">
              Aucun prospect assigné pour l'instant.
            </div>
          ) : (
            <ul className="relative z-10 divide-y divide-gnd-amber/10">
              {ranking.map((r, idx) => {
                const label = userLabel(r.uid);
                const caRatio = r.caPotentiel / rankingMaxCa;
                const personalConvRate = r.total > 0 ? (r.won / r.total) * 100 : 0;
                return (
                  <li key={r.uid} className="grid grid-cols-12 items-center gap-3 px-5 py-4 transition hover:bg-gnd-amber/[0.03] sm:px-7">
                    <div className="col-span-12 flex items-center gap-3 md:col-span-3">
                      <CockpitRankBadge index={idx} />
                      <CockpitAvatar name={label} />
                      <div className="min-w-0">
                        <div className="truncate font-display text-base font-medium text-gnd-cream">{label}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-cream/50">{r.total} prospect{r.total > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="col-span-6 flex items-center gap-4 md:col-span-2">
                      <CockpitStat label="RDV" value={r.rdv} />
                      <CockpitStat label="Sign." value={r.won} highlight={r.won > 0} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <MiniGauge value={personalConvRate} />
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <div className="flex items-center gap-2">
                        <div className="relative h-6 flex-1 overflow-hidden rounded-md border border-gnd-amber/10 bg-gnd-ink/40">
                          <div
                            className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-gnd-bronze-soft via-gnd-amber to-gnd-amber-glow shadow-[0_0_8px_rgba(232,133,61,0.4)] transition-all duration-700"
                            style={{ width: `${Math.max(4, caRatio * 100)}%` }}
                          />
                        </div>
                        <span className="min-w-[60px] text-right font-mono text-xs font-semibold tabular-nums text-gnd-amber">
                          {formatEur(r.caPotentiel)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gnd-cream/40">
                        <span>Signé</span>
                        <span className={`font-mono tabular-nums ${r.caSigneCom > 0 ? 'text-gnd-amber-glow' : 'text-gnd-bronze-faded'}`}>{formatEur(r.caSigneCom)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CockpitPanel>
      </CockpitSection>

      <CockpitSection number="04" icon={<BarChart3 className="h-4 w-4" />} label="Distributions" accent="">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CockpitDistribution title="Classification" entries={byClassification} total={prospects.length} hudId="DST.01" />
          <CockpitDistribution title="Top secteurs" entries={bySector} total={prospects.length} limit={8} hudId="DST.02" />
          <CockpitDistribution title="Branche" entries={byBranche} total={prospects.length} hudId="DST.03" />
        </div>
      </CockpitSection>

      <CockpitSection number="05" icon={<Filter className="h-4 w-4" />} label="Répartition par" accent="statut">
        <CockpitPanel>
          <HudCornerLabel label="STA.001" />
          {byStatus.size === 0 ? (
            <p className="font-mono text-xs italic text-gnd-cream/60">Aucune donnée.</p>
          ) : (
            <ul className="relative z-10 flex flex-wrap gap-2">
              {[...byStatus.entries()].sort((a, b) => b[1] - a[1]).map(([status, n]) => (
                <li key={status} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 ring-gnd-amber/10 ${toneForStatus(status)}`}>
                  <span className="font-medium">{labelForStatus(status)}</span>
                  <span className="rounded-full bg-white/80 px-1.5 font-mono text-[10px] font-bold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </CockpitPanel>
      </CockpitSection>

      <CockpitSection number="06" icon={<Layers className="h-4 w-4" />} label="Pipeline" accent="global">
        <AdminProspectsPanel
          prospects={prospects}
          users={users.map((u) => ({ id: u.id, label: u.full_name ?? u.email }))}
        />
      </CockpitSection>

      <CockpitSection number="07" icon={<GraduationCap className="h-4 w-4" />} label="Suivi" accent="formation">
        <CockpitPanel padding="none" withScanLine>
          <HudCornerLabel label="FRM.001" />
          {sortedUsers.length === 0 ? (
            <p className="px-5 py-12 text-center font-display text-base text-gnd-cream/60">Aucun utilisateur pour le moment.</p>
          ) : (
            <ul className="relative z-10 divide-y divide-gnd-amber/10">
              {sortedUsers.map((u) => {
                const set = completedByUser.get(u.id) ?? new Set<string>();
                const count = MODULES.filter((m) => set.has(m.slug)).length;
                const last = lastByUser.get(u.id);
                const ratio = MODULES.length ? count / MODULES.length : 0;
                return (
                  <li key={u.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-gnd-amber/[0.03] sm:flex-row sm:items-center sm:px-7">
                    <div className="flex flex-1 items-center gap-3 sm:max-w-[35%]">
                      <CockpitAvatar name={u.full_name ?? u.email} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-display text-base font-medium text-gnd-cream">{u.full_name ?? '—'}</p>
                          {u.role !== 'freelance' && <RoleBadge role={u.role} size="xs" />}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-gnd-cream/50">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:max-w-[30%] sm:flex-1">
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full border border-gnd-amber/10 bg-gnd-ink/40">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow shadow-[0_0_4px_rgba(232,133,61,0.6)] transition-all duration-500"
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-gnd-amber">{count}/{MODULES.length}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {MODULES.map((m) => (
                        <span
                          key={m.slug}
                          title={m.title}
                          className={`h-3.5 w-3.5 rounded-sm transition-all ${
                            set.has(m.slug) ? 'bg-gradient-to-br from-gnd-amber to-gnd-amber-dim shadow-[0_0_4px_rgba(232,133,61,0.5)]' : 'bg-gnd-cream/15'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-cream/50">{last ? formatDate(last) : '—'}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </CockpitPanel>
      </CockpitSection>

      <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-bronze-soft">
        CA calculé à partir des fourchettes Notion (ca_estime) en prenant le midpoint.
      </p>
    </div>
  );
}

// =====================================================================
// Cockpit primitives — enriched with 21st.dev patterns
// =====================================================================

function CockpitPanel({
  children,
  className,
  padding = 'normal',
  withScanLine,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'normal' | 'none';
  withScanLine?: boolean;
}) {
  const padClass = padding === 'none' ? '' : 'p-6 sm:p-8';
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-gnd-amber/15 shadow-warm-xl ${padClass} ${className ?? ''}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 0%, rgba(232, 133, 61, 0.10) 0%, transparent 50%),
          radial-gradient(circle at 80% 100%, rgba(232, 133, 61, 0.06) 0%, transparent 50%),
          linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)
        `,
      }}
    >
      {withScanLine && <ScanLine />}
      {children}
    </section>
  );
}

function HudCornerLabel({ label }: { label: string }) {
  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
      <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden>
        <path d="M 1 9 L 1 1 L 9 1" fill="none" stroke="#E8853D" strokeWidth="1" opacity="0.6" />
      </svg>
      <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-gnd-amber/70">{label}</span>
    </div>
  );
}

function CockpitSection({
  number, icon, label, accent, hint, children,
}: {
  number: string; icon: React.ReactNode; label: string; accent: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative mb-10 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gnd-amber/30 bg-gnd-amber/10 text-gnd-amber">{icon}</span>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">{number} · {label}</p>
        </div>
        <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-gnd-bronze sm:text-3xl">
          {label} {accent && <span className="italic text-gnd-amber">{accent}</span>}
        </h2>
        {hint && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-bronze-soft">· {hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** KPI hero card avec AnimatedNumber + HudBlob + shine sweep */
function CockpitKpi({
  label, value, valueStr, sub, icon, accent, highlight,
}: {
  label: string;
  value?: number;
  valueStr?: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
  highlight?: boolean;
}) {
  const valueColor = highlight ? 'text-gnd-amber-glow' : accent ? 'text-gnd-amber' : 'text-gnd-cream';
  return (
    <div className="cockpit-shine group relative overflow-hidden rounded-2xl border border-gnd-amber/10 bg-gnd-ink/40 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-gnd-amber/30 hover:shadow-[0_16px_40px_-12px_rgba(232,133,61,0.35)]">
      <HudBlob position="top-right" size="sm" />
      <div className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-gnd-amber/10 text-gnd-amber">
        {icon}
      </div>
      <p className="relative z-10 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-gnd-amber">
        {label}
      </p>
      <p className={`relative z-10 mt-2 font-display text-2xl font-medium leading-none tracking-tight tabular-nums sm:text-3xl ${valueColor}`}>
        {value !== undefined ? <AnimatedNumber value={value} /> : valueStr}
      </p>
      {sub && (
        <p className="relative z-10 mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-cream/40">
          {sub}
        </p>
      )}
    </div>
  );
}

function CockpitMiniKpi({
  label, value, suffix, icon,
}: { label: string; value: number; suffix?: string; icon: React.ReactNode }) {
  return (
    <div className="cockpit-shine group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-gnd-amber/10 bg-gnd-ink/40 px-4 py-3 backdrop-blur-sm transition-all hover:border-gnd-amber/30">
      <div className="relative z-10">
        <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-gnd-cream/60">{label}</p>
        <p className="mt-0.5 font-display text-lg font-medium tabular-nums text-gnd-cream">
          <AnimatedNumber value={value} />
          {suffix}
        </p>
      </div>
      <span className="relative z-10 text-gnd-amber">{icon}</span>
    </div>
  );
}

function KpiTriple({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gnd-cream/50">{label}</p>
      <p className={`font-display text-lg font-medium tabular-nums ${accent ? 'text-gnd-amber' : 'text-gnd-cream'}`}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function KpiTripleStr({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-gnd-cream/50">{label}</p>
      <p className={`font-display text-lg font-medium tabular-nums ${accent ? 'text-gnd-amber' : 'text-gnd-cream'}`}>
        {value}
      </p>
    </div>
  );
}

function CockpitRankBadge({ index }: { index: number }) {
  if (index === 0) return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gnd-amber/40 bg-gnd-amber/15 text-gnd-amber shadow-[0_0_12px_rgba(232,133,61,0.4)]" title="1er"><Trophy className="h-3.5 w-3.5" /></span>;
  if (index <= 2) return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gnd-cream/20 bg-gnd-cream/10 text-gnd-cream" title={`${index + 1}e`}><Medal className="h-3.5 w-3.5" /></span>;
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gnd-cream/15 bg-gnd-ink/40 font-mono text-xs font-bold tabular-nums text-gnd-cream/70">{index + 1}</span>;
}

function CockpitStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-gnd-cream/50">{label}</span>
      <span className={`font-mono text-sm font-bold tabular-nums ${highlight ? 'text-gnd-amber-glow' : 'text-gnd-cream'}`}>{value}</span>
    </div>
  );
}

function CockpitAvatar({ name }: { name: string }) {
  const palette = ['from-gnd-amber to-gnd-amber-dim', 'from-gnd-bronze to-gnd-ink', 'from-gnd-amber-glow to-gnd-amber', 'from-gnd-bronze-soft to-gnd-bronze', 'from-gnd-clay to-gnd-amber-dim'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const grad = palette[Math.abs(hash) % palette.length];
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
  return <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-xs font-medium text-gnd-cream shadow-warm ring-2 ring-gnd-bronze/40 ${grad}`}>{ini}</div>;
}

function MiniGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full border border-gnd-amber/10 bg-gnd-ink/40">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gnd-bronze-soft via-gnd-amber to-gnd-amber-glow shadow-[0_0_4px_rgba(232,133,61,0.6)] transition-all duration-700" style={{ width: `${Math.max(2, v)}%` }} />
      </div>
      <span className="font-mono text-[9px] font-semibold tabular-nums text-gnd-amber">{Math.round(v)}%</span>
    </div>
  );
}

function CockpitDistribution({ title, entries, total, limit, hudId }: { title: string; entries: Map<string, number>; total: number; limit?: number; hudId: string }) {
  const sorted = [...entries.entries()].sort((a, b) => b[1] - a[1]);
  const display = limit ? sorted.slice(0, limit) : sorted;
  const max = Math.max(1, ...display.map(([, n]) => n));
  return (
    <div
      className="cockpit-shine relative overflow-hidden rounded-3xl border border-gnd-amber/15 p-5 shadow-warm-xl"
      style={{
        backgroundImage: `
          radial-gradient(circle at 30% 0%, rgba(232, 133, 61, 0.08) 0%, transparent 60%),
          linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)
        `,
      }}
    >
      <ScanLine duration={6} delay={1.2} />
      <HudCornerLabel label={hudId} />
      <h3 className="relative z-10 mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">{title}</h3>
      {display.length === 0 ? (
        <p className="font-mono text-xs italic text-gnd-cream/50">Aucune donnée.</p>
      ) : (
        <ul className="relative z-10 space-y-3">
          {display.map(([key, n]) => {
            const ratio = n / max;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <li key={key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate rounded-full border border-gnd-amber/15 bg-gnd-amber/10 px-2 py-0.5 text-[11px] font-medium text-gnd-amber-glow" title={key}>{key}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-gnd-cream">
                    <span className="font-bold">{n}</span>
                    {total > 0 && <span className="ml-1 text-gnd-cream/40">({pct}%)</span>}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full border border-gnd-amber/10 bg-gnd-ink/40">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gnd-amber-dim via-gnd-amber to-gnd-amber-glow shadow-[0_0_4px_rgba(232,133,61,0.6)] transition-all duration-700" style={{ width: `${Math.max(4, ratio * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
