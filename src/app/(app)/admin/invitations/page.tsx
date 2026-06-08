import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { InviteForm } from './InviteForm';
import { revokeInvitation } from './actions';

const CREAM = '#FDF6EE';
const CREAM_SOFT = 'rgba(253,246,238,0.62)';
const AMBER = '#E8853D';
const CARD_BG = 'rgba(253,246,238,0.04)';
const CARD_BORDER = '1px solid rgba(232,133,61,0.14)';
const SERIF = 'var(--font-fraunces), Georgia, serif';
const MONO = 'var(--font-geist-mono), ui-monospace, monospace';

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
            color: CREAM,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Gestion des invitations
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: CREAM_SOFT, marginTop: 12, maxWidth: 560 }}>
          Seules les personnes invitées peuvent se connecter (login Google). Tu ajoutes
          un email ci-dessous, puis tu envoies à la personne le message généré.
        </p>
      </header>

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
        <h2 style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, color: CREAM, margin: '0 0 18px' }}>
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
                        color: 'rgba(253,246,238,0.45)',
                        borderBottom: '1px solid rgba(232,133,61,0.12)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(253,246,238,0.06)' }}>
                    <td style={{ padding: '13px 16px', color: CREAM, fontFamily: MONO, fontSize: 12 }}>
                      {inv.email}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'rgba(232,133,61,0.14)',
                          border: '1px solid rgba(232,133,61,0.28)',
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
                            color: '#E8896B',
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
            color: 'rgba(253,246,238,0.45)',
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
                <span style={{ color: 'rgba(253,246,238,0.35)' }}>·</span>
                <span>{inv.role}</span>
                <span style={{ color: 'rgba(253,246,238,0.35)' }}>·</span>
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
