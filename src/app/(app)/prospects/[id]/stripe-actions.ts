'use server';

import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';
import { QUOTE_LINE_SELECT_COLUMNS, type QuoteLine } from '@/lib/finance';

/**
 * Server actions Stripe (Sprint 11) attachées a la fiche prospect.
 *
 * Deux flux client-payables a partir d'un devis interne :
 *   - createStripeInvoice      -> facture Stripe hostee (lignes HT + TVA),
 *                                 renvoie hosted_invoice_url.
 *   - createStripePaymentLink  -> Payment Link sur le total TTC, renvoie url.
 *
 * SECURITE : on charge le devis via le client SSR (RLS owner/admin). Si la RLS
 * masque le devis, maybeSingle() renvoie null -> on refuse AVANT tout appel
 * Stripe. La cle secrete reste server-only (lue par getStripe()).
 */

export type StripeActionResult = { url: string | null; error: string | null };

type QuoteRow = {
  id: string;
  prospect_id: string | null;
  numero: string | null;
  montant_ht: number;
  tva_rate: number;
  montant_ttc: number;
};

type ProspectRow = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
};

function stripeErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Erreur Stripe inconnue.';
}

/** Charge devis (RLS), ses lignes et son prospect. */
async function loadQuoteContext(quoteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifie.' as const };

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, prospect_id, numero, montant_ht, tva_rate, montant_ttc')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) return { error: 'Devis introuvable ou non autorise.' as const };

  const { data: lines } = await supabase
    .from('quote_lines')
    .select(QUOTE_LINE_SELECT_COLUMNS)
    .eq('quote_id', quoteId)
    .order('position', { ascending: true });

  let prospect: ProspectRow | null = null;
  const q = quote as unknown as QuoteRow;
  if (q.prospect_id) {
    const { data: p } = await supabase
      .from('prospects')
      .select(
        'id, company_name, contact_name, city, address, phone, stripe_customer_id'
      )
      .eq('id', q.prospect_id)
      .maybeSingle();
    prospect = (p ?? null) as unknown as ProspectRow | null;
  }

  return {
    supabase,
    quote: q,
    lines: (lines ?? []) as unknown as QuoteLine[],
    prospect,
  };
}

/** Recupere (ou cree puis persiste) le customer Stripe du prospect. */
async function ensureCustomerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stripe: Stripe,
  quote: QuoteRow,
  prospect: ProspectRow | null
): Promise<string> {
  if (prospect?.stripe_customer_id) return prospect.stripe_customer_id;

  const name =
    prospect?.company_name ||
    prospect?.contact_name ||
    quote.numero ||
    'Client GND';

  const customer = await stripe.customers.create({
    name,
    phone: prospect?.phone ?? undefined,
    address: prospect?.address
      ? { line1: prospect.address, city: prospect.city ?? undefined }
      : undefined,
    metadata: { prospect_id: prospect?.id ?? '', quote_id: quote.id },
  });

  if (prospect) {
    await supabase
      .from('prospects')
      .update({ stripe_customer_id: customer.id })
      .eq('id', prospect.id);
  }
  return customer.id;
}

/**
 * Cree une FACTURE Stripe hostee a partir du devis (lignes HT + TVA).
 * Renvoie l'URL hostee (hosted_invoice_url) a ouvrir / envoyer au client.
 */
export async function createStripeInvoice(
  quoteId: string
): Promise<StripeActionResult> {
  let ctx;
  try {
    ctx = await loadQuoteContext(quoteId);
  } catch (e) {
    return { url: null, error: stripeErr(e) };
  }
  if ('error' in ctx) return { url: null, error: ctx.error ?? 'Acces refuse.' };
  const { supabase, quote, lines, prospect } = ctx;

  try {
    const stripe = getStripe();
    const customerId = await ensureCustomerId(supabase, stripe, quote, prospect);

    const tvaRate = Number(quote.tva_rate) || 0;
    let taxRateId: string | null = null;
    if (tvaRate > 0) {
      const tr = await stripe.taxRates.create({
        display_name: 'TVA',
        percentage: tvaRate,
        inclusive: false,
        country: 'FR',
      });
      taxRateId = tr.id;
    }

    const items: QuoteLine[] =
      lines.length > 0
        ? lines
        : ([
            {
              designation: quote.numero || 'Prestation',
              total_ht: Number(quote.montant_ht) || 0,
            },
          ] as unknown as QuoteLine[]);

    let created = 0;
    for (const line of items) {
      const amount = Math.round((Number(line.total_ht) || 0) * 100);
      if (amount <= 0) continue;
      await stripe.invoiceItems.create({
        customer: customerId,
        currency: 'eur',
        amount,
        description: line.designation || 'Prestation',
        tax_rates: taxRateId ? [taxRateId] : undefined,
        metadata: { quote_id: quote.id },
      });
      created++;
    }
    if (created === 0) {
      return {
        url: null,
        error: 'Montant du devis nul — ajoute au moins une ligne chiffree.',
      };
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      auto_advance: false,
      description: `Devis ${quote.numero ?? ''}`.trim(),
      metadata: { quote_id: quote.id, prospect_id: quote.prospect_id ?? '' },
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const url = finalized.hosted_invoice_url ?? null;

    await supabase
      .from('quotes')
      .update({
        stripe_invoice_id: finalized.id,
        stripe_invoice_url: url,
        stripe_status: 'sent',
        statut: 'envoye',
      })
      .eq('id', quote.id);

    if (quote.prospect_id) revalidatePath(`/prospects/${quote.prospect_id}`);
    return { url, error: null };
  } catch (e) {
    return { url: null, error: stripeErr(e) };
  }
}

/**
 * Cree un LIEN DE PAIEMENT Stripe (Payment Link) sur le total TTC du devis.
 * Renvoie l'url du lien a partager au client.
 */
export async function createStripePaymentLink(
  quoteId: string
): Promise<StripeActionResult> {
  let ctx;
  try {
    ctx = await loadQuoteContext(quoteId);
  } catch (e) {
    return { url: null, error: stripeErr(e) };
  }
  if ('error' in ctx) return { url: null, error: ctx.error ?? 'Acces refuse.' };
  const { supabase, quote } = ctx;

  try {
    const stripe = getStripe();
    const amount = Math.round((Number(quote.montant_ttc) || 0) * 100);
    if (amount <= 0) {
      return {
        url: null,
        error: 'Montant du devis nul — ajoute au moins une ligne chiffree.',
      };
    }

    const price = await stripe.prices.create({
      currency: 'eur',
      unit_amount: amount,
      product_data: { name: `Prestation GND — ${quote.numero ?? 'devis'}` },
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { quote_id: quote.id, prospect_id: quote.prospect_id ?? '' },
    });

    await supabase
      .from('quotes')
      .update({
        stripe_payment_link_id: link.id,
        stripe_payment_link_url: link.url,
      })
      .eq('id', quote.id);

    if (quote.prospect_id) revalidatePath(`/prospects/${quote.prospect_id}`);
    return { url: link.url, error: null };
  } catch (e) {
    return { url: null, error: stripeErr(e) };
  }
}
