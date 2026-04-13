import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-body text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
