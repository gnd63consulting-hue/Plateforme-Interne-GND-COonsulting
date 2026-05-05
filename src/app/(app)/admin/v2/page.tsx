import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';
import { sumCaMidpointEur } from '@/lib/ca-utils';
import { MODULES } from '@/lib/modules-registry';
import AdminV2Client from './AdminV2Client';

export const dynamic = 'force-dynamic';

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active?: boolean | null;
};

type Progression = {
  user_id: string;
  module_slug: string;
  completed: boolean;
  completed_at: string | null;
  best_percentage: number | null;
};

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);
const FREELANCE_ROLES = new Set(['freelance', 'commercial']);

function signaturesToPalier(signatures: number): number {
  if (signatures >= 12) return 5;
  if (signatures >= 8) return 4;
  if (signatures >= 5) return 3;
  if (signatures >= 3) return 2;
  if (signatures >= 1) return 1;
  return 0;
}

function initialsOf(name: string | null, email: string): string {
  const base = (name && name.trim()) || email.split('@')[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0][0] + (parts[0][1] ?? '')).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type CommercialV2 = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  conversion: number;
  palier: number;
  total: number;
  chauds: number;
  signatures: number;
  ca_potentiel: number;
};

export type FunnelStage = { status: string; label: string; count: number; convPct: string | null };
export type ClassementEntry = { id: string; name: string; initials: string; rank: number; ca: number; pct: number; prospects: number };
export type ActivityEntry = { date: string; type: string; company: string; detail: string; user: string; userInitials: string };
export type FormationEntry = { userId: string; name: string; initials: string; isAdmin: boolean; progress: number[]; completed: number; total: number; lastActivity: string | null };

export type AdminV2PageData = {
  adminName: string;
  prospects: Prospect[];
  commerciaux: CommercialV2[];
  kpi: { live: number; chauds: number; signatures: number; ca: number };
  funnel: FunnelStage[];
  classement: ClassementEntry[];
  activity: ActivityEntry[];
  formation: FormationEntry[];
};

