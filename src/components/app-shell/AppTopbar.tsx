'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';
import GlobalSearch from './GlobalSearch';
import NotificationsBell from './NotificationsBell';

export type TopbarUser = {
  name: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
};

/**
 * AppTopbar — barre fine en haut du panneau blanc (Sprint 10, ref Drive).
 *
 * Search PILL arrondie (fond creme) = composant GlobalSearch FONCTIONNEL
 * (Sprint 12). A droite cloche + menu profil (avatar/nom/role). Fin lisere
 * bas beige. Burger (mobile) pour le drawer. La cloche est fonctionnelle (NotificationsBell).
 */
export default function AppTopbar({
  user,
  isAdmin,
  onOpenMenu,
}: {
  user: TopbarUser;
  isAdmin: boolean;
  onOpenMenu: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials =
    (user.name ?? user.email ?? 'U')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U';
  const roleLabel =
    user.role === 'admin' ? 'Administrateur' : 'Commercial';

  return (
    <header className="surface-glass relative z-30 flex h-[68px] shrink-0 items-center gap-3 border-b border-[rgba(74,36,26,0.10)] px-4 md:px-7">
      {/* Burger (mobile) */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-ink-warm transition-all hover:bg-cream-deep hover:text-choco focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/* Recherche globale fonctionnelle (Sprint 12) */}
      <GlobalSearch />

      <div className="flex-1 sm:hidden" />

      {/* Notifications (fonctionnelle) */}
      <NotificationsBell />

      {/* Profil */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-11 items-center gap-2 rounded-full border border-[rgba(74,36,26,0.10)] bg-cream/60 pl-1 pr-2.5 transition-all hover:border-brand/40 hover:bg-white hover:shadow-soft-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-choco text-[10px] font-semibold text-cream ring-1 ring-[rgba(74,36,26,0.10)]">
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
          <span className="hidden text-left sm:block">
            <span className="block max-w-[140px] truncate text-xs font-semibold leading-tight text-choco">
              {user.name ?? user.email ?? 'Utilisateur'}
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] leading-tight text-brand-burnt">
              {roleLabel}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-warm transition-transform',
              menuOpen && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="surface-ceramic absolute right-0 z-50 mt-2.5 w-64 overflow-hidden rounded-2xl border border-[rgba(74,36,26,0.10)] shadow-soft-lg"
              >
                <div className="border-b border-[rgba(74,36,26,0.10)] bg-gradient-cream px-4 py-3.5">
                  <p className="label-eyebrow mb-1.5">Mon compte</p>
                  {user.name && (
                    <p className="truncate font-marcellus text-base text-choco">
                      {user.name}
                    </p>
                  )}
                  {user.email && (
                    <p className="truncate text-xs text-[#6F5A50]">
                      {user.email}
                    </p>
                  )}
                  {isAdmin && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-semibold text-choco">
                      Administrateur
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-[#6F5A50] transition-colors hover:bg-cream hover:text-choco focus-visible:outline-none focus-visible:bg-cream"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Se deconnecter
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
