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
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-7 py-10">
      <span
        aria-hidden
        className="watermark pointer-events-none absolute inset-x-0 top-8 text-center text-[120px] leading-none"
      >
        Hermès
      </span>

      <div className="surface-ceramic orange-glow relative w-full max-w-[560px] rounded-3xl p-10 text-center">
        <div className="mb-5 flex justify-center">
          <span className="inline-flex items-center justify-center rounded-2xl bg-brand-pale p-2.5 text-brand-dark shadow-soft">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M7 9l3 2-3 2" />
              <path d="M13 13h4" />
              <path d="M8 22h8" />
            </svg>
          </span>
        </div>

        <div className="label-eyebrow justify-center">
          Admin · Armée Hermès
        </div>

        <h1 className="mt-3 font-marcellus text-[32px] leading-[1.1] tracking-[-0.01em] text-choco">
          Console des agents
        </h1>

        <p className="mx-auto mt-3 max-w-[420px] font-inter text-sm leading-relaxed text-[#6F5A50]">
          Pilotez l&apos;armée Hermès — chat, Kanban, dispatch.
        </p>

        <div className="mt-8">
          <a
            href={HERMES_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="orange-glow inline-flex items-center gap-2.5 rounded-full bg-brand px-7 py-3.5 font-inter text-[15px] font-semibold text-[#2A1810] transition hover:bg-brand-dark"
          >
            Ouvrir la console Hermès ↗
          </a>
        </div>

        <p className="mx-auto mt-6 max-w-[420px] font-inter text-xs leading-relaxed text-muted-warm">
          Connexion avec le mot de passe Hermès (demandez-le à
          l&apos;administrateur).
        </p>
      </div>
    </div>
  );
}
