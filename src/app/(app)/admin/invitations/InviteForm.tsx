'use client';

import { useState, useTransition } from 'react';
import { createInvitation } from './actions';

type Role = 'freelance' | 'stagiaire' | 'admin_limited' | 'admin';

const ROLE_LABELS: Record<Role, string> = {
  freelance: 'Freelance (commercial)',
  stagiaire: 'Stagiaire (formation)',
  admin_limited: 'Admin Limited (acces large)',
  admin: 'Admin (acces complet)',
};

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('freelance');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; message: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  function buildMessage(invitedEmail: string): string {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== 'undefined' ? window.location.origin : '');
    return [
      'Salut ! Tu es invite(e) sur la plateforme interne GND Consulting.',
      '',
      `1. Va sur : ${appUrl}`,
      '2. Clique sur « Se connecter avec Google »',
      `3. Connecte-toi avec CET email exact : ${invitedEmail}`,
      '',
      "⚠️ Si tu utilises un autre compte Google, l'acces sera refuse.",
    ].join('\n');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInvited(null);
    setCopied(false);
    const target = email.toLowerCase().trim();
    startTransition(async () => {
      const result = await createInvitation(target, role);
      if (result.error) {
        setError(result.error);
      } else {
        setInvited({ email: target, message: buildMessage(target) });
        setEmail('');
      }
    });
  }

  async function handleCopy() {
    if (!invited) return;
    try {
      await navigator.clipboard.writeText(invited.message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="prenom.nom@gmail.com"
          className="w-full px-3 py-2 border rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full px-3 py-2 border rounded text-sm"
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Ajoute l&apos;email a la liste autorisee. La personne se connecte
          ensuite avec Google &mdash; aucun email n&apos;est envoye
          automatiquement.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Ajout…' : "Creer l'invitation"}
      </button>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {invited && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">
            &#9989; {invited.email} est maintenant autorise(e).
          </p>
          <p className="text-xs text-gray-600">
            Copie ce message et envoie-le a la personne (WhatsApp, SMS, mail) :
          </p>
          <pre className="whitespace-pre-wrap rounded bg-white border p-3 text-xs text-gray-800 font-sans">
            {invited.message}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs font-medium hover:bg-gray-700"
          >
            {copied ? 'Copie ✓' : 'Copier le message'}
          </button>
        </div>
      )}
    </form>
  );
}
