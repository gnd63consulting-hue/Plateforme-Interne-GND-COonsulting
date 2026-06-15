'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, LogOut, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

export type TopbarUser = {
  name: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
};

/**
 * AppTopbar — barre fine du nouveau shell SaaS (Sprint 10).
 *
 * Burger (mobile, ouvre le drawer), recherche (décorative, non câblée au
 * back), cloche de notifications (décorative), menu profil avec déconnexion.
 * La recherche et la cloche sont volontairement passives : aucune logique
 * métier n'est ajoutée côté client.
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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border-soft/60 bg-cream/80 px-4 backdrop-blur-xl md:px-6">
      {/* Burger (mobile) */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-warm transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/* Recherche (décorative) */}
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Rechercher un prospect, une ressource…"
          aria-label="Rechercher"
          className="h-10 w-full rounded-full border border-border-soft/70 bg-surface-soft pl-9 pr-4 text-sm text-ink-warm placeholder:text-muted-warm/70 transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand-ring"
        />
      </div>

      <div className="flex-1 sm:hidden" />

      {/* Notifications (décorative) */}
      <button
        type="button"
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-surface-soft hover:text-ink-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand ring-2 ring-cream"
        />
      </button>

      {/* Profil */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-10 items-center gap-2 rounded-full border border-border-soft/70 bg-surface-soft pl-1 pr-2.5 transition-all hover:border-brand/30 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-choco text-[10px] font-semibold text-cream">
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
            <span className="block max-w-[140px] truncate text-xs font-semibold leading-tight text-ink-warm">
              {user.name ?? user.email ?? 'Utilisateur'}
            </span>
            <span className="block text-[10px] leading-tight text-muted-warm">
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
                className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border-soft/70 bg-surface-soft shadow-soft-lg"
              >
                <div className="border-b border-border-soft/60 bg-gradient-cream px-4 py-3.5">
                  {user.name && (
                    <p className="truncate font-marcellus text-base text-choco">
                      {user.name}
                    </p>
                  )}
                  {user.email && (
                    <p className="truncate text-xs text-muted-warm">
                      {user.email}
                    </p>
                  )}
                  {isAdmin && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-choco">
                      Administrateur
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-muted-warm transition-colors hover:bg-cream hover:text-ink-warm focus-visible:outline-none focus-visible:bg-cream"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Se déconnecter
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
