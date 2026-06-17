import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * /admin/console — Console des agents Hermès embarquée (iframe plein écran).
 *
 * Objectif : piloter l'armée Hermès (chat, Kanban, dispatch) SANS quitter la
 * plateforme. Le dashboard Hermès vit sur un sous-domaine séparé
 * (ex. https://agents.gndconsulting.fr) et est exposé ici en plein écran via
 * un <iframe>, dont l'origine est lue dans la variable d'env publique
 * `NEXT_PUBLIC_HERMES_CONSOLE_URL`.
 *
 * Gate d'accès : FULL-admin (admin / admin_limited), EXACTEMENT comme
 * /admin/agents. Le layout /admin gère déjà le gate via les permissions
 * effectives ; on réplique ici le guard page-level à l'identique pour la
 * défense en profondeur (même pattern que /admin/agents).
 *
 * Sécurité iframe : tant que le sous-domaine n'existe pas, la variable d'env
 * est absente → on affiche un état vide gracieux (jamais d'iframe cassé). Le
 * CRM ne pose AUCUNE Content-Security-Policy (ni next.config.mjs, ni
 * middleware), donc le navigateur n'a rien à bloquer côté CRM : c'est le
 * dashboard distant qui doit, lui, autoriser l'embedding (CSP frame-ancestors
 * / absence de X-Frame-Options côté agents.gndconsulting.fr).
 */
const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

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

  // Server Component : process.env.NEXT_PUBLIC_* est lisible au render.
  const url = process.env.NEXT_PUBLIC_HERMES_CONSOLE_URL;

  return (
    <div
      style={{
        // La zone de contenu admin (<main>) fait 100vh (sidebar à côté).
        // On remplit toute la hauteur en colonne flex, sans scroll parasite.
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minHeight: '80vh',
        boxSizing: 'border-box',
        padding: '28px 28px 22px',
        color: INK,
      }}
    >
      {/* En-tête compact */}
      <header style={{ flexShrink: 0, marginBottom: 16 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: AMBER,
            marginBottom: 8,
          }}
        >
          ADMIN · ARMÉE HERMÈS
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 30,
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
                fontSize: 13,
                lineHeight: 1.5,
                color: SOFT,
                margin: '8px 0 0',
                maxWidth: 660,
              }}
            >
              Pilotez l&apos;armée Hermès (chat, Kanban, dispatch) sans quitter
              la plateforme.
            </p>
          </div>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flexShrink: 0,
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.01em',
                color: AMBER,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                padding: '6px 2px',
              }}
            >
              Ouvrir en plein écran ↗
            </a>
          )}
        </div>
      </header>

      {url ? (
        <iframe
          src={url}
          title="Console Hermès"
          allow="clipboard-read; clipboard-write; fullscreen"
          style={{
            flex: 1,
            width: '100%',
            minHeight: 0,
            border: BORDER,
            borderRadius: 16,
            background: CARD,
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: CARD,
              border: BORDER,
              borderRadius: 18,
              padding: '28px 26px',
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: AMBER,
                marginBottom: 10,
              }}
            >
              Console non connectée
            </div>
            <h2
              style={{
                fontFamily: SERIF,
                fontSize: 22,
                fontWeight: 500,
                color: CHOCO,
                margin: '0 0 10px',
                lineHeight: 1.15,
              }}
            >
              La console n&apos;est pas encore connectée.
            </h2>
            <p
              style={{
                fontFamily: SANS,
                fontSize: 13,
                lineHeight: 1.55,
                color: SOFT,
                margin: '0 0 18px',
              }}
            >
              Le dashboard Hermès vit sur un sous-domaine dédié. Une fois
              celui-ci en ligne et la variable d&apos;environnement posée, il
              s&apos;affichera ici en plein écran.
            </p>
            <ol
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <Step
                n={1}
                text="Exposer le dashboard Hermès derrière un reverse-proxy sur agents.gndconsulting.fr (HTTPS)."
              />
              <Step
                n={2}
                text="Poser la variable d'environnement NEXT_PUBLIC_HERMES_CONSOLE_URL = https://agents.gndconsulting.fr (Vercel), puis redéployer."
              />
              <Step
                n={3}
                text="Côté dashboard : autoriser l'embedding (frame-ancestors du CRM / pas de X-Frame-Options: DENY)."
              />
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: 'rgba(83,36,24,0.06)',
          border: '1px solid rgba(83,36,24,0.16)',
          color: CHOCO,
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: SANS,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: FAINT,
        }}
      >
        {text}
      </span>
    </li>
  );
}
