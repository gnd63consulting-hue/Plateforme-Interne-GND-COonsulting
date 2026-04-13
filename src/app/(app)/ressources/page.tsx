import Link from 'next/link';

export default function RessourcesPage() {
  return (
    <div className="space-y-16">
      <header>
        <h1 className="mb-2 font-headline text-[36px] font-bold tracking-tight text-on-surface">
          Ressources commerciales
        </h1>
        <p className="max-w-2xl font-body text-on-surface-variant">
          Accède aux outils stratégiques et supports opérationnels pour piloter
          ta performance commerciale au sein de GND Consulting.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ---------- Contenu principal ---------- */}
        <section className="space-y-8 lg:col-span-8">
          {/* Argumentaire */}
          <div className="rounded-xl bg-surface-container-lowest p-8 shadow-sm ring-1 ring-outline-variant/10">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <span className="material-symbols-outlined">chat</span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Argumentaire clé
              </h2>
            </div>
            <ul className="space-y-4 font-body text-on-surface-variant">
              <ArgLi>
                <strong>Visibilité Google</strong> — 76% des recherches mobiles
                locales aboutissent à une visite dans la journée. Sans site, le
                commerçant est invisible.
              </ArgLi>
              <ArgLi>
                <strong>Zéro dépendance</strong> — le client est propriétaire
                du site et du nom de domaine. Pas d&apos;abonnement, pas de
                plateforme qui peut changer les règles.
              </ArgLi>
              <ArgLi>
                <strong>3 à 5 fois moins cher</strong> qu&apos;une agence
                classique, 2 à 3 fois plus rapide qu&apos;un freelance.
              </ArgLi>
              <ArgLi>
                <strong>1 à 2 semaines</strong> de délai de livraison contre 6
                à 16 semaines ailleurs.
              </ArgLi>
              <ArgLi>
                <strong>Paiement en 2 fois</strong> — 50% à la commande, 50% à
                la livraison. Aucun frais caché.
              </ArgLi>
            </ul>
          </div>

          {/* Do's & Don'ts */}
          <div className="overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-sm ring-1 ring-outline-variant/10">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-secondary">
                <span className="material-symbols-outlined">rule</span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Do&apos;s &amp; Don&apos;ts
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-outline-variant/20 md:grid-cols-2">
              <div className="bg-surface-container-lowest p-6">
                <div className="mb-4 flex items-center gap-2 font-bold text-primary">
                  <span className="material-symbols-outlined">task_alt</span>
                  <span>À privilégier</span>
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
                  <li>• Appel 1 court (2 min max) pour récupérer l&apos;email.</li>
                  <li>• Envoyer l&apos;Email 1 dans les 2 heures après l&apos;appel.</li>
                  <li>• Fixer un rendez-vous précis (date + heure).</li>
                  <li>• Montrer le site démo <em>O Papa Poulet</em>.</li>
                  <li>• Mettre à jour la fiche Notion le jour même.</li>
                </ul>
              </div>
              <div className="bg-surface-container-lowest p-6">
                <div className="mb-4 flex items-center gap-2 font-bold text-error">
                  <span className="material-symbols-outlined">cancel</span>
                  <span>À éviter</span>
                </div>
                <ul className="space-y-3 text-sm leading-relaxed text-on-surface-variant">
                  <li>• Donner un prix fixe avant qualification du besoin.</li>
                  <li>• Dire « Je ne vous dérange pas ? » en ouverture.</li>
                  <li>• Promettre des délais non validés par GND.</li>
                  <li>• Proposer une maquette personnalisée gratuite.</li>
                  <li>• Contacter un prospect « En cours » d&apos;un collègue.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className="rounded-xl bg-surface-container-lowest p-8 shadow-sm ring-1 ring-outline-variant/10">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant">
                <span className="material-symbols-outlined">folder_special</span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Scripts &amp; templates
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li>
                <strong className="text-on-surface">Script Appel 1</strong> —
                ouverture + accroche + qualification + engagement inversé (2 min).
                Détail dans le Module 03.
              </li>
              <li>
                <strong className="text-on-surface">Template Email 1</strong> —
                remerciement + lien site démo + rappel du rendez-vous.{' '}
                <em>(Lien à ajouter par la direction.)</em>
              </li>
              <li>
                <strong className="text-on-surface">Template Email relance</strong>{' '}
                — à envoyer 2-3 jours après si pas de retour.{' '}
                <em>(Lien à ajouter par la direction.)</em>
              </li>
              <li>
                <strong className="text-on-surface">Template déclaration contrat signé</strong>{' '}
                — email à <code>contact@gndconsulting.fr</code> avec les 5 infos
                obligatoires. Détail dans le Module 07.
              </li>
            </ul>
          </div>
        </section>

        {/* ---------- Sidebar ---------- */}
        <aside className="space-y-8 lg:col-span-4">
          <div className="rounded-xl border-l-4 border-primary bg-surface-container-low p-8">
            <h2 className="mb-6 font-headline text-xl font-bold text-on-surface">
              Contacts utiles
            </h2>
            <div className="space-y-5">
              <div>
                <p className="font-bold text-on-surface">Roodny Pierre</p>
                <p className="text-xs text-on-surface-variant">
                  Direction commerciale
                </p>
                <a
                  href="mailto:contact@gndconsulting.fr"
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  contact@gndconsulting.fr
                </a>
              </div>
              <div>
                <p className="font-bold text-on-surface">Production / livraison</p>
                <p className="text-xs text-on-surface-variant">
                  Via la direction commerciale
                </p>
              </div>
              <div>
                <p className="font-bold text-on-surface">Facturation / admin</p>
                <p className="text-xs text-on-surface-variant">
                  <code>contact@gndconsulting.fr</code>
                </p>
              </div>
            </div>
            <a
              href="mailto:contact@gndconsulting.fr"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-highest py-3 font-semibold text-primary transition-all hover:bg-primary-fixed"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              Contacter le support
            </a>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-primary-container p-6 text-on-primary-container">
            <div className="relative z-10">
              <h3 className="mb-2 font-headline text-lg font-bold">
                Besoin du script Appel 1 ?
              </h3>
              <p className="mb-4 text-sm opacity-90">
                Tout est dans le Module 03 — process de vente. Scénario A, scénario B, et les 6 étapes.
              </p>
              <Link
                href="/formation/module-03-process-vente"
                className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 text-xs font-bold text-primary hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[16px]">
                  menu_book
                </span>
                Ouvrir le module
              </Link>
            </div>
            <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[180px] opacity-10">
              folder_special
            </span>
          </div>
        </aside>
      </div>

      {/* ---------- Pricing Grid (prix réels GND) ---------- */}
      <section>
        <div className="mb-2 text-center lg:text-left">
          <h2 className="font-headline text-2xl font-bold text-on-surface">
            Grille tarifaire Sites Vitrines
          </h2>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            3 formules, paiement unique en 2 fois (50/50). Aucun abonnement.
            Propriété totale du site pour le client.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Essentiel */}
          <PricingCard
            name="Essentiel"
            price="800 €"
            features={[
              'Site vitrine 1 à 5 pages',
              'Design responsive mobile',
              'SEO local de base',
              'Bandeau cookies + mentions légales',
              '1ère année nom de domaine offerte',
            ]}
          />

          {/* Réservation — Recommandé */}
          <PricingCard
            name="Réservation"
            price="1 500 €"
            highlight
            features={[
              'Tout l\'Essentiel',
              'Formulaire de réservation / prise de RDV',
              'Intégration calendrier',
              'Emails de confirmation automatiques',
              'Google Maps inclus',
            ]}
          />

          {/* Pack Complet */}
          <PricingCard
            name="Pack Complet"
            price="2 500 €"
            features={[
              'Tout la Réservation',
              'Paiement en ligne via Stripe',
              'Formation client à l\'administration',
              'Google Analytics configuré',
              'Support prioritaire 30 jours',
            ]}
          />
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          + Option <strong>Google Maps</strong> à 50 € si non incluse dans la formule.
        </p>
      </section>
    </div>
  );
}

