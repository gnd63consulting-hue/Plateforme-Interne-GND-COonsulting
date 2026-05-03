'use client';

import { useState, useTransition } from 'react';
import { createInvitation } from './actions';

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'freelance' | 'admin_limited' | 'admin'>('freelance');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createInvitation(email, role);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: `Invitation envoyée à ${email}.` });
        setEmail('');
      }
    });
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
        <label className="block text-sm font-medium mb-1">Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="w-full px-3 py-2 border rounded text-sm"
        >
          <option value="freelance">Freelance (commercial)</option>
          <option value="admin_limited">Admin Limited (accès large)</option>
          <option value="admin">Admin (accès complet)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          La personne recevra un email Supabase pour activer son compte.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Envoi...' : "Envoyer l'invitation"}
      </button>

      {message && (
        <p
          className={`text-sm ${
            message.type === 'success' ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
