'use client';

import { Printer } from 'lucide-react';

/**
 * Bouton « Imprimer / PDF » (Sprint 8). Déclenche window.print() : le
 * navigateur ouvre le dialogue d'impression d'où l'on exporte en PDF.
 * Les éléments en `print:hidden` (barre d'actions) disparaissent à
 * l'impression — le CSS print est géré via les variantes Tailwind `print:`.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Imprimer / PDF
    </button>
  );
}
