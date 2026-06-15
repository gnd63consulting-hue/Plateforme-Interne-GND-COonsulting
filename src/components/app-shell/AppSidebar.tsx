'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  AlarmClock,
  CheckSquare,
  Workflow,
  GraduationCap,
  Compass,
  BookOpen,
  ShieldCheck,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Modèle de navigation                                               */
/* ------------------------------------------------------------------ */

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (p: string) => boolean;
  admin?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

/**
 * Groupes de navigation — reprend TOUS les liens de l'ancienne Navbar,
 * réorganisés en sections lisibles. L'item Admin n'est rendu que pour les
 * admins (même logique de rôle que l'ancien shell : `isAdmin`).
 */
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [
      {
        href: '/mon-tableau',
        label: 'Mon tableau',
        icon: LayoutDashboard,
        match: (p) => p.startsWith('/mon-tableau'),
      },
    ],
  },
  {
    title: 'Commercial',
    items: [
      {
        href: '/prospects',
        label: 'Prospects',
        icon: Users,
        match: (p) =>
          p.startsWith('/prospects') &&
          !p.startsWith('/prospects/relances') &&
          !p.startsWith('/prospects/taches'),
      },
      {
        href: '/prospects/relances',
        label: 'Relances',
        icon: AlarmClock,
        match: (p) => p.startsWith('/prospects/relances'),
      },
      {
        href: '/prospects/taches',
        label: 'Tâches',
        icon: CheckSquare,
        match: (p) => p.startsWith('/prospects/taches'),
      },
      {
        href: '/sequences',
        label: 'Séquences',
        icon: Workflow,
        match: (p) => p.startsWith('/sequences'),
      },
    ],
  },
  {
    title: 'Formation',
    items: [
      {
        href: '/onboarding',
        label: 'Onboarding',
        icon: Compass,
        match: (p) => p.startsWith('/onboarding'),
      },
      {
        href: '/formation',
        label: 'Formation',
        icon: GraduationCap,
        match: (p) => p === '/formation' || p.startsWith('/formation/'),
      },
      {
        href: '/ressources',
        label: 'Ressources',
        icon: BookOpen,
        match: (p) => p.startsWith('/ressources'),
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        href: '/admin',
        label: 'Admin',
        icon: ShieldCheck,
        match: (p) => p.startsWith('/admin'),
        admin: true,
      },
    ],
  },
];

export type SidebarUser = {
  name: string | null;
  email: string | null;
  role: string | null;
  commissionPct: number | null;
  avatarUrl: string | null;
};

/* ------------------------------------------------------------------ */
/*  Sous-composants                                                    */
/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <Link
      href="/mon-tableau"
      className="flex items-center gap-2.5 rounded-2xl px-1 py-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-brand-glow"
      >
        G
      </span>
      <span className="font-marcellus text-lg tracking-tight text-choco">
        GND Consulting
      </span>
    </Link>
  );
}

/**
 * Pill CTA primaire « + Nouveau prospect » (réf Drive « + Nouveau »).
 * Fond orange officiel #F39253, TEXTE CHOCOLAT (#2A1810) — l'orange clair en
 * texte blanc manque de contraste, le chocolat passe AAA. Ombre orange douce.
 */
function NewProspectButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/prospects"
      onClick={onNavigate}
      className={cn(
        'group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-5',
        'font-inter text-sm font-semibold text-[#2A1810]',
        'shadow-[0_8px_24px_rgba(243,146,83,0.35)] transition-all duration-200',
        'hover:bg-brand-dark hover:shadow-[0_10px_28px_rgba(243,146,83,0.42)] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-soft'
      )}
    >
      <Plus className="h-4 w-4" aria-hidden />
      Nouveau prospect
    </Link>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
        active
          ? 'text-[#532418]'
          : 'text-muted-warm hover:bg-cream-deep hover:text-ink-warm'
      )}
    >
      {active && (
        <>
          {/* Surbrillance arrondie douce orange (réf Drive item actif). */}
          <motion.span
            layoutId="sidebar-active"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute inset-0 -z-10 rounded-xl bg-brand/[0.12]"
            aria-hidden
          />
          {/* Petit indicateur à gauche. */}
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand"
          />
        </>
      )}
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          active
            ? 'text-brand-dark'
            : 'text-muted-warm group-hover:text-ink-warm'
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function UserBlock({ user }: { user: SidebarUser }) {
  const initials =
    (user.name ?? user.email ?? 'U')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U';
  const roleLabel =
    user.role === 'admin'
      ? 'Administrateur'
      : user.role
        ? 'Commercial'
        : 'Commercial';

  return (
    <div className="rounded-2xl border border-border-soft/70 bg-cream p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-choco text-xs font-semibold text-cream ring-2 ring-surface-soft">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name ?? user.email ?? 'Avatar'}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-warm">
            {user.name ?? user.email ?? 'Utilisateur'}
          </p>
          <p className="truncate text-[11px] text-muted-warm">{roleLabel}</p>
        </div>
      </div>
      {user.commissionPct != null && (
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-brand-pale px-2.5 py-1.5">
          <span className="text-[11px] font-medium text-choco">
            Ma commission
          </span>
          <span className="text-[11px] font-bold tabular-nums text-brand-dark">
            {user.commissionPct}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contenu commun (desktop + drawer)                                  */
/* ------------------------------------------------------------------ */

function SidebarInner({
  user,
  isAdmin,
  onNavigate,
}: {
  user: SidebarUser;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.admin || isAdmin),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="px-1 pt-1">
        <Logo />
      </div>

      <NewProspectButton onNavigate={onNavigate} />

      {/*
        Nav scrollable. `data-lenis-prevent` => le smooth-scroll global Lenis
        ignore ce conteneur, donc la molette scrolle la sidebar NATIVEMENT.
        Espacement vertical généreux entre sections (réf Drive).
      */}
      <nav
        data-lenis-prevent
        aria-label="Navigation principale"
        className="-mr-1 flex flex-1 flex-col gap-6 overflow-y-auto pr-1"
      >
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 font-inter text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-warm/80">
              {group.title}
            </p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.match(pathname)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <UserBlock user={user} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Export — rail intégré (desktop) + drawer (mobile)                  */
/* ------------------------------------------------------------------ */

export default function AppSidebar({
  user,
  isAdmin,
  mobileOpen,
  onMobileClose,
}: {
  user: SidebarUser;
  isAdmin: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <>
      {/* Desktop : rail intégré dans le panneau blanc (liseré beige à droite). */}
      <aside className="hidden w-[264px] shrink-0 border-r border-border-soft/60 bg-surface-soft lg:block">
        <SidebarInner user={user} isAdmin={isAdmin} />
      </aside>

      {/* Mobile : drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-choco/30 backdrop-blur-sm lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              aria-hidden
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-border-soft/60 bg-surface-soft shadow-soft-lg lg:hidden"
              initial={reduce ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navigation"
            >
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Fermer le menu"
                className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-cream-deep hover:text-ink-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <SidebarInner
                user={user}
                isAdmin={isAdmin}
                onNavigate={onMobileClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
