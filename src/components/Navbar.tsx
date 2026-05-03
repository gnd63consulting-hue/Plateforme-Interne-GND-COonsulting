'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, LogOut, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

type NavbarProps = {
  userEmail: string | null;
  userName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

type NavLink = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  tone?: 'default' | 'admin';
};

const LINKS: NavLink[] = [
  {
    href: '/formation',
    label: 'Formation',
    match: (p) => p === '/formation' || p.startsWith('/formation/'),
  },
  {
    href: '/ressources',
    label: 'Ressources',
    match: (p) => p.startsWith('/ressources'),
  },
  {
    href: '/prospects',
    label: 'Prospects',
    match: (p) => p.startsWith('/prospects'),
  },
];

export default function Navbar({
  userEmail,
  userName,
  avatarUrl,
  isAdmin,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials =
    (userName ?? userEmail ?? 'U')
      .split(/[\s@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U';

  const allLinks: NavLink[] = isAdmin
    ? [
        ...LINKS,
        {
          href: '/admin',
          label: 'Admin',
          match: (p) => p.startsWith('/admin'),
          tone: 'admin',
        },
      ]
    : LINKS;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gnd-bronze/8 bg-gnd-cream/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3.5 md:px-8">
        {/* Logo */}
        <Link
          href="/formation"
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gnd-bronze text-[11px] font-bold text-gnd-cream"
          >
            G
          </span>
          <span className="font-display text-lg font-medium tracking-tight text-gnd-bronze">
            GND Consulting
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {allLinks.map((link) => {
            const active = link.match(pathname);
            const isAdminLink = link.tone === 'admin';
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? isAdminLink
                      ? 'text-gnd-amber'
                      : 'text-gnd-bronze'
                    : isAdminLink
                      ? 'text-gnd-amber/60 hover:text-gnd-amber'
                      : 'text-gnd-bronze-soft hover:text-gnd-bronze'
                )}
              >
                <span className="relative z-10">{link.label}</span>
                {active && (
                  <motion.span
                    layoutId="navbar-active"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className={cn(
                      'absolute inset-0 rounded-full',
                      isAdminLink
                        ? 'bg-gnd-amber/12'
                        : 'bg-gnd-bronze/8'
                    )}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="hidden rounded-full p-2 text-gnd-bronze-soft transition-all hover:bg-gnd-bronze/8 hover:text-gnd-bronze active:scale-95 md:inline-flex"
          >
            <Bell className="h-4 w-4" aria-hidden />
          </button>

          <div className="relative">
            <motion.button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              whileTap={{ scale: 0.95 }}
              className="group flex h-9 items-center gap-2 rounded-full border border-gnd-bronze/12 bg-white pl-1 pr-3 text-sm transition-all hover:border-gnd-bronze/25 hover:shadow-warm"
              aria-label="Ouvrir le menu utilisateur"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gnd-bronze text-[10px] font-bold text-gnd-cream">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={userName ?? userEmail ?? 'Avatar'}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </span>
              {isAdmin && (
                <Sparkles
                  className="h-3 w-3 text-gnd-amber"
                  aria-label="Admin"
                />
              )}
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  {/* Click-outside backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-gnd-bronze/10 bg-white shadow-warm-xl"
                  >
                    <div className="border-b border-gnd-bronze/8 bg-gradient-to-br from-gnd-cream to-white px-5 py-4">
                      {userName && (
                        <p className="truncate font-display text-base font-medium text-gnd-bronze">
                          {userName}
                        </p>
                      )}
                      {userEmail && (
                        <p className="truncate text-xs text-gnd-bronze-soft">
                          {userEmail}
                        </p>
                      )}
                      {isAdmin && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gnd-amber/12 px-2 py-0.5 text-[10px] font-semibold text-gnd-amber">
                          <Sparkles className="h-2.5 w-2.5" aria-hidden />
                          Administrateur
                        </span>
                      )}
                    </div>

                    <nav className="flex flex-col py-2 md:hidden">
                      {allLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="px-5 py-2 text-sm text-gnd-bronze hover:bg-gnd-cream"
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <div className="my-2 border-t border-gnd-bronze/8" />
                    </nav>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-5 py-3 text-sm text-gnd-bronze-soft transition-colors hover:bg-gnd-cream hover:text-gnd-bronze"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden />
                      Se déconnecter
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
