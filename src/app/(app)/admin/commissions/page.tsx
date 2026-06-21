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

// Design System crème/orange — tokens locaux (suite admin claire).
const INK = '#2A2320';           // texte corps (ex CREAM)
const INK_SOFT = '#7B665C';      // texte secondaire (ex CREAM_SOFT)
const INK_FAINT = '#9B8A7E';     // texte tertiaire (ex CREAM_FAINT)
const CHOCO = '#532418';         // titres serif
const AMBER = '#B5601C';         // accent texte lisible sur clair (ex AMBER)
const GREEN = '#4F7A38';         // vert lisible sur clair (ex GREEN)
const CARD_BG = 'linear-gradient(180deg, #FFFFFF 0%, #FDFAF6 100%)';       // cartes (ex CARD_BG)
const BRAND = '#F39253';
const BORDER = '1px solid rgba(74,36,26,0.10)';
const HAIRLINE = '1px solid rgba(74,36,26,0.10)';
const CARD_SHADOW = '0 1px 2px rgba(83,36,24,0.04), 0 8px 24px -16px rgba(83,36,24,0.18)';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';

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
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: INK, position: 'relative' }}>
      <header style={{ marginBottom: 28, position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -28,
            right: -8,
            fontFamily: SERIF,
            fontSize: 116,
            lineHeight: 1,
            fontWeight: 500,
            color: 'rgba(243,146,83,0.06)',
            letterSpacing: '-0.02em',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          Finance
        </div>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: AMBER, marginBottom: 10 }}>
          <span style={{ width: 18, height: 1.5, background: BRAND, borderRadius: 999 }} />
          ADMIN · FINANCE
        </div>
        <h1 style={{ position: 'relative', fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: CHOCO, margin: 0, lineHeight: 1.1 }}>
          Commissions
        </h1>
        <p style={{ position: 'relative', fontSize: 14, lineHeight: 1.55, color: INK_SOFT, marginTop: 12, maxWidth: 640 }}>
          Commission RÉELLE générée à chaque contrat signé (montant HT × taux du commercial figé au moment du gain).
          Marque « payé » quand le règlement est effectué.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <Stat label="À payer (total)" value={formatEurExact(globalAPayer)} color={AMBER} />
        <Stat label="Déjà payé (total)" value={formatEurExact(globalPaye)} color={GREEN} />
        <Stat label="Commissions" value={String(commissions.length)} color={CHOCO} />
      </div>

      {groups.length === 0 ? (
        <div style={{ background: 'linear-gradient(180deg, rgba(243,146,83,0.05) 0%, rgba(253,250,246,0.6) 100%)', border: HAIRLINE, borderRadius: 24, padding: '36px 28px', textAlign: 'center', boxShadow: CARD_SHADOW }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 18, background: 'rgba(243,146,83,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: AMBER, fontFamily: SERIF, fontSize: 24 }}>
            ✦
          </div>
          <p style={{ fontSize: 14, color: INK_SOFT, margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Aucune commission pour l&apos;instant. Dès qu&apos;un prospect passe en « Devis signé » avec un montant, la commission apparaît ici.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.id} style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, margin: '0 0 14px' }}>
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: CHOCO, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, height: 1.5, background: BRAND, borderRadius: 999 }} />
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

            <div style={{ background: CARD_BG, border: BORDER, borderRadius: 24, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(243,146,83,0.05)' }}>
                    {['Date', 'Prospect', 'Base HT', 'Taux', 'Commission', 'Statut', ''].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_FAINT, borderBottom: HAIRLINE }}>{h}</th>
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
    <div style={{ flex: 1, minWidth: 170, position: 'relative', background: CARD_BG, border: BORDER, borderRadius: 24, padding: '20px 22px', boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, width: 36, height: 3, background: color, borderRadius: 999, opacity: 0.5 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 16, height: 1.5, background: '#F39253', borderRadius: 999 }} />
        <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: INK_FAINT }}>{label}</div>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
