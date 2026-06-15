'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, type Capability } from '@/lib/permissions';
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
  ClipboardList,
} from 'lucide-react';

type NavItem = {
  id: string;
  icon: typeof Gauge;
  label: string;
  href: string;
  cap?: Capability;
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
      { id: 'vue-globale', icon: Shield, label: 'Vue globale', href: '/admin', cap: 'finance.view' },
      { id: 'relances', icon: CalendarClock, label: 'Relances', href: '/admin/relances', cap: 'team.view' },
      { id: 'suivi', icon: ClipboardList, label: 'Suivi équipe', href: '/admin/suivi-equipe', cap: 'team.view' },
      { id: 'commissions', icon: BadgeEuro, label: 'Commissions', href: '/admin/commissions', cap: 'finance.view' },
      { id: 'doublons', icon: CopyCheck, label: 'Doublons', href: '/admin/doublons', cap: 'members.manage' },
      { id: 'equipe', icon: Users, label: 'Équipe', href: '/admin/invitations', cap: 'members.manage' },
      { id: 'paliers', icon: Rocket, label: 'Paliers bonus', href: '/admin', cap: 'finance.view' },
    ],
  },
];

/* Design System crème/orange (valeurs verrouillees). */
const SERIF = 'var(--font-marcellus), Georgia, serif';
const SANS = 'var(--font-inter), system-ui, sans-serif';
const CHOCO = '#532418';
const INK = '#2A2320';
const MUTED = '#7B665C';
const BRAND = '#F39253';
const BRAND_DARK = '#B5601C';
const CREAM = '#FBF7F2';
const CREAM_CARD = '#F6EFE7';
const BORDER = '#E2D5C3';

export default function AdminSidebar({
  userName,
  userEmail,
  userRole,
  roleKey,
}: {
  userName: string;
  userEmail: string;
  userRole: string;
  roleKey: string;
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
        background: CREAM,
        borderRight: `1px solid ${BORDER}`,
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
            background: BRAND,
            border: '1px solid rgba(83,36,24,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SERIF,
            fontSize: 13,
            fontWeight: 600,
            color: '#2A1810',
            letterSpacing: '0.02em',
          }}
        >
          GND
        </div>
        <div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 17,
              fontWeight: 500,
              color: CHOCO,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            GND{' '}
            <em
              style={{
                fontStyle: 'italic',
                color: BRAND_DARK,
                fontWeight: 500,
              }}
            >
              Console
            </em>
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: MUTED,
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
                fontFamily: SANS,
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                color: MUTED,
                padding: '0 12px 8px',
              }}
            >
              {section.title}
            </div>
            {section.items
              .filter((item) => !item.cap || can(roleKey, item.cap))
              .map((item) => {
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
                      ? 'rgba(243,146,83,0.14)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid rgba(243,146,83,0.30)'
                      : '1px solid transparent',
                    color: isActive ? CHOCO : MUTED,
                    textDecoration: 'none',
                    fontFamily: SANS,
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
          background: CREAM_CARD,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #F39253, #E07E3C)',
            color: '#2A1810',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SERIF,
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
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              color: INK,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userName}
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: BRAND_DARK,
            }}
          >
            {userRole}
          </div>
        </div>
      </div>
    </aside>
  );
}
