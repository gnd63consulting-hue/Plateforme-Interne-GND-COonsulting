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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="surface-chocolate relative overflow-hidden rounded-[16px] p-5 sm:p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none font-marcellus text-[110px] leading-none text-cream/[0.08]"
        >
          Hermès
        </span>
        <div className="relative">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-[#E0A572]">
              Admin · Armée Hermès
            </span>
          </span>
          <h1 className="mt-3 font-marcellus text-3xl tracking-[-0.01em] text-cream">
            Console des agents
          </h1>
          <p className="mt-2 max-w-[460px] font-inter text-sm leading-relaxed text-cream/55">
            Pilotez l&apos;armée Hermès — chat, Kanban, dispatch.
          </p>
        </div>
      </header>

      <div className="panel panel-accent card-hover mt-4 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-pale p-2.5 text-brand-burnt shadow-soft">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M7 9l3 2-3 2" />
              <path d="M13 13h4" />
              <path d="M8 22h8" />
            </svg>
          </span>
          <div>
            <p className="font-marcellus text-lg text-choco">Lancer la console</p>
            <p className="mt-1 max-w-[420px] font-inter text-sm leading-relaxed text-[#6F5A50]">
              Le dashboard Hermès s&apos;ouvre dans un nouvel onglet.
            </p>
          </div>
        </div>
        <a
          href={HERMES_CONSOLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="orange-glow inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 font-inter text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark"
        >
          Ouvrir Hermès ↗
        </a>
      </div>

      <div className="panel mt-3 flex items-start gap-3 p-4">
        <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-pale p-2 text-brand-burnt">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <p className="font-inter text-xs leading-relaxed text-muted-warm">
          Connexion avec le mot de passe Hermès (demandez-le à
          l&apos;administrateur).
        </p>
      </div>
    </div>
  );
}
