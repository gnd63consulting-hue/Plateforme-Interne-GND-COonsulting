'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gauge,
  Target,
  Briefcase,
  GraduationCap,
  Shield,
  Users,
  Rocket,
  CalendarClock,
  CopyCheck,
  BadgeEuro,
} from 'lucide-react';

type NavItem = {
  id: string;
  icon: typeof Gauge;
  label: string;
  href: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    title: 'OPÉRATIONS',
    items: [
      { id: 'console', icon: Gauge, label: 'Console', href: '/dashboard' },
      { id: 'prospects', icon: Target, label: 'Carnet de bord', href: '/prospects' },
      { id: 'ressources', icon: Briefcase, label: 'Sales toolkit', href: '/ressources' },
      { id: 'formation', icon: GraduationCap, label: 'E-learning path', href: '/formation' },
    ],
  },
  {
    title: 'ADMIN',
    items: [
      { id: 'vue-globale', icon: Shield, label: 'Vue globale', href: '/admin' },
      { id: 'relances', icon: CalendarClock, label: 'Relances', href: '/admin/relances' },
      { id: 'commissions', icon: BadgeEuro, label: 'Commissions', href: '/admin/commissions' },
      { id: 'doublons', icon: CopyCheck, label: 'Doublons', href: '/admin/doublons' },
      { id: 'equipe', icon: Users, label: 'Équipe', href: '/admin/invitations' },
      { id: 'paliers', icon: Rocket, label: 'Paliers bonus', href: '/admin' },
    ],
  },
];

export default function AdminSidebar({
  userName,
  userEmail,
  userRole,
}: {
  userName: string;
  userEmail: string;
  userRole: string;
}) {
  const pathname = usePathname();

  const initials =
    userName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || (userEmail[0] ?? 'G').toUpperCase();

  return (
    <aside
      style={{
        width: 260,
        height: '100vh',
        padding: 22,
        background: 'linear-gradient(180deg, #1A0F0E 0%, #25140F 100%)',
        borderRight: '1px solid rgba(232,133,61,0.10)',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: '#3D1F1E',
            border: '1px solid rgba(232,133,61,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#E8853D',
            letterSpacing: '0.02em',
          }}
        >
          GND
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 17,
              fontWeight: 500,
              color: '#FDF6EE',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            GND{' '}
            <em
              style={{
                fontStyle: 'italic',
                color: '#E8853D',
                fontWeight: 500,
              }}
            >
              Console
            </em>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'rgba(232,133,61,0.7)',
              marginTop: 4,
            }}
          >
            PLATEFORME INTERNE
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                color: 'rgba(232,133,61,0.6)',
                padding: '0 12px 8px',
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: isActive
                      ? 'rgba(232,133,61,0.10)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid rgba(232,133,61,0.20)'
                      : '1px solid transparent',
                    color: isActive ? '#E8853D' : 'rgba(253,246,238,0.7)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} strokeWidth={1.6} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 10,
          borderRadius: 14,
          background: 'rgba(253,246,238,0.04)',
          border: '1px solid rgba(232,133,61,0.10)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #E8853D, #D4732A)',
            color: '#3D1F1E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: '#FDF6EE',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userName}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: '#E8853D',
            }}
          >
            {userRole}
          </div>
        </div>
      </div>
    </aside>
  );
}
