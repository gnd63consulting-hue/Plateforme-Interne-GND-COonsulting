import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GND Formation Commerciaux',
  description: 'Espace de formation et suivi pour les commerciaux freelances GND Consulting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
