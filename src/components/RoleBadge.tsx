import { Shield, ShieldCheck, User } from 'lucide-react';

type RoleKey = 'admin' | 'admin_limited' | 'freelance';

const ROLE_CONFIG: Record<
  RoleKey,
  {
    label: string;
    bg: string;
    text: string;
    ring: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  admin: {
    label: 'Admin',
    bg: 'bg-gradient-to-r from-purple-100 to-fuchsia-100',
    text: 'text-purple-700',
    ring: 'ring-purple-200/80',
    icon: ShieldCheck,
  },
  admin_limited: {
    label: 'Co-admin',
    bg: 'bg-gradient-to-r from-info-bg to-info-bg',
    text: 'text-info-fg',
    ring: 'ring-[rgba(49,104,156,0.25)]/80',
    icon: Shield,
  },
  freelance: {
    label: 'Freelance',
    bg: 'bg-cream-deep',
    text: 'text-[#6F5A50]',
    ring: 'ring-border-soft',
    icon: User,
  },
};

export function RoleBadge({
  role,
  size = 'sm',
}: {
  role: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const config = ROLE_CONFIG[role as RoleKey] ?? ROLE_CONFIG.freelance;
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'gap-1 px-1.5 py-0.5 text-[10px]',
    sm: 'gap-1 px-2 py-0.5 text-[11px]',
    md: 'gap-1.5 px-2.5 py-1 text-xs',
  };
  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ${config.bg} ${config.text} ${config.ring} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} aria-hidden />
      {config.label}
    </span>
  );
}
