'use client';

import { useState } from 'react';
import { STATUS_OPTIONS } from '@/lib/prospects';

export type ProspectFormValues = {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  sector: string;
  city: string;
  status: string;
  notes: string;
};

const EMPTY: ProspectFormValues = {
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  sector: '',
  city: '',
  status: 'a_contacter',
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
    if (!values.company_name.trim()) {
      setError("Le nom d'entreprise est obligatoire.");
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
          <h2 className="text-lg font-semibold text-ink-warm">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-warm hover:text-ink-warm"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label="Nom entreprise *">
            <input
              required
              value={values.company_name}
              onChange={(e) => update('company_name', e.target.value)}
              className="input"
              placeholder="Ex. Dupont SARL"
            />
          </Field>

          <Field label="Contact">
            <input
              value={values.contact_name}
              onChange={(e) => update('contact_name', e.target.value)}
              className="input"
              placeholder="Prénom Nom du décideur"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Téléphone">
              <input
                value={values.phone}
                onChange={(e) => update('phone', e.target.value)}
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
            <Field label="Site web">
              <input
                value={values.website}
                onChange={(e) => update('website', e.target.value)}
                className="input"
                placeholder="https://exemple.fr"
              />
            </Field>
            <Field label="Secteur">
              <input
                value={values.sector}
                onChange={(e) => update('sector', e.target.value)}
                className="input"
                placeholder="Restaurant, coiffeur…"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ville">
              <input
                value={values.city}
                onChange={(e) => update('city', e.target.value)}
                className="input"
                placeholder="Paris"
              />
            </Field>
            <Field label="Statut">
              <select
                value={values.status}
                onChange={(e) => update('status', e.target.value)}
                className="input"
              >
                {STATUS_OPTIONS.map((opt) => (
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-warm">
        {label}
      </span>
      {children}
    </label>
  );
}
