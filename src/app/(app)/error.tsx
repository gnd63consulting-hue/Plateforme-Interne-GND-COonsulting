'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Error boundary for every authenticated (app) route. Catches server
 * component errors (including MissingSupabaseEnvError thrown from
 * supabase-server.ts) and shows a helpful message instead of the
 * generic Next.js "Application error" digest screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app/error.tsx]', error);
  }, [error]);

  const isMissingEnv = error.message?.includes('NEXT_PUBLIC_SUPABASE_URL');

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-gnd-primary">
        {isMissingEnv ? 'Configuration incomplète' : 'Une erreur est survenue'}
      </h1>

      {isMissingEnv ? (
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <p>
            La plateforme n&apos;a pas encore ses variables d&apos;environnement
            Supabase. Sans elles, l&apos;application ne peut pas se connecter à
            la base de données.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Ouvre <strong>Vercel → Settings → Environment Variables</strong>
            </li>
            <li>
              Ajoute <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>
            </li>
            <li>
              Ajoute <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </li>
            <li>Redeploy le projet</li>
          </ol>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <p>
            {error.message || 'Erreur inconnue côté serveur.'}
          </p>
          {error.digest && (
            <p className="text-xs text-gnd-muted">
              Digest : <code className="rounded bg-slate-100 px-1">{error.digest}</code>
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={() => reset()} className="btn-primary">
          Réessayer
        </button>
        <Link href="/login" className="btn-secondary">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
