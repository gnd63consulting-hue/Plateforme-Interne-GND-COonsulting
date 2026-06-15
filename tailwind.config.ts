import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

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
 *
 * --- Sprint 10 (juin 2026) : couche « Brand » officielle -------------------
 * On ajoute une couche SÉMANTIQUE alignée sur la PALETTE OFFICIELLE VERROUILLÉE
 * (9 juin 2026, ancrée sur le logo) : orange `#F39253`, chocolat `#532418`,
 * crème, beige `#E2D5C3`, charbon chaud. Ces tokens (`brand`, `brand-dark`,
 * `cream`, `surface-soft`, `border-soft`, `ink-warm`, `muted-warm`, `choco`)
 * pilotent le NOUVEAU shell SaaS (sidebar + topbar) et la page « Mon tableau ».
 * AUCUN token existant n'est retiré (les anciens `gnd-*` restent utilisés
 * ailleurs).
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
        gnd: {
          primary: '#0F172A',
          accent: '#F59E0B',
          muted: '#64748B',
          bg: '#F8FAFC',
        },

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

        /* === Sprint 10 — Brand layer (PALETTE OFFICIELLE VERROUILLÉE) ======
           Source de vérité couleurs ancrée logo. Orange #F39253 = primaire
           unique ; chocolat #532418 = touches/titres ; crème + beige neutres.
           Tokens sémantiques pilotant le shell SaaS + « Mon tableau ». */
        brand: {
          DEFAULT: '#F39253', // orange officiel (point du logo)
          dark: '#E07E3C', // hover / pressed
          soft: '#FBE6D5', // surface teintée douce (états actifs sidebar)
          pale: '#FDF2E9', // halo très clair
          ring: 'rgba(243, 146, 83, 0.35)', // focus ring
        },
        'brand-dark': '#E07E3C',
        choco: {
          DEFAULT: '#532418', // chocolat monogramme (titres accentués)
          soft: '#7D3E2C', // marron — détails
        },
        cream: {
          DEFAULT: '#FBF7F1', // fond crème app
          deep: '#F7EFE4', // crème plus marqué (rails)
        },
        'surface-soft': '#FFFFFF', // cartes blanches
        'border-soft': '#E2D5C3', // beige bordure officielle
        'ink-warm': '#2A2320', // texte charbon chaud (corps/titres)
        'muted-warm': '#8A7E73', // texte secondaire gris chaud
      },
      fontFamily: {
        headline: ['Epilogue', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        /* Sprint 10 — typo de marque officielle */
        marcellus: ['var(--font-marcellus)', 'Marcellus', 'Georgia', 'serif'],
        inter: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
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
        /* Sprint 10 — rail/pill radius for the SaaS shell */
        '4xl': '2.5rem',
        full: '9999px',
      },
      boxShadow: {
        editorial: '0 32px 64px -12px rgba(28, 27, 27, 0.08)',
        warm: '0 1px 2px rgba(61, 31, 30, 0.04), 0 8px 24px rgba(61, 31, 30, 0.06)',
        'warm-lg': '0 2px 4px rgba(61, 31, 30, 0.04), 0 24px 48px rgba(61, 31, 30, 0.10)',
        'warm-xl': '0 4px 8px rgba(61, 31, 30, 0.04), 0 40px 80px rgba(61, 31, 30, 0.14)',
        'glow-amber': '0 0 0 1px rgba(232, 133, 61, 0.10), 0 8px 32px rgba(232, 133, 61, 0.18)',
        'inset-warm': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        /* Sprint 10 — soft brand shadows for cards/shell (douces, premium) */
        soft: '0 1px 2px rgba(83, 36, 24, 0.04), 0 6px 20px rgba(83, 36, 24, 0.05)',
        'soft-md': '0 2px 6px rgba(83, 36, 24, 0.05), 0 14px 36px rgba(83, 36, 24, 0.07)',
        'soft-lg': '0 4px 10px rgba(83, 36, 24, 0.05), 0 28px 60px rgba(83, 36, 24, 0.10)',
        'brand-glow': '0 8px 24px rgba(243, 146, 83, 0.28)',
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, #FDF6EE 0%, #F5EBD9 100%)',
        'gradient-amber': 'linear-gradient(135deg, #E8853D 0%, #D4732A 100%)',
        'gradient-bronze': 'linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)',
        /* Sprint 10 — on-brand gradients (orange + crème, jamais violet/vert) */
        'gradient-brand': 'linear-gradient(135deg, #F39253 0%, #E07E3C 100%)',
        'gradient-brand-soft': 'linear-gradient(160deg, #FBE6D5 0%, #FDF2E9 100%)',
        'gradient-cream': 'linear-gradient(180deg, #FFFFFF 0%, #FBF7F1 100%)',
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
      typography: () => ({
        gnd: {
          css: {
            '--tw-prose-body': '#3D1F1E',
            '--tw-prose-headings': '#1A0F0E',
            '--tw-prose-lead': '#5C3A38',
            '--tw-prose-links': '#D4732A',
            '--tw-prose-bold': '#D4732A',
            '--tw-prose-counters': '#8A6D6B',
            '--tw-prose-bullets': '#E8853D',
            '--tw-prose-hr': 'rgba(61, 31, 30, 0.1)',
            '--tw-prose-quotes': '#3D1F1E',
            '--tw-prose-quote-borders': '#E8853D',
            '--tw-prose-captions': '#8A6D6B',
            '--tw-prose-code': '#3D1F1E',
            '--tw-prose-pre-code': '#FDF6EE',
            '--tw-prose-pre-bg': '#3D1F1E',
            '--tw-prose-th-borders': 'rgba(61, 31, 30, 0.15)',
            '--tw-prose-td-borders': 'rgba(61, 31, 30, 0.08)',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            h1: {
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: '500',
              letterSpacing: '-0.02em',
            },
            h2: {
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: '500',
              letterSpacing: '-0.015em',
              marginTop: '2.5em',
              marginBottom: '0.8em',
            },
            h3: {
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: '500',
              letterSpacing: '-0.01em',
              marginTop: '2em',
              marginBottom: '0.6em',
            },
            'h2 + p, h3 + p': {
              marginTop: '0.5em',
            },
            strong: {
              color: '#D4732A',
              fontWeight: '600',
            },
            'a': {
              textDecoration: 'underline',
              textDecorationColor: 'rgba(232, 133, 61, 0.4)',
              textUnderlineOffset: '4px',
              transition: 'all 200ms',
            },
            'a:hover': {
              textDecorationColor: '#E8853D',
            },
            'ul > li::marker': {
              color: '#E8853D',
              fontWeight: '700',
            },
            blockquote: {
              borderLeftWidth: '3px',
              fontStyle: 'normal',
              fontWeight: '500',
              backgroundColor: 'rgba(232, 133, 61, 0.05)',
              padding: '1em 1.25em',
              borderRadius: '0 0.75rem 0.75rem 0',
            },
            'blockquote p:first-of-type::before': { content: 'none' },
            'blockquote p:last-of-type::after': { content: 'none' },
            code: {
              backgroundColor: 'rgba(61, 31, 30, 0.06)',
              padding: '0.15em 0.4em',
              borderRadius: '0.3rem',
              fontWeight: '500',
              fontSize: '0.9em',
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            table: {
              fontSize: '0.95em',
              borderRadius: '1rem',
              overflow: 'hidden',
              border: '1px solid rgba(61, 31, 30, 0.1)',
            },
            thead: {
              backgroundColor: '#FDF6EE',
              borderBottomWidth: '1px',
              borderBottomColor: 'rgba(61, 31, 30, 0.15)',
            },
            'thead th': {
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: '600',
              color: '#3D1F1E',
              textTransform: 'none',
              letterSpacing: '0',
              padding: '0.75em 1em',
            },
            'tbody td': {
              padding: '0.75em 1em',
            },
            'tbody tr': {
              borderBottomColor: 'rgba(61, 31, 30, 0.06)',
            },
            hr: {
              marginTop: '3em',
              marginBottom: '3em',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
