import type { Config } from 'tailwindcss';

/**
 * GND Formation — Design System v2 (mai 2026).
 *
 * Trois namespaces cohabitent maintenant :
 * - `gnd-*` (legacy avril) : encore utilisé sur /prospects, /admin, /dashboard
 *   et quelques composants. À retirer progressivement.
 * - Tokens DS Material 3 (`primary`, `surface`, etc.) : Academic Atelier
 *   layer (login historique). À conserver comme palette neutre.
 * - **`gnd-warm-*` (NEW v2)** : palette chaude GND officielle (cream / bronze /
 *   amber) alignée sur les PDFs commerciaux et la nouvelle identité plateforme.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy — à retirer à terme
        gnd: {
          primary: '#0F172A',
          accent: '#F59E0B',
          muted: '#64748B',
          bg: '#F8FAFC',
        },

        // Academic Atelier — M3-style tokens (conservé comme palette neutre)
        primary: '#0058be',
        'primary-container': '#2170e4',
        'primary-fixed': '#d8e2ff',
        'primary-fixed-dim': '#adc6ff',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#001a42',
        'on-primary-fixed-variant': '#004395',
        'on-primary-container': '#fefcff',

        secondary: '#495e8a',
        'secondary-container': '#b6ccff',
        'secondary-fixed': '#d8e2ff',
        'secondary-fixed-dim': '#b1c6f9',
        'on-secondary': '#ffffff',
        'on-secondary-fixed': '#001a42',
        'on-secondary-fixed-variant': '#304671',
        'on-secondary-container': '#405682',

        tertiary: '#924700',
        'tertiary-container': '#b75b00',
        'tertiary-fixed': '#ffdcc6',
        'tertiary-fixed-dim': '#ffb786',
        'on-tertiary': '#ffffff',
        'on-tertiary-fixed': '#311400',
        'on-tertiary-fixed-variant': '#723600',
        'on-tertiary-container': '#fffbff',

        background: '#fcf9f8',
        surface: '#fcf9f8',
        'surface-dim': '#dcd9d9',
        'surface-bright': '#fcf9f8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f3f2',
        'surface-container': '#f0eded',
        'surface-container-high': '#eae7e7',
        'surface-container-highest': '#e5e2e1',
        'surface-variant': '#e5e2e1',
        'surface-tint': '#005ac2',
        'on-surface': '#1c1b1b',
        'on-surface-variant': '#424754',
        'on-background': '#1c1b1b',

        outline: '#727785',
        'outline-variant': '#c2c6d6',

        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        'inverse-surface': '#313030',
        'inverse-on-surface': '#f3f0ef',
        'inverse-primary': '#adc6ff',

        // ============================================================
        // GND warm v2 (NEW) — charte chaude officielle
        // ============================================================
        'gnd-cream': '#FDF6EE',
        'gnd-cream-dim': '#F5EBD9',
        'gnd-paper': '#FBF7F1',
        'gnd-bronze': '#3D1F1E',
        'gnd-bronze-soft': '#5C3A38',
        'gnd-bronze-faded': '#8A6D6B',
        'gnd-amber': '#E8853D',
        'gnd-amber-dim': '#D4732A',
        'gnd-amber-glow': '#FFA060',
        'gnd-amber-pale': '#FFE3CC',
        'gnd-ink': '#1A0F0E',
        'gnd-clay': '#A0735C',
        'gnd-sand': '#EFE2D2',
      },
      fontFamily: {
        // Legacy (Google Fonts CDN, conservé pour compat)
        headline: ['Epilogue', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],

        // v2 (next/font)
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 6vw, 5rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.25rem, 4.5vw, 3.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
      },
      boxShadow: {
        editorial: '0 32px 64px -12px rgba(28, 27, 27, 0.08)',
        warm: '0 1px 2px rgba(61, 31, 30, 0.04), 0 8px 24px rgba(61, 31, 30, 0.06)',
        'warm-lg': '0 2px 4px rgba(61, 31, 30, 0.04), 0 24px 48px rgba(61, 31, 30, 0.10)',
        'warm-xl': '0 4px 8px rgba(61, 31, 30, 0.04), 0 40px 80px rgba(61, 31, 30, 0.14)',
        'glow-amber': '0 0 0 1px rgba(232, 133, 61, 0.10), 0 8px 32px rgba(232, 133, 61, 0.18)',
        'inset-warm': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, #FDF6EE 0%, #F5EBD9 100%)',
        'gradient-amber': 'linear-gradient(135deg, #E8853D 0%, #D4732A 100%)',
        'gradient-bronze': 'linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 600ms ease-out forwards',
        'fade-in-up': 'fadeInUp 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in-down': 'fadeInDown 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
