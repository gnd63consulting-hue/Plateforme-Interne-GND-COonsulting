import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * /admin/console — Lancement de la console des agents Hermès.
 *
 * Objectif : piloter l'armée Hermès (chat, Kanban, dispatch). Le dashboard
 * Hermès est un produit MANAGÉ qui REFUSE l'embedding iframe
 * (`X-Frame-Options: DENY`). On abandonne donc l'iframe et on expose une
 * carte de lancement : un CTA ouvre la console dans un nouvel onglet.
 *
 * URL : stable et publique. La constante `HERMES_CONSOLE_URL` lit
 * `NEXT_PUBLIC_HERMES_CONSOLE_URL` si présente, sinon retombe sur l'URL qui
 * marche — le bouton est donc TOUJOURS fonctionnel, même si la variable
 * d'env est absente ou périmée.
 *
 * Gate d'accès : FULL-admin (admin / admin_limited), EXACTEMENT comme
 * /admin/agents. Le layout /admin gère déjà le gate via les permissions
 * effectives ; on réplique ici le guard page-level à l'identique pour la
 * défense en profondeur (même pattern que /admin/agents).
 */
const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

const HERMES_CONSOLE_URL =
  process.env.NEXT_PUBLIC_HERMES_CONSOLE_URL ||
  'https://aqua-spider-345596.hostingersite.com';

type Me = { id: string; role: string };

// Design System crème/orange — texte FONCÉ sur fond clair (contraste AA).
const INK = '#2A2320';
const SOFT = '#7B665C';
const FAINT = '#9A8A80';
const AMBER = '#B5601C';
const CHOCO = '#532418';
const CARD = '#FFFFFF';
const CREAM_BORDER = '#E2D5C3';
const BORDER = `1px solid ${CREAM_BORDER}`;
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-monospace, monospace';
const SANS = 'var(--font-inter), system-ui, sans-serif';

export default async function AdminConsolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meRaw } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();
  const me = meRaw as Me | null;
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  return (
    <div
      style={{
        // La zone de contenu admin (<main>) fait 100vh (sidebar à côté).
        // On centre la carte de lancement verticalement et horizontalement.
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        boxSizing: 'border-box',
        padding: '40px 28px',
        color: INK,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          background: CARD,
          border: BORDER,
          borderRadius: 20,
          padding: '40px 36px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: AMBER,
            marginBottom: 14,
          }}
        >
          ADMIN · ARMÉE HERMÈS
        </div>

        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: CHOCO,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Console des agents
        </h1>

        <p
          style={{
            fontFamily: SANS,
            fontSize: 14,
            lineHeight: 1.55,
            color: SOFT,
            margin: '12px auto 0',
            maxWidth: 420,
          }}
        >
          Pilotez l&apos;armée Hermès — chat, Kanban, dispatch.
        </p>

        <div style={{ marginTop: 30 }}>
          <a
            href={HERMES_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: AMBER,
              border: `1px solid ${CHOCO}`,
              borderRadius: 999,
              padding: '14px 28px',
              fontFamily: SANS,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.01em',
              color: '#FFF8F0',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ouvrir la console Hermès ↗
          </a>
        </div>

        <p
          style={{
            fontFamily: SANS,
            fontSize: 12,
            lineHeight: 1.5,
            color: FAINT,
            margin: '22px auto 0',
            maxWidth: 420,
          }}
        >
          Connexion avec le mot de passe Hermès (demandez-le à
          l&apos;administrateur).
        </p>
      </div>
    </div>
  );
}
