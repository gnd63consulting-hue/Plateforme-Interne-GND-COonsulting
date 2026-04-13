'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function UpdatePasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    // L'utilisateur arrive via le lien email — Supabase a déjà posé la session
    // à partir du token présent dans l'URL (callback OAuth-like natif).
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        updateError.message.includes('session')
          ? 'Lien expiré ou invalide. Redemande un nouveau lien de réinitialisation.'
          : updateError.message
      );
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    // Redirection après 1.5 s pour laisser le message s'afficher.
    setTimeout(() => {
      router.push('/formation');
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-center">
        <p className="font-label text-sm font-semibold text-green-800">
          Mot de passe mis à jour.
        </p>
        <p className="mt-2 text-xs text-green-700">
          Redirection vers ta formation…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block font-label text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Nouveau mot de passe
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="Au moins 8 caractères"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-label text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Confirmation
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
          placeholder="Répète le mot de passe"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
      </button>

      {error && (
        <p className="rounded-lg border border-error/20 bg-error-container px-3 py-2 text-center text-xs text-on-error-container">
          {error}
        </p>
      )}
    </form>
  );
}