export default async function AdminV2Page() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const [{ data: usersRaw }, { data: prospectsRaw }, { data: progRaw }] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role, active'),
    supabase
      .from('prospects')
      .select(PROSPECT_SELECT_COLUMNS)
      .order('updated_at', { ascending: false }),
    supabase.from('progressions').select('user_id, module_slug, completed, completed_at, best_percentage'),
  ]);

  const users = (usersRaw ?? []) as AdminUser[];
  const prospects = (prospectsRaw ?? []) as unknown as Prospect[];
  const progressions = (progRaw ?? []) as Progression[];

  const freelances = users
    .filter((u) => FREELANCE_ROLES.has(u.role))
    .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));

  const commerciaux: CommercialV2[] = freelances.map((c) => {
    const own = prospects.filter((p) => p.assigned_to === c.id);
    const ownActive = own.filter((p) => p.status !== 'archived');
    const chauds = own.filter((p) => p.classification === '🔥 Chaud' && p.status !== 'archived').length;
    const signed = own.filter((p) => p.status === 'gagne');
    const total = ownActive.length;
    const conversion = total > 0 ? Math.round((signed.length / total) * 100) : 0;
    const ca_potentiel = sumCaMidpointEur(
      own.filter((p) => ['a_contacter', 'contacte', 'rdv_pris', 'devis_envoye', 'gagne'].includes(p.status))
    );
    return {
      id: c.id,
      name: c.full_name ?? c.email.split('@')[0],
      initials: initialsOf(c.full_name, c.email),
      email: c.email,
      role: 'COMMERCIAL · BRANCHE A',
      conversion,
      palier: signaturesToPalier(signed.length),
      total,
      chauds,
      signatures: signed.length,
      ca_potentiel,
    };
  });

  const allActive = prospects.filter((p) => p.status !== 'archived');
  const allChauds = allActive.filter((p) => p.classification === '🔥 Chaud');
  const allSigned = prospects.filter((p) => p.status === 'gagne');
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
  const signedThisMonth = allSigned.filter((p) => p.updated_at && new Date(p.updated_at) >= startOfMonth);

  const funnelDef: { key: string; label: string }[] = [
    { key: 'a_contacter', label: 'À contacter' },
    { key: 'contacte', label: 'Contacté' },
    { key: 'rdv_pris', label: 'RDV pris' },
    { key: 'devis_envoye', label: 'Devis envoyé' },
    { key: 'gagne', label: 'Devis signé' },
  ];
  const funnelCounts = funnelDef.map(s => prospects.filter(p => p.status === s.key).length);
  const funnel: FunnelStage[] = funnelDef.map((s, i) => ({
    status: s.key,
    label: s.label,
    count: funnelCounts[i],
    convPct: i === 0 ? null : (funnelCounts[i-1] > 0 ? `${Math.round((funnelCounts[i] / funnelCounts[i-1]) * 100)}%` : '~'),
  }));

  const classementSorted = [...commerciaux].sort((a, b) => b.ca_potentiel - a.ca_potentiel);
  const maxCA = Math.max(1, ...classementSorted.map(c => c.ca_potentiel));
  const classement: ClassementEntry[] = classementSorted.slice(0, 4).map((c, i) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    rank: i + 1,
    ca: Math.round(c.ca_potentiel / 1000),
    pct: Math.round((c.ca_potentiel / maxCA) * 100),
    prospects: c.total,
  }));

  const typeMap: Record<string, string> = {
    rdv_pris: 'STATUT CHANGED',
    devis_envoye: 'DEVIS SENT',
    gagne: 'STATUT CHANGED',
    contacte: 'STATUT CHANGED',
    a_contacter: 'NOTE ADDED',
    archived: 'STATUT CHANGED',
    perdu: 'STATUT CHANGED',
  };
  const detailMap: Record<string, string> = {
    rdv_pris: '→ RDV pris',
    devis_envoye: 'Devis envoyé',
    gagne: '→ Devis signé',
    contacte: '→ Contacté',
    a_contacter: 'Relance planifiée',
    archived: '→ Archivé',
    perdu: '→ Perdu',
  };
  const activity: ActivityEntry[] = prospects
    .filter(p => p.updated_at)
    .slice(0, 8)
    .map(p => {
      const d = new Date(p.updated_at!);
      const dd = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const com = freelances.find(u => u.id === p.assigned_to);
      return {
        date: dd,
        type: typeMap[p.status] ?? 'PROSPECT UPDATED',
        company: p.company_name,
        detail: detailMap[p.status] ?? '',
        user: com?.id ?? 'system',
        userInitials: com ? initialsOf(com.full_name, com.email)[0] : '⋄',
      };
    });

  // Formation : branché sur la table progressions Supabase
  const moduleSlugByOrder = MODULES.reduce<Record<number, string>>((acc, m) => {
    acc[m.order] = m.slug;
    return acc;
  }, {});
  const TOTAL_MODULES = MODULES.length;

  const buildFormationEntry = (u: AdminUser, isAdmin: boolean): FormationEntry => {
    const userProgs = progressions.filter(p => p.user_id === u.id);
    const completedSlugs = new Set(userProgs.filter(p => p.completed).map(p => p.module_slug));
    const progress: number[] = [];
    for (let i = 1; i <= TOTAL_MODULES; i++) {
      const slug = moduleSlugByOrder[i];
      progress.push(completedSlugs.has(slug) ? 1 : 0);
    }
    const completed = progress.reduce((s, v) => s + v, 0);
    const lastActivityIso = userProgs
      .filter(p => p.completed_at)
      .map(p => new Date(p.completed_at!).getTime())
      .reduce((max, t) => Math.max(max, t), 0);
    const lastActivity = lastActivityIso > 0
      ? (() => {
          const d = new Date(lastActivityIso);
          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`;
        })()
      : null;
    return {
      userId: u.id,
      name: u.full_name ?? u.email.split('@')[0],
      initials: initialsOf(u.full_name, u.email),
      isAdmin,
      progress,
      completed,
      total: TOTAL_MODULES,
      lastActivity,
    };
  };

  const adminUsers = users.filter(u => ADMIN_ROLES.has(u.role));
  const formation: FormationEntry[] = [
    ...adminUsers.map(u => buildFormationEntry(u, true)),
    ...freelances.map(u => buildFormationEntry(u, false)),
  ];

  const data: AdminV2PageData = {
    adminName: (me.full_name ?? me.email.split('@')[0]).split(/[\s.]+/)[0],
    prospects,
    commerciaux,
    kpi: {
      live: allActive.length,
      chauds: allChauds.length,
      signatures: signedThisMonth.length,
      ca: sumCaMidpointEur(allSigned),
    },
    funnel,
    classement,
    activity,
    formation,
  };

  return <AdminV2Client data={data} />;
}
