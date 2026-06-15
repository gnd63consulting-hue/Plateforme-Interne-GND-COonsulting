'use client';

/**
 * Section « Devis » de la fiche 360° (Sprint 8).
 *
 * - Liste des devis du prospect (numéro, statut, TTC, date).
 * - Éditeur de devis : lignes (désignation, qté, PU HT → total auto),
 *   taux TVA, totaux HT/TVA/TTC auto-recalculés, validité, notes, statut.
 * - Persistance via le client Supabase ANON (RLS owner : owner_id=auth.uid()).
 *   upsert quote + remplacement des quote_lines.
 * - Lien vers le devis imprimable (/prospects/[id]/devis/[quoteId]).
 *
 * "use client" : n'importe QUE depuis `@/lib/finance` (module pur) et
 * `@/lib/supabase-client` — jamais supabase-server.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  QUOTE_SELECT_COLUMNS,
  QUOTE_LINE_SELECT_COLUMNS,
  QUOTE_STATUT_OPTIONS,
  buildQuoteNumero,
  computeQuoteTotals,
  formatEurExact,
  labelForQuoteStatut,
  lineTotalHt,
  toneForQuoteStatut,
  type Quote,
  type QuoteLine,
  type QuoteWithLines,
} from '@/lib/finance';

/* ---------- helpers locaux ---------- */

type DraftLine = {
  key: string;
  designation: string;
  quantite: string;
  prix_unitaire_ht: string;
};

