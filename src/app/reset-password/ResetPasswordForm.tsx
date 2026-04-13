'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email requis.');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== 'undefined' ? window.location.origin : '');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${appUrl}/update-password` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-center">
        <p className="font-label text-sm font-semibold text-green-800">
          Email envoyé.
        </p>
        <p className="mt-2 text-xs text-green-700">
          Si l&apos;adresse <strong>{email}</strong> est rattachée à un compte,
          un lien de réinitialisation vient d&apos;être envoyé. Pense à vérifier
          tes spams.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block font-label text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="prenom.nom@email.fr"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Envoi…' : 'Envoyer le lien'}
      </button>

      {error && (
        <p className="rounded-lg border border-error/20 bg-error-container px-3 py-2 text-center text-xs text-on-error-container">
          {error}
        </p>
      )}
    </form>
  );
}
