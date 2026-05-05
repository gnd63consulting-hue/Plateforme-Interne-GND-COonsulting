import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';
import { sumCaMidpointEur } from '@/lib/ca-utils';
import AdminV2Client from './AdminV2Client';

export const dynamic = 'force-dynamic';

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  commission_rate?: number | null;
  active?: boolean | null;
};

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);
const FREELANCE_ROLES = new Set(['freelance', 'commercial']);

/** Mapping signatures -> palier (1=Bronze, 2=Argent, 3=Or, 4=Platine, 5=Stratosphère). */
function signaturesToPalier(signatures: number): number {
  if (signatures >= 12) return 5;
  if (signatures >= 8) return 4;
  if (signatures >= 5) return 3;
  if (signatures >= 3) return 2;
  if (signatures >= 1) return 1;
  return 0;
}

/** Initiales 2 lettres à partir d'un nom complet ou email. */
function initialsOf(name: string | null, email: string): string {
  const base = (name && name.trim()) || email.split('@')[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0][0] + (parts[0][1] ?? '')).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type CommercialStats = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role_label: string;
  total: number;
  chauds: number;
  rdv: number;
  signatures: number;
  conversion: number;
  palier: number;
  ca_signe: number;
};

export type AdminV2Data = {
  prospects: Prospect[];
  commerciaux: CommercialStats[];
  commercialOptions: { id: string; label: string; initials: string }[];
  kpi: {
    live: number;
    chauds: number;
    signatures_mois: number;
    ca_signe: number;
    ca_potentiel: number;
  };
  current_admin: { id: string; name: string };
};

export default async function AdminV2Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const [{ data: usersRaw }, { data: prospectsRaw }] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role, active'),
    supabase
      .from('prospects')
      .select(PROSPECT_SELECT_COLUMNS)
      .order('updated_at', { ascending: false }),
  ]);

  const users = (usersRaw ?? []) as AdminUser[];
  const prospects = (prospectsRaw ?? []) as unknown as Prospect[];

  const freelances = users
    .filter((u) => FREELANCE_ROLES.has(u.role))
    .sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
    );

  // Compute stats per commercial
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const commerciaux: CommercialStats[] = freelances.map((c) => {
    const own = prospects.filter((p) => p.assigned_to === c.id);
    const ownActive = own.filter((p) => p.status !== 'archived');
    const chauds = own.filter(
      (p) => p.classification === '🔥 Chaud' && p.status !== 'archived'
    ).length;
    const rdv = own.filter((p) => p.status === 'rdv_pris').length;
    const signed = own.filter((p) => p.status === 'gagne');
    const total = ownActive.length;
    const conversion =
      total > 0 ? Math.round((signed.length / total) * 100) : 0;

    return {
      id: c.id,
      name: c.full_name ?? c.email.split('@')[0],
      initials: initialsOf(c.full_name, c.email),
      email: c.email,
      role_label: 'COMMERCIAL · BRANCHE A',
      total,
      chauds,
      rdv,
      signatures: signed.length,
      conversion,
      palier: signaturesToPalier(signed.length),
      ca_signe: sumCaMidpointEur(signed),
    };
  });

  const allActive = prospects.filter((p) => p.status !== 'archived');
  const allChauds = allActive.filter((p) => p.classification === '🔥 Chaud');
  const allSigned = prospects.filter((p) => p.status === 'gagne');
  const signedThisMonth = allSigned.filter((p) => {
    const d = p.updated_at ? new Date(p.updated_at) : null;
    return d ? d >= startOfMonth : false;
  });

  const data: AdminV2Data = {
    prospects,
    commerciaux,
    commercialOptions: freelances.map((c) => ({
      id: c.id,
      label: c.full_name ?? c.email,
      initials: initialsOf(c.full_name, c.email),
    })),
    kpi: {
      live: allActive.length,
      chauds: allChauds.length,
      signatures_mois: signedThisMonth.length,
      ca_signe: sumCaMidpointEur(allSigned),
      ca_potentiel: sumCaMidpointEur(allActive),
    },
    current_admin: {
      id: me.id,
      name: me.full_name ?? me.email.split('@')[0],
    },
  };

  return <AdminV2Client data={data} />;
}
