'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type NavbarProps = {
  userEmail: string | null;
  userName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

const LINKS: { href: string; label: string; match: (p: string) => boolean }[] = [
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4 md:px-8">
        <Link
          href="/formation"
          className="font-headline text-xl font-bold tracking-tighter text-on-surface"
        >
          GND Consulting
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? 'border-b-2 border-primary pb-1 font-bold text-primary transition-colors'
                    : 'font-medium text-on-surface-variant transition-colors hover:text-primary'
                }
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={
                pathname.startsWith('/admin')
                  ? 'border-b-2 border-tertiary pb-1 font-bold text-tertiary'
                  : 'font-medium text-tertiary/70 hover:text-tertiary'
              }
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="hidden rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-container-high active:scale-95 md:inline-flex"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high text-sm font-semibold text-on-surface shadow-sm transition hover:shadow-md"
              aria-label="Ouvrir le menu utilisateur"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={userName ?? userEmail ?? 'Avatar'}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span>{initials}</span>
              )}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-3 w-64 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-editorial"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="border-b border-outline-variant/20 px-4 py-3">
                  {userName && (
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {userName}
                    </p>
                  )}
                  {userEmail && (
                    <p className="truncate text-xs text-on-surface-variant">
                      {userEmail}
                    </p>
                  )}
                </div>
                <nav className="flex flex-col py-2 md:hidden">
                  {LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="px-4 py-2 text-sm font-medium text-tertiary hover:bg-surface-container-low"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-outline-variant/20 my-2" />
                </nav>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    logout
                  </span>
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
