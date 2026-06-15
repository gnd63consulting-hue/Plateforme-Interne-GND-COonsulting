import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  COMMISSION_SELECT_COLUMNS,
  formatEurExact,
  labelForCommissionStatut,
  type Commission,
} from '@/lib/finance';
import CommissionRow from './CommissionRow';

export const dynamic = 'force-dynamic';

const CREAM = '#FDF6EE';
const CREAM_SOFT = 'rgba(253,246,238,0.6)';
const CREAM_FAINT = 'rgba(253,246,238,0.4)';
const AMBER = '#E8853D';
const GREEN = '#7FC9A3';
const CARD_BG = 'rgba(253,246,238,0.04)';
const BORDER = '1px solid rgba(232,133,61,0.14)';
const SERIF = 'var(--font-fraunces), Georgia, serif';
const MONO = 'var(--font-geist-mono), ui-monospace, monospace';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type CommercialGroup = {
  id: string;
  name: string;
  rows: (Commission & { company: string | null })[];
  totalAPayer: number;
  totalPaye: number;
};

export default async function CommissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  // Admin RLS (commissions_admin_all) : on voit toutes les commissions.
  const { data: commissionsRaw } = await supabase
    .from('commissions')
    .select(COMMISSION_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  const commissions = (commissionsRaw ?? []) as unknown as Commission[];

  // Résolution des noms (commercial + société prospect) en parallèle.
  const userIds = [...new Set(commissions.map((c) => c.commercial_id))];
  const prospectIds = [
    ...new Set(commissions.map((c) => c.prospect_id).filter(Boolean)),
  ] as string[];

  const usersRes =
    userIds.length > 0
      ? await supabase.from('users').select('id, full_name, email').in('id', userIds)
      : { data: null };
  const prospectsRes =
    prospectIds.length > 0
      ? await supabase.from('prospects').select('id, company_name').in('id', prospectIds)
      : { data: null };

  const userName = new Map<string, string>();
  for (const u of (usersRes.data ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
  }[]) {
    userName.set(u.id, u.full_name ?? u.email.split('@')[0]);
  }
  const companyById = new Map<string, string>();
  for (const p of (prospectsRes.data ?? []) as { id: string; company_name: string }[]) {
    companyById.set(p.id, p.company_name);
  }

  // Groupement par commercial + totaux.
  const groupsMap = new Map<string, CommercialGroup>();
  let globalAPayer = 0;
  let globalPaye = 0;
  for (const c of commissions) {
    const id = c.commercial_id;
    if (!groupsMap.has(id)) {
      groupsMap.set(id, {
        id,
        name: userName.get(id) ?? '—',
        rows: [],
        totalAPayer: 0,
        totalPaye: 0,
      });
    }
    const g = groupsMap.get(id)!;
    g.rows.push({ ...c, company: c.prospect_id ? companyById.get(c.prospect_id) ?? null : null });
    if (c.statut === 'a_payer') {
      g.totalAPayer += Number(c.amount);
      globalAPayer += Number(c.amount);
    } else if (c.statut === 'paye') {
      g.totalPaye += Number(c.amount);
      globalPaye += Number(c.amount);
    }
  }
  const groups = [...groupsMap.values()].sort(
    (a, b) => b.totalAPayer - a.totalAPayer
  );

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: CREAM }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: AMBER, marginBottom: 10 }}>
          ADMIN · FINANCE
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: CREAM, margin: 0, lineHeight: 1.1 }}>
          Commissions
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: CREAM_SOFT, marginTop: 12, maxWidth: 640 }}>
          Commission RÉELLE générée à chaque contrat signé (montant HT × taux du commercial figé au moment du gain).
          Marque « payé » quand le règlement est effectué.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <Stat label="À payer (total)" value={formatEurExact(globalAPayer)} color={AMBER} />
        <Stat label="Déjà payé (total)" value={formatEurExact(globalPaye)} color={GREEN} />
        <Stat label="Commissions" value={String(commissions.length)} color={CREAM} />
      </div>

      {groups.length === 0 ? (
        <p style={{ fontSize: 14, color: CREAM_SOFT }}>
          Aucune commission pour l&apos;instant. Dès qu&apos;un prospect passe en « Devis signé » avec un montant, la commission apparaît ici.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.id} style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, margin: '0 0 14px' }}>
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: CREAM }}>
                {g.name}
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: MONO, fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: AMBER }}>
                  À payer : {formatEurExact(g.totalAPayer)}
                </span>
                <span style={{ color: GREEN }}>
                  Payé : {formatEurExact(g.totalPaye)}
                </span>
              </div>
            </div>

            <div style={{ background: CARD_BG, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Date', 'Prospect', 'Base HT', 'Taux', 'Commission', 'Statut', ''].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: CREAM_FAINT, borderBottom: '1px solid rgba(232,133,61,0.12)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((c) => (
                    <CommissionRow
                      key={c.id}
                      id={c.id}
                      dateLabel={new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      company={c.company}
                      baseLabel={formatEurExact(Number(c.base_amount))}
                      rateLabel={`${Math.round(Number(c.rate) * 100)}%`}
                      amountLabel={formatEurExact(Number(c.amount))}
                      statut={c.statut}
                      statutLabel={labelForCommissionStatut(c.statut)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 170, background: CARD_BG, border: BORDER, borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: CREAM_FAINT, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
