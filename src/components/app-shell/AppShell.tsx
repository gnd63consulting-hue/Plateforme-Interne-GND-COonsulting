'use client';

import { useState } from 'react';
import AppSidebar, { type SidebarUser } from './AppSidebar';
import AppTopbar from './AppTopbar';

/**
 * AppShell — coquille SaaS cliente (Sprint 10).
 *
 * Orchestre l'état du drawer mobile entre le topbar (burger) et la sidebar.
 * Le layout serveur (`(app)/layout.tsx`) reste server-only (auth + fetch
 * profil) et délègue le rendu interactif ici. Le contenu de chaque page est
 * rendu dans un panneau crème ; les pages restent inchangées.
 */
export default function AppShell({
  user,
  isAdmin,
  children,
}: {
  user: SidebarUser;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <AppSidebar
        user={user}
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-[264px]">
        <AppTopbar
          user={user}
          isAdmin={isAdmin}
          onOpenMenu={() => setMobileOpen(true)}
        />

        <main className="px-4 pb-12 pt-5 md:px-6 lg:px-8">
          {/* Panneau de contenu arrondi posé sur le fond crème (réf Drive). */}
          <div className="mx-auto min-h-[calc(100vh-7rem)] max-w-screen-2xl rounded-3xl border border-border-soft/50 bg-surface-soft p-5 shadow-soft sm:p-7 lg:p-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
