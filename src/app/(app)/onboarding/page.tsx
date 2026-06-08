import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { OnboardingChecklist } from './OnboardingChecklist';

export const dynamic = 'force-dynamic';

const CONTACT_EMAIL = 'contact@gndconsulting.fr';

/** Paliers bonus officiels (commerciaux 20%) — sur 3 mois. */
const BONUS_TIERS = [
  { contrats: 20, bonus: 250 },
  { contrats: 25, bonus: 500 },
  { contrats: 30, bonus: 750 },
];

function Section({
  title,
  emoji,
  children,
  className = '',
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        'rounded-3xl border border-gnd-bronze/10 bg-white/70 p-7 shadow-warm backdrop-blur-sm ' +
        className
      }
    >
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-medium text-gnd-bronze">
        <span aria-hidden className="text-xl">
          {emoji}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, role, commission_rate')
    .eq('id', user.id)
    .maybeSingle();

  const { count: prospectCount } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', user.id);

  const prenom =
    (profile?.full_name ?? user.email?.split('@')[0] ?? '').split(/[\s.]+/)[0] ||
    'à toi';
  const commissionPct =
    profile?.commission_rate != null
      ? Math.round(Number(profile.commission_rate) * 100)
      : null;
  const nbProspects = prospectCount ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero */}
      <header className="mb-8">
        <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
          Onboarding commercial
        </p>
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-gnd-bronze md:text-5xl">
          Bienvenue chez GND, <span className="italic text-gnd-amber">{prenom}</span>.
        </h1>
        <p className="mt-3 max-w-xl text-gnd-bronze-soft">
          Tout ce dont tu as besoin pour démarrer : ton espace, tes prospects, ta
          rémunération.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {commissionPct != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gnd-amber/25 bg-gnd-amber/10 px-3.5 py-1.5 text-sm font-semibold text-gnd-amber">
              Commission&nbsp;: {commissionPct}%
            </span>
          )}
          <Link
            href="/prospects"
            className="inline-flex items-center gap-1.5 rounded-full border border-gnd-bronze/15 bg-white px-3.5 py-1.5 text-sm font-medium text-gnd-bronze transition-all hover:border-gnd-bronze/30 hover:shadow-warm"
          >
            {nbProspects} prospect{nbProspects > 1 ? 's' : ''} assigné
            {nbProspects > 1 ? 's' : ''} →
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Premiers pas — checklist */}
        <Section emoji="🚀" title="Tes premiers pas" className="md:col-span-2">
          <OnboardingChecklist storageKey={`gnd-onboarding-${user.id}`} />
        </Section>

        {/* Rémunération */}
        <Section emoji="💰" title="Ta rémunération">
          <ul className="space-y-2 text-sm text-gnd-bronze">
            <li>
              <strong>Ta commission : {commissionPct ?? '—'}%</strong> par contrat
              signé.
            </li>
            <li>
              <strong>Paiement</strong> : 15 jours après encaissement total du
              client.
            </li>
            <li className="text-gnd-bronze-soft">
              Process : acompte 50% → livraison → solde 50% → tu factures → payé
              sous 15 j.
            </li>
          </ul>
          <div className="mt-4 rounded-2xl bg-gnd-cream/60 p-4">
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber">
              Paliers bonus (sur 3 mois)
            </p>
            <div className="flex flex-wrap gap-2">
              {BONUS_TIERS.map((t) => (
                <span
                  key={t.contrats}
                  className="rounded-full border border-gnd-bronze/12 bg-white px-3 py-1 text-xs font-medium text-gnd-bronze"
                >
                  {t.contrats} contrats → <strong>{t.bonus}€</strong>
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* Process de vente */}
        <Section emoji="🎯" title="Process de vente — tu gères de A à Z">
          <ol className="space-y-1.5 text-sm text-gnd-bronze">
            <li>1. Tu prospectes sur ta zone / liste attribuée</li>
            <li>2. Tu qualifies (besoin, budget, décideur)</li>
            <li>3. Tu présentes l&apos;offre adaptée</li>
            <li>4. Tu closes et fais signer le devis</li>
            <li>5. Tu transmets les infos par email</li>
          </ol>
          <p className="mt-3 text-xs text-gnd-bronze-soft">
            Blocage majeur uniquement → tu me contactes, on voit ensemble.
          </p>
        </Section>

        {/* Communication */}
        <Section emoji="📞" title="Communication">
          <ul className="space-y-2 text-sm text-gnd-bronze">
            <li>
              Questions rapides / informel → <strong>WhatsApp</strong>
            </li>
            <li>
              Infos clients (nom, formule, montant) → <strong>Email</strong>
            </li>
            <li>
              Déclarer un contrat signé → <strong>Email</strong>
            </li>
            <li>
              Facturation &amp; commissions → <strong>Email</strong>
            </li>
          </ul>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-3 inline-block text-sm font-semibold text-gnd-amber underline decoration-gnd-amber/30 underline-offset-4 hover:decoration-gnd-amber"
          >
            {CONTACT_EMAIL}
          </a>
        </Section>

        {/* Déclarer un contrat */}
        <Section emoji="✅" title="Déclarer un contrat signé">
          <p className="mb-2 text-sm text-gnd-bronze-soft">
            Par email à {CONTACT_EMAIL}, avec :
          </p>
          <ul className="space-y-1 text-sm text-gnd-bronze">
            <li>• Nom du commerce</li>
            <li>• Contact : nom + téléphone + email</li>
            <li>• Formule (Essentiel / Réservation / Pack Complet)</li>
            <li>• Montant signé</li>
            <li>
              • <strong>Devis signé en pièce jointe</strong>
            </li>
          </ul>
        </Section>

        {/* Suivi */}
        <Section emoji="👁️" title="Ton suivi">
          <p className="text-sm text-gnd-bronze">
            Suis chaque deal en temps réel : formule, montant, acompte 50%,
            livraison, solde, <strong>commission due</strong> et statut de
            paiement. Transparence totale.
          </p>
          <Link
            href="/prospects"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gnd-amber hover:underline"
          >
            Ouvrir mon Carnet de bord →
          </Link>
        </Section>

        {/* Règles d'or */}
        <Section emoji="🚫" title="Règles d'or">
          <ol className="space-y-1.5 text-sm text-gnd-bronze">
            <li>
              1. <strong>Confidentialité</strong> — tarifs, marges et méthodes
              restent confidentiels.
            </li>
            <li>
              2. <strong>Pas de doublon</strong> — uniquement ta zone / liste
              attribuée.
            </li>
            <li>
              3. Interdit d&apos;appeler un prospect marqué « En cours » par un
              autre.
            </li>
            <li>
              4. <strong>Autonomie</strong> — tu gères ton emploi du temps.
            </li>
          </ol>
        </Section>

        {/* Ressources */}
        <Section emoji="📂" title="Tes ressources" className="md:col-span-2">
          <p className="mb-3 text-sm text-gnd-bronze-soft">
            Scripts d&apos;appel, templates emails, grille tarifaire, site démo,
            et les documents de closing (CGV, Brief Client, FAQ, Process de
            Livraison).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/ressources"
              className="rounded-full bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-all hover:opacity-90"
            >
              Sales toolkit →
            </Link>
            <Link
              href="/formation"
              className="rounded-full border border-gnd-bronze/15 bg-white px-4 py-2 text-sm font-semibold text-gnd-bronze transition-all hover:border-gnd-bronze/30 hover:shadow-warm"
            >
              Formation (7 modules) →
            </Link>
          </div>
        </Section>
      </div>

      <p className="mt-8 text-center text-xs text-gnd-bronze-soft">
        Des questions ? → WhatsApp · Infos clients / facturation ? → Email
      </p>
    </div>
  );
}