// ---------- Sous-composants ----------

function ArgLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="material-symbols-outlined text-primary shrink-0">
        check_circle
      </span>
      <span>{children}</span>
    </li>
  );
}

type PricingCardProps = {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
};

function PricingCard({ name, price, features, highlight }: PricingCardProps) {
  if (highlight) {
    return (
      <div className="relative flex h-full flex-col rounded-xl bg-surface-container-lowest p-8 shadow-xl ring-2 ring-primary md:scale-105 z-10">
        <div className="absolute right-8 top-0 -translate-y-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-on-primary">
          Recommandé
        </div>
        <div className="mb-8">
          <h3 className="mb-2 text-lg font-bold text-primary">{name}</h3>
          <div className="font-headline text-[28px] font-bold text-on-surface">
            {price}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">Paiement unique</p>
        </div>
        <ul className="mb-8 flex-grow space-y-4 font-body text-sm text-on-surface-variant">
          {features.map((f) => (
            <PricingFeature key={f}>{f}</PricingFeature>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl bg-surface-container-lowest p-8 ring-1 ring-outline-variant/10 transition-all hover:ring-primary/30">
      <div className="mb-8">
        <h3 className="mb-2 text-lg font-bold text-on-surface-variant">{name}</h3>
        <div className="font-headline text-[28px] font-bold text-on-surface">
          {price}
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">Paiement unique</p>
      </div>
      <ul className="mb-8 flex-grow space-y-4 font-body text-sm text-on-surface-variant">
        {features.map((f) => (
          <PricingFeature key={f}>{f}</PricingFeature>
        ))}
      </ul>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary shrink-0">
        check
      </span>
      <span>{children}</span>
    </li>
  );
}
