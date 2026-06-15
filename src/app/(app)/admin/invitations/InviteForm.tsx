'use client';

import { useState, useTransition } from 'react';
import { createInvitation } from './actions';

type Role = 'freelance' | 'stagiaire' | 'admin_limited' | 'admin';

const ROLE_LABELS: Record<Role, string> = {
  freelance: 'Freelance (commercial)',
  stagiaire: 'Stagiaire (formation)',
  admin_limited: 'Admin Limited (accès large)',
  admin: 'Admin (accès complet)',
};

// Design System crème/orange — tokens locaux (suite admin claire).
const INK = '#2A2320';           // texte corps (ex CREAM)
const INK_SOFT = '#7B665C';      // texte secondaire (ex CREAM_SOFT)
const MONO = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: INK_SOFT,
  marginBottom: 8,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 11,
  background: '#FFFFFF',
  border: '1px solid #E2D5C3',
  color: INK,
  fontSize: 14,
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
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
      'Salut ! Tu es invité(e) sur la plateforme interne GND Consulting.',
      '',
      `1. Va sur : ${appUrl}`,
      '2. Clique sur « Se connecter avec Google »',
      `3. Connecte-toi avec CET email exact : ${invitedEmail}`,
      '',
      "⚠️ Si tu utilises un autre compte Google, l'accès sera refusé.",
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="prenom.nom@gmail.com"
          style={fieldStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          style={{ ...fieldStyle, cursor: 'pointer' }}
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r} style={{ background: '#FFFFFF', color: INK }}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: INK_SOFT, marginTop: 8 }}>
          Ajoute l&apos;email à la liste autorisée. La personne se connecte ensuite avec
          Google &mdash; aucun email n&apos;est envoyé automatiquement.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          alignSelf: 'flex-start',
          padding: '11px 22px',
          borderRadius: 999,
          border: 'none',
          background: isPending
            ? 'rgba(243,146,83,0.45)'
            : 'linear-gradient(135deg, #F39253, #D97A3D)',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          cursor: isPending ? 'not-allowed' : 'pointer',
          letterSpacing: '0.01em',
          boxShadow: isPending ? 'none' : '0 4px 16px rgba(243,146,83,0.30)',
        }}
      >
        {isPending ? 'Ajout…' : "Créer l'invitation"}
      </button>

      {error && (
        <p style={{ fontSize: 13, color: '#B5421F', margin: 0 }}>{error}</p>
      )}

      {invited && (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid rgba(79,122,56,0.30)',
            background: 'rgba(79,122,56,0.08)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#3F6B2D', margin: 0 }}>
            ✅ {invited.email} est maintenant autorisé(e).
          </p>
          <p style={{ fontSize: 12, color: INK_SOFT, margin: 0 }}>
            Copie ce message et envoie-le à la personne (WhatsApp, SMS, mail) :
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              margin: 0,
              borderRadius: 10,
              background: '#FBF7F2',
              border: '1px solid #E2D5C3',
              padding: 14,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: INK,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            {invited.message}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #E2D5C3',
              background: copied ? 'rgba(79,122,56,0.16)' : '#FFFFFF',
              color: INK,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copié ✓' : 'Copier le message'}
          </button>
        </div>
      )}
    </form>
  );
}
