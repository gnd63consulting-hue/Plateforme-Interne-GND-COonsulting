'use client';

import { useState, useTransition } from 'react';
import { ExternalLink, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { requestMockup } from './site-brief-actions';
import { isBriefPending } from '@/lib/site-brief';
import type { MockupRow } from '@/lib/site-mockup';
import type { SiteBriefRow } from '@/lib/site-brief';

/**
 * Bouton "Generer une maquette" de la fiche prospect (Studio Phase 4).
 *
 * Etats :
 *  - une maquette existe -> lien "Voir la maquette" (preview_url, nouvel onglet)
 *    + petit "Regenerer" (re-demande un brief).
 *  - un brief est 'requested' (et pas de maquette) -> bouton desactive
 *    "Maquette en cours".
 *  - sinon -> "Generer une maquette" qui appelle l'action serveur requestMockup.
 *
 * Aucune generation cote client : l'action insere un site_brief 'requested',
 * c'est le watcher Studio cote VPS qui produit la maquette puis la maquette
 * apparait dans site_mockups (et donc ici au prochain rafraichissement).
 */
export default function GenerateMockupButton({
  prospectId,
  mockup,
  brief,
}: {
  prospectId: string;
  mockup: MockupRow | null;
  brief: SiteBriefRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Optimiste : si l'action reussit, on bascule l'UI en "en cours" sans attendre
  // le revalidate complet (le brief frais n'est pas encore relu).
  const [justRequested, setJustRequested] = useState(false);

  const pending = isBriefPending(brief?.status) || justRequested;

  function handleRequest() {
    setError(null);
    startTransition(async () => {
      const res = await requestMockup(prospectId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setJustRequested(true);
    });
  }

  // Cas 1 : une maquette existe deja.
  if (mockup?.preview_url) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={mockup.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-choco transition-colors hover:bg-brand-dark"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Voir la maquette
        </a>
        <button
          type="button"
          onClick={handleRequest}
          disabled={isPending || pending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft bg-white px-3 py-2.5 text-sm font-medium text-ink-warm transition-colors hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          {pending ? 'En cours' : 'Regenerer'}
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    );
  }

  // Cas 2 : un brief est en cours (requested) et pas encore de maquette.
  if (pending) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-border-soft bg-cream-deep px-4 py-2.5 text-sm font-semibold text-muted-warm"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Maquette en cours...
      </button>
    );
  }

  // Cas 3 : rien encore -> proposer la generation.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleRequest}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-choco transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Wand2 className="h-4 w-4" aria-hidden />
        )}
        Generer une maquette
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
