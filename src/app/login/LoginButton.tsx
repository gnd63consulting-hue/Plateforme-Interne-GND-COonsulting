'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

const ERROR_MESSAGES: Record<
  string,
  { title: string; description: string }
> = {
  not_invited: {
    title: 'Email non autorisé',
    description:
      "Cet email ne fait pas partie de la liste des membres invités. Demande une invitation à un administrateur de la plateforme.",
  },
  auth_failed: {
    title: 'Authentification interrompue',
    description:
      "Une erreur est survenue côté Google ou Supabase. Réessaie dans quelques secondes.",
  },
};

export default function LoginButton() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const errorContent = errorParam ? ERROR_MESSAGES[errorParam] : null;

  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setClientError(null);
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
      setClientError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <motion.button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-gnd-bronze/12 bg-white px-6 py-4 shadow-warm transition-all duration-300 hover:border-gnd-bronze/25 hover:shadow-warm-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* Subtle warm gradient on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gnd-amber/0 via-gnd-amber/5 to-gnd-amber/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <GoogleIcon />
        <span className="relative font-sans text-base font-semibold text-gnd-bronze">
          {loading ? 'Redirection…' : 'Se connecter avec Google'}
        </span>
      </motion.button>

      <AnimatePresence>
        {(errorContent || clientError) && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="flex gap-3 rounded-2xl border border-gnd-amber/25 bg-gnd-amber-pale/40 p-4"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-gnd-amber-dim"
              aria-hidden
            />
            <div className="flex-1">
              {errorContent ? (
                <>
                  <p className="text-sm font-semibold text-gnd-bronze">
                    {errorContent.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gnd-bronze-soft">
                    {errorContent.description}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gnd-bronze-soft">{clientError}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="relative h-5 w-5"
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
