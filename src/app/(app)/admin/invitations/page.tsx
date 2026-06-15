import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { InviteForm } from './InviteForm';
import { revokeInvitation, reactivateMemberAction } from './actions';
import { MemberManager, type Member } from './MemberManager';
import { sanitizePerms } from '@/lib/permissions';

// Design System crème/orange — texte FONCÉ sur fond clair (AA).
const CREAM = '#2A2320';
const CREAM_SOFT = '#7B665C';
const AMBER = '#B5601C';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-monospace, monospace';

export default async function InvitationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'admin_limited'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .order('invited_at', { ascending: false })
    .limit(50);

  const pending = (invitations ?? []).filter((i) => !i.consumed_at);
  const consumed = (invitations ?? []).filter((i) => i.consumed_at);

  // Membres actifs + nb de prospects assignes
  const { data: membersRaw } = await supabase
    .from('users')
    .select('id, full_name, email, role, commission_rate, active, permissions')
    .in('role', ['admin', 'admin_limited', 'freelance', 'commercial'])
    .order('created_at', { ascending: true });

  const allMembers = (membersRaw ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    commission_rate: number | null;
    active: boolean | null;
    permissions: unknown;
  }[];
  const activeMembers = allMembers.filter((u) => u.active !== false);
  const archivedMembers = allMembers.filter((u) => u.active === false);

  const memberIds = activeMembers.map((u) => u.id);
  const { data: assignedRows } = await supabase
    .from('prospects')
    .select('assigned_to')
    .in('assigned_to', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);

  const countByUser = new Map<string, number>();
  for (const r of (assignedRows ?? []) as { assigned_to: string | null }[]) {
    if (r.assigned_to) countByUser.set(r.assigned_to, (countByUser.get(r.assigned_to) ?? 0) + 1);
  }

  const members: Member[] = activeMembers.map((u) => ({
    id: u.id,
    name: u.full_name ?? u.email.split('@')[0],
    email: u.email,
    role: u.role,
    commissionPct: u.commission_rate != null ? Math.round(Number(u.commission_rate) * 100) : null,
    prospectCount: countByUser.get(u.id) ?? 0,
    permissions: sanitizePerms(u.permissions),
  }));

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 28px 64px', color: CREAM }}>
      {/* Header */}
      <header style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: AMBER,
            marginBottom: 10,
          }}
        >
          ADMIN · ÉQUIPE
        </div>
        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: '#532418',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Équipe &amp; invitations
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: CREAM_SOFT, marginTop: 12, maxWidth: 560 }}>
          Gère tes membres (rôle, autorisations, commission, prospects) et invite de nouvelles personnes.
          Login Google uniquement — tu ajoutes un email, la personne se connecte.
        </p>
      </header>

      {/* Membres actifs */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: AMBER, margin: '0 0 16px' }}>
          Membres actifs ({members.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map((m) => (
            <MemberManager key={m.id} member={m} />
          ))}
        </div>
        <p style={{ fontSize: 12, color: CREAM_SOFT, marginTop: 12 }}>
          Rôle = préréglage ; affine ensuite section par section (Voir / Éditer / Aucun).
          L&apos;assignation de prospects pioche uniquement dans le pool « à contacter ».
        </p>
      </section>

      {/* Membres archivés (réversible) */}
      {archivedMembers.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9A8A80', margin: '0 0 16px' }}>
            Membres archivés ({archivedMembers.length})
          </h2>
          <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 16, overflow: 'hidden' }}>
            {archivedMembers.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(83,36,24,0.06)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: CREAM }}>
                    {u.full_name ?? u.email.split('@')[0]}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: CREAM_SOFT }}>{u.email}</div>
                </div>
                <form action={reactivateMemberAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(79,122,56,0.40)', background: 'transparent', color: '#4F7A38', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Réactiver
                  </button>
                </form>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: CREAM_SOFT, marginTop: 12 }}>
            Comptes masqués partout (suivi, digest, listes). Historique (commissions, audit) préservé. Réactivables à tout moment.
          </p>
        </section>
      )}

      {/* Invite form card */}
      <section
        style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 18,
          padding: 28,
          marginBottom: 36,
        }}
      >
        <h2 style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, color: '#532418', margin: '0 0 18px' }}>
          Inviter quelqu&apos;un
        </h2>
        <InviteForm />
      </section>

      {/* Pending */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: AMBER,
            margin: '0 0 16px',
          }}
        >
          Invitations en attente ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p style={{ fontSize: 13, color: CREAM_SOFT }}>Aucune invitation en attente.</p>
        ) : (
          <div
            style={{
              background: CARD_BG,
              border: CARD_BORDER,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Email', 'Rôle', 'Envoyée le', 'Expire le', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        fontFamily: MONO,
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.16em',
                        color: '#9A8A80',
                        borderBottom: '1px solid #E2D5C3',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(83,36,24,0.06)' }}>
                    <td style={{ padding: '13px 16px', color: CREAM, fontFamily: MONO, fontSize: 12 }}>
                      {inv.email}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'rgba(243,146,83,0.14)',
                          border: '1px solid rgba(243,146,83,0.30)',
                          color: AMBER,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {inv.role}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', color: CREAM_SOFT }}>
                      {new Date(inv.invited_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '13px 16px', color: CREAM_SOFT }}>
                      {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button
                          type="submit"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#A04A4A',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: 3,
                          }}
                        >
                          Révoquer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consumed */}
      <section>
        <h2
          style={{
            fontFamily: MONO,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#9A8A80',
            margin: '0 0 16px',
          }}
        >
          Membres déjà entrés ({consumed.length})
        </h2>
        {consumed.length === 0 ? (
          <p style={{ fontSize: 13, color: CREAM_SOFT }}>Aucun.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {consumed.slice(0, 20).map((inv) => (
              <li
                key={inv.id}
                style={{
                  fontSize: 13,
                  color: CREAM_SOFT,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 12, color: CREAM }}>{inv.email}</span>
                <span style={{ color: '#B8A99C' }}>·</span>
                <span>{inv.role}</span>
                <span style={{ color: '#B8A99C' }}>·</span>
                <span>
                  entré le{' '}
                  {inv.consumed_at ? new Date(inv.consumed_at).toLocaleDateString('fr-FR') : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
