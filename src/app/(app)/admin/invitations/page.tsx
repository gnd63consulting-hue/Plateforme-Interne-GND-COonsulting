import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { InviteForm } from './InviteForm';
import { revokeInvitation, reactivateMemberAction } from './actions';
import { MemberManager, type Member } from './MemberManager';
import { sanitizePerms } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Design System crème/orange — texte FONCÉ sur fond clair (AA).
const CREAM = '#2A2320';
const CREAM_SOFT = '#7B665C';
const AMBER = '#B5601C';
const BRAND = '#F39253';
const CARD_BG = 'linear-gradient(180deg, #FFFFFF 0%, #FDFAF6 100%)';
const CARD_BORDER = '1px solid rgba(74,36,26,0.10)';
const HAIRLINE = '1px solid rgba(74,36,26,0.10)';
const CARD_SHADOW = '0 1px 2px rgba(83,36,24,0.04), 0 8px 24px -16px rgba(83,36,24,0.18)';
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
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 28px 64px', color: CREAM, position: 'relative' }}>
      {/* Header */}
      <header style={{ marginBottom: 32, position: 'relative' }}>
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
          Équipe
        </div>
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: AMBER,
            marginBottom: 10,
          }}
        >
          <span style={{ width: 18, height: 1.5, background: BRAND, borderRadius: 999 }} />
          ADMIN · ÉQUIPE
        </div>
        <h1
          style={{
            position: 'relative',
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
        <p style={{ position: 'relative', fontSize: 14, lineHeight: 1.55, color: CREAM_SOFT, marginTop: 12, maxWidth: 560 }}>
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
          <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 24, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            {archivedMembers.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: HAIRLINE }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: CREAM }}>
                    {u.full_name ?? u.email.split('@')[0]}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: CREAM_SOFT }}>{u.email}</div>
                </div>
                <form action={reactivateMemberAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" style={{ padding: '7px 16px', borderRadius: 999, border: '1px solid rgba(79,122,56,0.35)', background: 'rgba(79,122,56,0.08)', color: '#4F7A38', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s ease' }}>
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
          borderRadius: 24,
          padding: 28,
          marginBottom: 36,
          boxShadow: CARD_SHADOW,
        }}
      >
        <h2 style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, color: '#532418', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 22, height: 1.5, background: BRAND, borderRadius: 999 }} />
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
          <div style={{ background: 'linear-gradient(180deg, rgba(243,146,83,0.05) 0%, rgba(253,250,246,0.6) 100%)', border: HAIRLINE, borderRadius: 24, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, margin: '0 auto 12px', borderRadius: 16, background: 'rgba(243,146,83,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: AMBER, fontFamily: SERIF, fontSize: 22 }}>
              ✦
            </div>
            <p style={{ fontSize: 13, color: CREAM_SOFT, margin: 0 }}>Aucune invitation en attente.</p>
          </div>
        ) : (
          <div
            style={{
              background: CARD_BG,
              border: CARD_BORDER,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: CARD_SHADOW,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(243,146,83,0.05)' }}>
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
                        borderBottom: HAIRLINE,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: HAIRLINE }}>
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
          <div style={{ background: 'linear-gradient(180deg, rgba(243,146,83,0.05) 0%, rgba(253,250,246,0.6) 100%)', border: HAIRLINE, borderRadius: 24, padding: '28px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: CREAM_SOFT, margin: 0 }}>Aucun.</p>
          </div>
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