function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function newDraftLine(): DraftLine {
  return {
    key: `l_${Math.random().toString(36).slice(2, 9)}`,
    designation: '',
    quantite: '1',
    prix_unitaire_ht: '0',
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/* ====================================================================== */
/* Composant principal                                                     */
/* ====================================================================== */

export default function QuotesPanel({
  prospectId,
  initialQuotes,
}: {
  prospectId: string;
  initialQuotes: Quote[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [editing, setEditing] = useState<QuoteWithLines | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  /** Ouvre l'éditeur sur un nouveau devis (insère un brouillon vide). */
  const handleNew = useCallback(async () => {
    setError('');
    setOpening(true);
    const { data, error: insErr } = await supabase
      .from('quotes')
      .insert({ prospect_id: prospectId, statut: 'brouillon', tva_rate: 20 })
      .select(QUOTE_SELECT_COLUMNS)
      .single();
    setOpening(false);
    if (insErr || !data) {
      setError(`Création impossible : ${insErr?.message ?? 'erreur'}`);
      return;
    }
    const quote = data as unknown as Quote;
    // Pose un numéro lisible dérivé de l'id (best-effort).
    const numero = buildQuoteNumero(quote.id, quote.created_at);
    await supabase.from('quotes').update({ numero }).eq('id', quote.id);
    setQuotes((prev) => [{ ...quote, numero }, ...prev]);
    setEditing({ ...quote, numero, lines: [] });
  }, [supabase, prospectId]);

  /** Ouvre l'éditeur sur un devis existant (charge ses lignes). */
  const handleEdit = useCallback(
    async (quote: Quote) => {
      setError('');
      const { data } = await supabase
        .from('quote_lines')
        .select(QUOTE_LINE_SELECT_COLUMNS)
        .eq('quote_id', quote.id)
        .order('position', { ascending: true });
      setEditing({ ...quote, lines: (data ?? []) as unknown as QuoteLine[] });
    },
    [supabase]
  );

  /** Supprime un devis (cascade lignes côté BDD). */
  const handleDelete = useCallback(
    async (quoteId: string) => {
      setError('');
      const { error: delErr } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);
      if (delErr) {
        setError(`Suppression impossible : ${delErr.message}`);
        return;
      }
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      if (editing?.id === quoteId) setEditing(null);
    },
    [supabase, editing]
  );

  /** Callback de l'éditeur : remplace le devis dans la liste après save. */
  const handleSaved = useCallback((saved: Quote) => {
    setQuotes((prev) => prev.map((q) => (q.id === saved.id ? saved : q)));
  }, []);

  return (
    <section className="rounded-3xl border border-gnd-bronze/8 bg-gnd-paper p-6 shadow-warm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-px w-8 bg-gnd-amber" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-gnd-amber">
            Devis
          </h2>
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={opening}
          className="inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze px-3.5 py-2 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:opacity-50"
        >
          {opening ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Nouveau devis
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      {quotes.length === 0 ? (
        <p className="text-sm italic text-gnd-bronze-faded">
          Aucun devis pour ce prospect. Crée un devis pour chiffrer la
          prestation et l&apos;imprimer en PDF.
        </p>
      ) : (
        <ul className="space-y-2">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-gnd-bronze/8 bg-white p-3"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-gnd-amber-dim"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold text-gnd-bronze">
                  {q.numero ?? 'Devis'}
                </p>
                <p className="text-xs text-gnd-bronze-faded">
                  {fmtDate(q.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneForQuoteStatut(q.statut)}`}
              >
                {labelForQuoteStatut(q.statut)}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-gnd-bronze">
                {formatEurExact(q.montant_ttc)} TTC
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleEdit(q)}
                  className="rounded-lg border border-gnd-bronze/10 bg-white px-3 py-1.5 text-xs font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream"
                >
                  Éditer
                </button>
                <Link
                  href={`/prospects/${prospectId}/devis/${q.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-gnd-bronze/10 bg-white px-3 py-1.5 text-xs font-semibold text-gnd-bronze transition-colors hover:bg-gnd-cream"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  Imprimer
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(q.id)}
                  aria-label="Supprimer le devis"
                  className="rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <QuoteEditor
          key={editing.id}
          quote={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}

/* ====================================================================== */
/* Éditeur de devis (modale inline)                                        */
/* ====================================================================== */

function QuoteEditor({
  quote,
  onClose,
  onSaved,
}: {
  quote: QuoteWithLines;
  onClose: () => void;
  onSaved: (saved: Quote) => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [lines, setLines] = useState<DraftLine[]>(
    quote.lines.length > 0
      ? quote.lines.map((l) => ({
          key: l.id,
          designation: l.designation,
          quantite: String(l.quantite),
          prix_unitaire_ht: String(l.prix_unitaire_ht),
        }))
      : [newDraftLine()]
  );
  const [tvaRate, setTvaRate] = useState(String(quote.tva_rate ?? 20));
  const [statut, setStatut] = useState(quote.statut);
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? '');
  const [notes, setNotes] = useState(quote.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totals = useMemo(
    () =>
      computeQuoteTotals(
        lines.map((l) => ({
          designation: l.designation,
          quantite: num(l.quantite),
          prix_unitaire_ht: num(l.prix_unitaire_ht),
        })),
        num(tvaRate)
      ),
    [lines, tvaRate]
  );

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }
  function addLine() {
    setLines((prev) => [...prev, newDraftLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((l) => l.key !== key) : prev
    );
  }

  async function save() {
    setError('');
    setSaving(true);

    // 1. Update de l'en-tête (totaux recalculés côté client, source = finance.ts).
    const { data: updated, error: updErr } = await supabase
      .from('quotes')
      .update({
        statut,
        tva_rate: num(tvaRate),
        montant_ht: totals.montant_ht,
        montant_tva: totals.montant_tva,
        montant_ttc: totals.montant_ttc,
        valid_until: validUntil || null,
        notes: notes.trim() || null,
      })
      .eq('id', quote.id)
      .select(QUOTE_SELECT_COLUMNS)
      .single();

    if (updErr || !updated) {
      setSaving(false);
      setError(`Enregistrement impossible : ${updErr?.message ?? 'erreur'}`);
      return;
    }

    // 2. Remplace les lignes : on efface puis on réinsère (simple et fiable
    //    pour un usage interne à faible volume).
    await supabase.from('quote_lines').delete().eq('quote_id', quote.id);
    const cleanLines = lines
      .filter((l) => l.designation.trim() !== '')
      .map((l, i) => {
        const quantite = num(l.quantite);
        const prix = num(l.prix_unitaire_ht);
        return {
          quote_id: quote.id,
          position: i,
          designation: l.designation.trim(),
          quantite,
          prix_unitaire_ht: prix,
          total_ht: lineTotalHt({
            designation: l.designation,
            quantite,
            prix_unitaire_ht: prix,
          }),
        };
      });
    if (cleanLines.length > 0) {
      const { error: linesErr } = await supabase
        .from('quote_lines')
        .insert(cleanLines);
      if (linesErr) {
        setSaving(false);
        setError(`Lignes non enregistrées : ${linesErr.message}`);
        return;
      }
    }

    setSaving(false);
    onSaved(updated as unknown as Quote);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-gnd-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Éditeur de devis"
    >
      <div className="my-8 w-full max-w-2xl rounded-3xl border border-gnd-bronze/10 bg-gnd-paper p-6 shadow-warm-lg">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-xl font-medium text-gnd-bronze">
            {quote.numero ?? 'Devis'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-800"
          >
            {error}
          </p>
        )}

        {/* Lignes */}
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_4.5rem_6rem_6rem_2rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded sm:grid">
            <span>Désignation</span>
            <span className="text-right">Qté</span>
            <span className="text-right">PU HT</span>
            <span className="text-right">Total HT</span>
            <span />
          </div>
          {lines.map((l) => {
            const total = lineTotalHt({
              designation: l.designation,
              quantite: num(l.quantite),
              prix_unitaire_ht: num(l.prix_unitaire_ht),
            });
            return (
              <div
                key={l.key}
                className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_4.5rem_6rem_6rem_2rem] sm:items-center"
              >
                <input
                  value={l.designation}
                  onChange={(e) =>
                    updateLine(l.key, { designation: e.target.value })
                  }
                  placeholder="Prestation…"
                  aria-label="Désignation"
                  className="col-span-2 rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-1.5 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber sm:col-span-1"
                />
                <input
                  value={l.quantite}
                  onChange={(e) =>
                    updateLine(l.key, { quantite: e.target.value })
                  }
                  inputMode="decimal"
                  aria-label="Quantité"
                  className="rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
                />
                <input
                  value={l.prix_unitaire_ht}
                  onChange={(e) =>
                    updateLine(l.key, { prix_unitaire_ht: e.target.value })
                  }
                  inputMode="decimal"
                  aria-label="Prix unitaire HT"
                  className="rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-1.5 text-right text-sm tabular-nums text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
                />
                <span className="px-1 text-right text-sm font-semibold tabular-nums text-gnd-bronze">
                  {formatEurExact(total)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(l.key)}
                  aria-label="Retirer la ligne"
                  disabled={lines.length <= 1}
                  className="justify-self-end rounded-lg p-1.5 text-gnd-bronze-soft transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gnd-bronze/15 px-3 py-1.5 text-xs font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/[0.04] hover:text-gnd-bronze"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Ajouter une ligne
        </button>

        {/* Totaux + TVA */}
        <div className="mt-5 flex flex-col gap-3 border-t border-gnd-bronze/8 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
                Taux TVA (%)
              </span>
              <input
                value={tvaRate}
                onChange={(e) => setTvaRate(e.target.value)}
                inputMode="decimal"
                className="w-24 rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-1.5 text-sm tabular-nums text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
              />
            </label>
          </div>
          <div className="min-w-[12rem] space-y-1 text-sm">
            <div className="flex items-center justify-between gap-6">
              <span className="text-gnd-bronze-soft">Total HT</span>
              <span className="font-semibold tabular-nums text-gnd-bronze">
                {formatEurExact(totals.montant_ht)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-gnd-bronze-soft">
                TVA ({num(tvaRate)}%)
              </span>
              <span className="font-semibold tabular-nums text-gnd-bronze">
                {formatEurExact(totals.montant_tva)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-gnd-bronze/8 pt-1">
              <span className="font-semibold text-gnd-bronze">Total TTC</span>
              <span className="font-display text-lg font-semibold tabular-nums text-gnd-amber">
                {formatEurExact(totals.montant_ttc)}
              </span>
            </div>
          </div>
        </div>

        {/* Statut + validité + notes */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gnd-bronze/8 pt-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
              Statut du devis
            </span>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="w-full rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-2 text-sm font-semibold text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            >
              {QUOTE_STATUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
              Valable jusqu&apos;au
            </span>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gnd-bronze-faded">
              Notes / conditions
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions de paiement, périmètre, mentions…"
              className="w-full resize-y rounded-lg border border-gnd-bronze/10 bg-white px-2.5 py-2 text-sm text-gnd-bronze focus:border-gnd-amber focus:outline-none focus:ring-1 focus:ring-gnd-amber"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-gnd-bronze-soft transition-colors hover:bg-gnd-bronze/8 hover:text-gnd-bronze"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-colors hover:bg-gnd-ink disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            Enregistrer le devis
          </button>
        </div>
      </div>
    </div>
  );
}
