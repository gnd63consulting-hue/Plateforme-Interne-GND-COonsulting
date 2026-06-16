import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Webhook Stripe (Sprint 11).
 *
 * POST /api/stripe/webhook — appele par Stripe a chaque event. Service-role
 * UNIQUEMENT (pas de session utilisateur dans un webhook).
 *
 * Securite : la signature `stripe-signature` est verifiee avec
 * STRIPE_WEBHOOK_SECRET via constructEvent (sur le corps BRUT, d'ou req.text()).
 * Toute requete non signee / mal signee est rejetee (400).
 *
 * Idempotence : on insere event.id dans public.stripe_events ; un doublon
 * (livraison rejouee par Stripe) tombe sur la PK -> ignore.
 *
 * Events traites : paiement d'une facture (invoice.paid /
 * invoice.payment_succeeded) et paiement via Payment Link
 * (checkout.session.completed). -> fulfillQuotePaid().
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Admin = ReturnType<typeof createAdminClient>;

/** Insere l'event ; renvoie true si 1re fois (a traiter), false si doublon. */
async function isFirstDelivery(
  admin: Admin,
  eventId: string,
  type: string
): Promise<boolean> {
  const { error } = await admin
    .from('stripe_events')
    .insert({ id: eventId, type });
  if (error) {
    // 23505 = violation de PK => deja traite. Toute autre erreur (table
    // absente, transitoire) : on continue quand meme pour ne pas perdre
    // l'event (Stripe ne rejoue pas apres un 200).
    const code = (error as { code?: string }).code;
    if (code === '23505') return false;
    return true;
  }
  return true;
}

/**
 * Marque un devis comme paye + cree/rafraichit la commission reelle.
 * Idempotent au niveau metier : si paid_at est deja pose, on ne refait rien.
 */
async function fulfillQuotePaid(admin: Admin, quoteId: string): Promise<void> {
  const { data: quote } = await admin
    .from('quotes')
    .select('id, prospect_id, montant_ht, paid_at')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote || quote.paid_at) return;

  const nowIso = new Date().toISOString();
  await admin
    .from('quotes')
    .update({ stripe_status: 'paid', statut: 'accepte', paid_at: nowIso })
    .eq('id', quoteId);

  const prospectId = quote.prospect_id as string | null;
  if (!prospectId) return;

  const baseAmount = Math.round((Number(quote.montant_ht) || 0) * 100) / 100;
  if (baseAmount <= 0) return;

  const { data: prospect } = await admin
    .from('prospects')
    .select('id, assigned_to, created_by')
    .eq('id', prospectId)
    .maybeSingle();
  if (!prospect) return;

  // deal_amount est isole dans prospect_finance (RLS admin-only, migration
  // 0021). On lit l'eventuel montant deja saisi pour ne pas l'ecraser.
  const { data: finance } = await admin
    .from('prospect_finance')
    .select('deal_amount')
    .eq('prospect_id', prospectId)
    .maybeSingle();

  // Pose deal_amount seulement s'il est absent (ne pas ecraser un montant saisi).
  if (finance?.deal_amount == null) {
    await admin.from('prospect_finance').upsert(
      {
        prospect_id: prospectId,
        deal_amount: baseAmount,
        updated_at: nowIso,
      },
      { onConflict: 'prospect_id' }
    );
  }

  const commercialId =
    (prospect.assigned_to as string | null) ?? (prospect.created_by as string);

  const { data: commercial } = await admin
    .from('users')
    .select('commission_rate')
    .eq('id', commercialId)
    .maybeSingle();
  const rate =
    commercial?.commission_rate != null ? Number(commercial.commission_rate) : 0;

  // Anti-doublon commission (meme regle que recordCommission).
  const { data: existing } = await admin
    .from('commissions')
    .select('id')
    .eq('prospect_id', prospectId)
    .neq('statut', 'annule')
    .maybeSingle();

  if (existing) {
    await admin
      .from('commissions')
      .update({ base_amount: baseAmount, rate, commercial_id: commercialId })
      .eq('id', existing.id);
  } else {
    await admin.from('commissions').insert({
      prospect_id: prospectId,
      commercial_id: commercialId,
      base_amount: baseAmount,
      rate,
      statut: 'a_payer',
    });
  }
}

async function quoteIdFromInvoice(
  admin: Admin,
  invoice: Stripe.Invoice
): Promise<string | null> {
  const metaId = invoice.metadata?.quote_id;
  if (metaId) return metaId;
  if (invoice.id) {
    const { data } = await admin
      .from('quotes')
      .select('id')
      .eq('stripe_invoice_id', invoice.id)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }
  return null;
}

async function quoteIdFromSession(
  admin: Admin,
  session: Stripe.Checkout.Session
): Promise<string | null> {
  const metaId = session.metadata?.quote_id;
  if (metaId) return metaId;
  const linkId = session.payment_link;
  if (typeof linkId === 'string') {
    const { data } = await admin
      .from('quotes')
      .select('id')
      .eq('stripe_payment_link_id', linkId)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET manquant cote serveur.' },
      { status: 500 }
    );
  }
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalide';
    return NextResponse.json(
      { error: `Signature invalide : ${msg}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  if (!(await isFirstDelivery(admin, event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const quoteId = await quoteIdFromInvoice(admin, invoice);
        if (quoteId) await fulfillQuotePaid(admin, quoteId);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          const quoteId = await quoteIdFromSession(admin, session);
          if (quoteId) await fulfillQuotePaid(admin, quoteId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
