import Stripe from 'stripe';

/**
 * Client Stripe — SERVER ONLY.
 *
 * Ne JAMAIS importer ce module depuis un composant client directement : il
 * lit la clé secrète. Il n'est importé que par des modules serveur (server
 * actions `'use server'`, route handlers). La clé vient de l'env Vercel
 * `STRIPE_SECRET_KEY` (mode test : `sk_test_...`).
 *
 * On omet volontairement `apiVersion` → le SDK utilise la version épinglée
 * par défaut du package installé (évite tout désaccord de type/littéral).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY manquant. Ajoute-le dans Vercel > Settings > ' +
        'Environment Variables (server-only, surtout PAS prefixe NEXT_PUBLIC_).'
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}
