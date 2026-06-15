import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { labelForStatus } from '@/lib/prospects';

export const dynamic = 'force-dynamic';

// Design System crème/orange — texte FONCÉ sur fond clair (contraste AA).
const CREAM = '#2A2320';        // texte principal
const CREAM_SOFT = '#7B665C';   // texte secondaire
const CREAM_FAINT = '#9A8A80';  // texte tertiaire
const AMBER = '#B5601C';        // accent orange foncé (AA)
const RED = '#A04A4A';
const GREEN = '#4F7A38';
const CARD_BG = '#FFFFFF';      // cartes blanches
const BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-monospace, monospace';
const SANS = 'var(--font-inter), system-ui, sans-serif';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

type Row = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  status: string;
  next_action_at: string;
  assigned_to: string | null;
};

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default async function RelancesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  const [{ data: prospectsRaw }, { data: usersRaw }] = await Promise.all([
    supabase
      .from('prospects')
      .select('id, company_name, contact_name, phone, status, next_action_at, assigned_to')
      .not('next_action_at', 'is', null)
      .order('next_action_at', { ascending: true }),
    supabase.from('users').select('id, full_name, email'),
  ]);

  const rows = (prospectsRaw ?? []) as Row[];
  const userName = new Map<string, string>();
  for (const u of (usersRaw ?? []) as { id: string; full_name: string | null; email: string }[]) {
    userName.set(u.id, u.full_name ?? u.email.split('@')[0]);
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const overdue: Row[] = [];
  const today: Row[] = [];
  const upcoming: Row[] = [];
  for (const r of rows) {
    const d = new Date(r.next_action_at);
    if (d < startToday) overdue.push(r);
    else if (d < endToday) today.push(r);
    else upcoming.push(r);
  }

  const perCommercial = new Map<string, number>();
  for (const r of rows) {
    const name = r.assigned_to ? userName.get(r.assigned_to) ?? '—' : 'Non assigné';
    perCommercial.set(name, (perCommercial.get(name) ?? 0) + 1);
  }
  const recap = [...perCommercial.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: CREAM }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: AMBER, marginBottom: 10 }}>
          ADMIN · PILOTAGE
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: '#532418', margin: 0, lineHeight: 1.1 }}>
          Relances à venir
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: CREAM_SOFT, marginTop: 12, maxWidth: 620 }}>
          Qui doit rappeler quel prospect et quand — posé par les commerciaux sur leurs fiches.
          Les retards sont en rouge. Lecture seule, en temps réel à chaque ouverture.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <Stat label="En retard" value={overdue.length} color={RED} />
        <Stat label="Aujourd'hui" value={today.length} color={AMBER} />
        <Stat label="À venir" value={upcoming.length} color={GREEN} />
        <Stat label="Total relances" value={rows.length} color={CREAM} />
      </div>

      {recap.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionLabel>Par commercial</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recap.map(([name, n]) => (
              <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CARD_BG, border: BORDER, borderRadius: 999, padding: '6px 14px', fontSize: 13, color: CREAM }}>
                {name}
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: AMBER }}>{n}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: CREAM_SOFT }}>
          Aucune relance planifiée pour l&apos;instant. Les dates posées par les commerciaux apparaîtront ici.
        </p>
      ) : (
        <>
          <Group title="En retard" rows={overdue} color={RED} userName={userName} emptyText="Aucun retard. 👌" />
          <Group title="Aujourd'hui" rows={today} color={AMBER} userName={userName} emptyText="Rien à rappeler aujourd'hui." />
          <Group title="À venir" rows={upcoming} color={GREEN} userName={userName} emptyText="Rien de planifié à venir." />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: CARD_BG, border: BORDER, borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: CREAM_FAINT, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: AMBER, margin: '0 0 14px' }}>
      {children}
    </div>
  );
}

function Group({ title, rows, color, userName, emptyText }: { title: string; rows: Row[]; color: string; userName: Map<string, string>; emptyText: string }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <SectionLabel>
        <span style={{ color }}>● </span>
        {title} ({rows.length})
      </SectionLabel>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: CREAM_FAINT }}>{emptyText}</p>
      ) : (
        <div style={{ background: CARD_BG, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Date', 'Commercial', 'Prospect', 'Contact', 'Statut'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: CREAM_FAINT, borderBottom: '1px solid #E2D5C3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name = r.assigned_to ? userName.get(r.assigned_to) ?? '—' : 'Non assigné';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(83,36,24,0.07)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {fmt(new Date(r.next_action_at))}
                    </td>
                    <td style={{ padding: '12px 16px', color: CREAM }}>{name}</td>
                    <td style={{ padding: '12px 16px', color: CREAM, fontFamily: SANS }}>{r.company_name}</td>
                    <td style={{ padding: '12px 16px', color: CREAM_SOFT }}>
                      {r.contact_name ?? '—'}
                      {r.phone && <span style={{ display: 'block', fontFamily: MONO, fontSize: 11, color: AMBER }}>{r.phone}</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: CREAM_SOFT }}>
                        {labelForStatus(r.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
