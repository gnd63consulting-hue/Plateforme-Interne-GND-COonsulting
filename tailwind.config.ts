import type { Config } from 'tailwindcss';

/**
 * GND Formation — Academic Atelier design system (avril 2026).
 *
 * Deux namespaces cohabitent :
 * - `gnd-*` (legacy) : encore utilisé sur /prospects, /admin, /dashboard
 *   et quelques composants. À retirer progressivement.
 * - Tokens DS `primary`, `surface`, `on-surface`, etc. : base du nouveau
 *   design. Voir https://m3.material.io/styles/color/system pour la
 *   sémantique.
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

        // Academic Atelier — M3-style tokens
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
      },
      fontFamily: {
        headline: ['Epilogue', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        editorial: '0 32px 64px -12px rgba(28, 27, 27, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
