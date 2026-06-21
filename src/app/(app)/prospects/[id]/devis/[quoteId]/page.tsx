import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';
import {
  QUOTE_SELECT_COLUMNS,
  QUOTE_LINE_SELECT_COLUMNS,
  formatEurExact,
  formatDateLong,
  labelForQuoteStatut,
  type Quote,
  type QuoteLine,
} from '@/lib/finance';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

/**
 * Devis imprimable — page A4 propre (Sprint 8).
 *
 * Charge le devis + ses lignes + le prospect via le client SSR (RLS owner :
 * le commercial ne voit que SES devis ; l'admin voit tout). Si introuvable
 * ou non autorisé → notFound().
 *
 * « Envoyer un devis » = le commercial imprime / exporte en PDF (window.print)
 * et l'envoie lui-même. Pas de lib externe, pas d'email automatisé.
 */
export default async function DevisPrintPage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id, quoteId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: quoteRow } = await supabase
    .from('quotes')
    .select(QUOTE_SELECT_COLUMNS)
    .eq('id', quoteId)
    .eq('prospect_id', id)
    .maybeSingle();
  if (!quoteRow) notFound();
  const quote = quoteRow as unknown as Quote;

  const [{ data: prospectRow }, { data: linesRaw }] = await Promise.all([
    supabase
      .from('prospects')
      .select(PROSPECT_SELECT_COLUMNS)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('quote_lines')
      .select(QUOTE_LINE_SELECT_COLUMNS)
      .eq('quote_id', quoteId)
      .order('position', { ascending: true }),
  ]);

  const prospect = (prospectRow as unknown as Prospect) ?? null;
  const lines = (linesRaw ?? []) as unknown as QuoteLine[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Barre d'actions (cachée à l'impression) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/prospects/${id}`}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(74,36,26,0.12)] bg-white px-4 py-2 text-sm font-semibold text-ink-warm transition-colors hover:bg-cream"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour à la fiche
        </Link>
        <PrintButton />
      </div>

      {/* Document A4 */}
      <article className="rounded-xl border border-[rgba(74,36,26,0.12)] bg-white p-10 text-gnd-ink shadow-warm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* En-tête GND */}
        <header className="mb-8 flex items-start justify-between border-b border-[rgba(74,36,26,0.12)] pb-6">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink-warm">
              GND <span className="italic text-brand">Consulting</span>
            </p>
            <p className="mt-1 text-xs text-[#6F5A50]">
              Studio créatif hybride · Sites web, identité &amp; contenu
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
              Devis
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-ink-warm">
              {quote.numero ?? '—'}
            </p>
            <p className="mt-1 text-xs text-[#6F5A50]">
              Émis le {formatDateLong(quote.created_at)}
            </p>
            <p className="mt-0.5 text-xs text-[#6F5A50]">
              Statut : {labelForQuoteStatut(quote.statut)}
            </p>
          </div>
        </header>

        {/* Destinataire */}
        <section className="mb-8">
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-warm">
            Destinataire
          </p>
          <p className="text-lg font-semibold text-ink-warm">
            {prospect?.company_name ?? '—'}
          </p>
          {prospect?.contact_name && (
            <p className="text-sm text-[#6F5A50]">
              {prospect.contact_name}
              {prospect.role_contact ? ` · ${prospect.role_contact}` : ''}
            </p>
          )}
          {(prospect?.address || prospect?.city) && (
            <p className="text-sm text-[#6F5A50]">
              {[prospect?.address, prospect?.city].filter(Boolean).join(', ')}
            </p>
          )}
          {prospect?.email && (
            <p className="text-sm text-[#6F5A50]">{prospect.email}</p>
          )}
        </section>

        {/* Tableau des lignes */}
        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[rgba(74,36,26,0.12)]/20 text-left">
              <th className="py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-warm">
                Désignation
              </th>
              <th className="py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-warm">
                Qté
              </th>
              <th className="py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-warm">
                PU HT
              </th>
              <th className="py-2 text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-warm">
                Total HT
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-sm italic text-muted-warm"
                >
                  Aucune ligne sur ce devis.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id} className="border-b border-[rgba(74,36,26,0.10)]">
                  <td className="py-2.5 pr-4 text-gnd-ink">{l.designation}</td>
                  <td className="py-2.5 text-right tabular-nums text-[#6F5A50]">
                    {l.quantite}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-[#6F5A50]">
                    {formatEurExact(l.prix_unitaire_ht)}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-gnd-ink">
                    {formatEurExact(l.total_ht)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mb-8 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6F5A50]">Total HT</span>
              <span className="font-semibold tabular-nums text-gnd-ink">
                {formatEurExact(quote.montant_ht)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6F5A50]">
                TVA ({quote.tva_rate}%)
              </span>
              <span className="font-semibold tabular-nums text-gnd-ink">
                {formatEurExact(quote.montant_tva)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-[rgba(74,36,26,0.12)]/20 pt-2">
              <span className="font-semibold text-ink-warm">Total TTC</span>
              <span className="font-display text-xl font-semibold tabular-nums text-brand">
                {formatEurExact(quote.montant_ttc)}
              </span>
            </div>
          </div>
        </div>

        {/* Mentions / notes */}
        <footer className="space-y-3 border-t border-[rgba(74,36,26,0.12)] pt-6 text-xs leading-relaxed text-[#6F5A50]">
          {quote.valid_until && (
            <p>
              <span className="font-semibold text-ink-warm">Validité :</span>{' '}
              devis valable jusqu&apos;au {formatDateLong(quote.valid_until)}.
            </p>
          )}
          {quote.notes && (
            <p className="whitespace-pre-wrap">
              <span className="font-semibold text-ink-warm">Conditions :</span>{' '}
              {quote.notes}
            </p>
          )}
          <p>
            Montants en euros. TVA non applicable, art. 293 B du CGI le cas
            échéant. Bon pour accord : date et signature du client.
          </p>
        </footer>
      </article>
    </div>
  );
}
