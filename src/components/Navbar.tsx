'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

type NavbarProps = {
  userEmail: string | null;
  isAdmin: boolean;
};

const LINKS: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/formation', label: 'Formation' },
  { href: '/ressources', label: 'Ressources' },
  { href: '/prospects', label: 'Prospects' },
];

export default function Navbar({ userEmail, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-gnd-primary">
            GND <span className="text-gnd-accent">·</span> Formation
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? 'font-semibold text-gnd-primary'
                      : 'text-gnd-muted hover:text-gnd-primary'
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
                    ? 'font-semibold text-gnd-accent'
                    : 'text-gnd-accent/70 hover:text-gnd-accent'
                }
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm text-gnd-muted">
          {userEmail && <span className="hidden sm:inline">{userEmail}</span>}
          <button onClick={handleLogout} className="btn-secondary !py-1.5 !text-xs">
            Se déconnecter
          </button>
        </div>
      </div>
    </header>
  );
}
