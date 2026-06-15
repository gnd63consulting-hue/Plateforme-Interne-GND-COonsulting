'use client';

import { useState } from 'react';
import AppSidebar, { type SidebarUser } from './AppSidebar';
import AppTopbar from './AppTopbar';

/**
 * AppShell — coquille SaaS cliente (Sprint 10, redesign réf Google Drive).
 *
 * Toute l'app est posée sur un FOND CRÈME teinté ; un GRAND PANNEAU BLANC aux
 * coins très arrondis (`rounded-[28px]`/`32px`) « flotte » au-dessus, avec une
 * marge crème visible tout autour (le fond déborde). Le panneau contient la
 * sidebar (à gauche, intégrée), le topbar (en haut) et le contenu scrollable.
 *
 * - Desktop : panneau plein écran, sidebar collée à gauche DANS le panneau,
 *   colonne droite = topbar sticky + zone de contenu qui scrolle.
 * - Mobile : la sidebar devient un drawer (géré dans AppSidebar) ; le panneau
 *   occupe toute la largeur.
 *
 * Le smooth-scroll global (Lenis) ne touche PAS aux conteneurs marqués
 * `data-lenis-prevent` : la zone de contenu et la nav de la sidebar scrollent
 * donc nativement à la molette.
 *
 * Le layout serveur (`(app)/layout.tsx`) reste server-only (auth + fetch
 * profil) et délègue le rendu interactif ici. Les pages restent inchangées.
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
    <div className="min-h-screen bg-cream bg-gradient-cream-app">
      {/* Marge crème visible autour du panneau (réf Drive). */}
      <div className="mx-auto h-screen max-w-[1680px] p-3 sm:p-4 lg:p-5">
        {/* GRAND PANNEAU BLANC arrondi — contient sidebar + topbar + contenu. */}
        <div className="flex h-full overflow-hidden rounded-[28px] border border-border-soft/60 bg-surface-soft shadow-soft-lg lg:rounded-[32px]">
          {/* Sidebar intégrée (desktop) + drawer (mobile) */}
          <AppSidebar
            user={user}
            isAdmin={isAdmin}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />

          {/* Colonne droite : topbar fin + contenu scrollable */}
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopbar
              user={user}
              isAdmin={isAdmin}
              onOpenMenu={() => setMobileOpen(true)}
            />

            {/* Zone de contenu : scroll natif (Lenis ignore data-lenis-prevent). */}
            <main
              data-lenis-prevent
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-10 pt-5 md:px-7 lg:px-9 lg:pt-7"
            >
              <div className="mx-auto w-full max-w-screen-xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
