'use client';

import { useState } from 'react';
import { STATUT_OPTIONS, type ProspectStatut } from '@/lib/prospects';

export type ProspectFormValues = {
  nom: string;
  telephone: string;
  email: string;
  ville: string;
  statut: ProspectStatut;
  notes: string;
};

const EMPTY: ProspectFormValues = {
  nom: '',
  telephone: '',
  email: '',
  ville: '',
  statut: 'a_contacter',
  notes: '',
};

type ProspectModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProspectFormValues) => Promise<void> | void;
  initial?: Partial<ProspectFormValues>;
  title?: string;
  submitLabel?: string;
};

export default function ProspectModal({
  open,
  onClose,
  onSubmit,
  initial,
  title = 'Nouveau prospect',
  submitLabel = 'Enregistrer',
}: ProspectModalProps) {
  const [values, setValues] = useState<ProspectFormValues>({ ...EMPTY, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function update<K extends keyof ProspectFormValues>(
    key: K,
    value: ProspectFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.nom.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gnd-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-gnd-muted hover:text-gnd-primary"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label="Nom *">
            <input
              required
              value={values.nom}
              onChange={(e) => update('nom', e.target.value)}
              className="input"
              placeholder="Ex. Dupont SARL"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Téléphone">
              <input
                value={values.telephone}
                onChange={(e) => update('telephone', e.target.value)}
                className="input"
                placeholder="06 12 34 56 78"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={values.email}
                onChange={(e) => update('email', e.target.value)}
                className="input"
                placeholder="contact@exemple.fr"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ville">
              <input
                value={values.ville}
                onChange={(e) => update('ville', e.target.value)}
                className="input"
                placeholder="Paris"
              />
            </Field>
            <Field label="Statut">
              <select
                value={values.statut}
                onChange={(e) => update('statut', e.target.value as ProspectStatut)}
                className="input"
              >
                {STATUT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={4}
              value={values.notes}
              onChange={(e) => update('notes', e.target.value)}
              className="input"
              placeholder="Historique, contexte, à faire…"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Enregistrement…' : submitLabel}
            </button>
          </div>
        </form>

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid rgb(203 213 225);
            background: white;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            outline: none;
          }
          .input:focus {
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gnd-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
