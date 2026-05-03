'use client';

import { useEffect, useState, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { markTotpEnabled } from '@/app/(app)/admin/invitations/actions';

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function Setup2faClient() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function enroll() {
      const supabase = getSupabaseClient();

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `GND Plateforme — ${new Date().toISOString()}`,
      });

      if (enrollError || !data) {
        setError(enrollError?.message ?? 'Erreur d\'enrollment TOTP');
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    }

    enroll();
  }, []);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);

    startTransition(async () => {
      const supabase = getSupabaseClient();

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError || !challenge) {
        setError(challengeError?.message ?? 'Erreur lors du challenge TOTP');
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        setError('Code invalide. Réessaie avec le code actuel de ton authenticator.');
        return;
      }

      // Marque totp_enabled = true côté DB
      const result = await markTotpEnabled();
      if (result.error) {
        setError(result.error);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    });
  }

  if (error && !qrCode) {
    return (
      <div className="text-red-700 text-sm">
        Erreur: {error}
      </div>
    );
  }

  if (!qrCode) {
    return <div className="text-sm text-gray-600">Génération du code QR…</div>;
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCode} alt="QR Code TOTP" className="w-48 h-48 border" />
        <p className="text-xs text-gray-500 mt-2">
          Scanne avec ton authenticator (Google Authenticator, Authy…)
        </p>
        {secret && (
          <details className="mt-2 text-xs text-gray-500">
            <summary className="cursor-pointer">Saisie manuelle ?</summary>
            <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
              {secret}
            </code>
          </details>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Code à 6 chiffres affiché par ton authenticator
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
          className="w-full px-3 py-2 border rounded text-center text-lg tracking-widest"
          placeholder="123456"
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isPending || code.length !== 6}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Vérification...' : 'Activer la 2FA'}
      </button>
    </form>
  );
}
