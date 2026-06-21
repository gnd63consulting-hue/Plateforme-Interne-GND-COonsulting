import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Fraunces, Marcellus, Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import SmoothScroll from '@/components/SmoothScroll';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

/**
 * Sprint 10 — typographie de marque officielle (PALETTE OFFICIELLE VERROUILLÉE).
 * Titres = Marcellus, corps = Inter. Chargés via next/font/google (aucune
 * dépendance npm), exposés en variables CSS et appliqués au shell SaaS +
 * headings. Le legacy (Fraunces/Geist) reste branché pour les pages existantes.
 */
const marcellus = Marcellus({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marcellus',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * DS v3 (refonte premium juin 2026) — typographie à caractère pour le CRM.
 * `Space Grotesk` = grotesque géométrique distinctif pour labels/eyebrows UI
 * (remplace Inter générique sur le chrome). `JetBrains Mono` = chiffres
 * tabulaires des KPI/metrics (signal "produit designé", pas admin Bootstrap).
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-num',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GND Formation',
  description:
    "Espace de formation et suivi pour les commerciaux freelances de GND Consulting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} ${marcellus.variable} ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-on-surface antialiased">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
