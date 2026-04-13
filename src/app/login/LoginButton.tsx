'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

/**
 * Formulaire d'authentification hybride :
 *   - email / mot de passe (principal)
 *   - Google OAuth (secondaire)
 *
 * Les comptes sont créés par l'admin côté Supabase (pas d'auto-inscription).
 */
export default function LoginButton() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    setLoadingEmail(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : signInError.message
      );
      setLoadingEmail(false);
      return;
    }

    // Supabase a posé les cookies de session — on rafraîchit la route
    // pour que le middleware voie la session et que le redirect fonctionne.
    router.refresh();
    router.push('/formation');
  }

  async function handleGoogleLogin() {
    setLoadingGoogle(true);
    setError(null);
    const supabase = createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== 'undefined' ? window.location.origin : '');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoadingGoogle(false);
    }
    // Sur succès, la redirection OAuth prend le relais.
  }

  const busy = loadingEmail || loadingGoogle;

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block font-label text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            placeholder="prenom.nom@email.fr"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-label text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Mot de passe
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            placeholder="••••••••"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {loadingEmail ? 'Connexion…' : 'Se connecter'}
        </button>

        <div className="text-center">
          <Link
            href="/reset-password"
            className="text-xs font-medium text-on-surface-variant underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-outline-variant/30" />
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          ou
        </span>
        <span className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={busy}
        className="group flex w-full items-center justify-center gap-3 rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-3.5 transition-all duration-300 hover:border-primary/30 hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-50"
      >
        <GoogleIcon />
        <span className="font-label text-sm font-semibold text-on-surface">
          {loadingGoogle ? 'Redirection…' : 'Se connecter avec Google'}
        </span>
      </button>

      {error && (
        <p className="rounded-lg border border-error/20 bg-error-container px-3 py-2 text-center text-xs text-on-error-container">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11c-.22-.67-.35-1.39-.35-2.11s.13-1.44.35-2.11V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
