'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

/**
 * PricingPacks — grille tarifaire « verre dépoli en couches » sur la charte GND.
 *
 * Reprend l'esprit du composant pricing glassy (cadre + panneaux internes
 * floutés + lisérés ring inset + badge), adapté à l'offre réelle : 3 packs,
 * €, FR, palette verrouillée (crème/orange — jamais de noir/$). Pas de bouton
 * « Book a call », pas de toggle.
 */

type Pack = {
  num: string;
  name: string;
  priceLabel: string;
  highlight?: boolean;
  forWho: string;
  why: string;
  features: string[];
};

const PACKS: Pack[] = [
  {
    num: '01',
    name: 'Vitrine Essentiel',
    priceLabel: '800',
    forWho:
      'Restaurateur de quartier, coiffeur, petit institut de beauté, artisan qui démarre, vidéaste vitrine simple, coach indépendant.',
    why: "Solution clé en main pour les commerces qui n'ont pas encore de présence en ligne. Mise en place rapide, prix accessible.",
    features: [
      'Site vitrine 3 à 5 pages',
      'Présentation activité, coordonnées, formulaire de contact',
      'Intégration Google Maps',
      'Design responsive mobile et desktop',
      'Hébergement et nom de domaine 1ère année inclus',
      'Optimisation des performances et de la vitesse',
      'Formation rapide à la prise en main',
    ],
  },
  {
    num: '02',
    name: 'Vitrine + Réservation',
    priceLabel: '1 200 – 1 500',
    highlight: true,
    forWho:
      "Restaurateur ambitieux, coach sportif, institut bien établi, vidéaste mariage, professions qui ont besoin d'un agenda en ligne.",
    why: 'Vous transformez vos visiteurs en clients directement réservés depuis le site. Plus de coups de fil pour les rendez-vous.',
    features: [
      'Tout ce qui est dans Vitrine Essentiel',
      'Module de réservation en ligne intégré (rendez-vous ou tables)',
      'Galerie photo professionnelle',
      'Page menu / prestations détaillées',
      'Optimisation SEO local de base',
      'Notifications automatiques par email',
      'Tableau de bord pour gérer vos disponibilités',
    ],
  },
  {
    num: '03',
    name: 'Pack Complet',
    priceLabel: '2 500 +',
    forWho:
      'PME locale structurée, artisan ambitieux, commerce multi-sites, professionnel établi qui veut piloter sa visibilité.',
    why: "Vous prenez le contrôle de votre référencement local et de vos performances. Le site devient un vrai levier business.",
    features: [
      'Tout ce qui est dans Vitrine + Réservation',
      'SEO avancé multi-pages + Google My Business optimisé',
      'Intégrations sur-mesure (CRM, paiement, calendar, mailing)',
      'Module e-commerce léger si pertinent',
      'Suivi analytics et tableau de bord performance',
      'Pages enrichies (blog, FAQ, témoignages clients)',
      'Accompagnement éditorial pour le lancement',
    ],
  },
];

export default function PricingPacks() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
      {PACKS.map((p, i) => (
        <GlassPackCard key={p.name} pack={p} index={i} />
      ))}
    </div>
  );
}

function GlassPackCard({ pack, index }: { pack: Pack; index: number }) {
  const { num, name, priceLabel, highlight, forWho, why, features } = pack;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'group relative flex h-full flex-col rounded-[28px] p-2 backdrop-blur-md transition-all',
        highlight
          ? 'border-2 border-brand bg-white/70 shadow-soft-lg ring-1 ring-inset ring-white/50 lg:z-10 lg:scale-[1.03]'
          : 'border border-border-soft bg-white/55 shadow-soft ring-1 ring-inset ring-white/40 hover:-translate-y-1 hover:shadow-soft-md',
      ].join(' ')}
    >
      {/* Badge recommandé */}
      {highlight && (
        <div className="absolute right-6 top-0 z-20 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 font-inter text-[9px] font-semibold uppercase tracking-[0.18em] text-choco shadow-soft-md">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            Recommandé
          </span>
        </div>
      )}

      {/* Panneau header (verre) */}
      <div className="rounded-[22px] border border-border-soft bg-white/80 p-7 ring-1 ring-inset ring-choco/[0.04] backdrop-blur-sm">
        <p
          className={`mb-1 font-inter text-[10px] font-semibold uppercase tracking-[0.2em] ${
            highlight ? 'text-brand-dark' : 'text-muted-warm'
          }`}
        >
          Pack {num}
        </p>
        <h3 className="font-marcellus text-2xl font-medium leading-tight tracking-tight text-choco">
          {name}
        </h3>
        <p className="mt-5 border-l-2 border-brand/40 pl-3 text-xs italic leading-relaxed text-muted-warm">
          {forWho}
        </p>
        <p className="mt-5 font-inter text-[10px] uppercase tracking-[0.18em] text-muted-warm">
          À partir de
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-marcellus text-4xl font-medium leading-none text-choco md:text-5xl">
            {priceLabel}
          </span>
          <span className="font-marcellus text-2xl text-brand-dark">€</span>
          <span className="ml-1 font-inter text-[10px] uppercase tracking-[0.15em] text-muted-warm">
            TTC
          </span>
        </div>
      </div>

      {/* Panneau features (verre) */}
      <div className="mt-2 flex flex-grow flex-col rounded-[22px] border border-border-soft bg-white/45 p-6 ring-1 ring-inset ring-white/30 backdrop-blur-sm">
        <ul className="flex-grow space-y-2.5">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-warm"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-2xl bg-brand-soft/70 p-4">
          <p className="font-inter text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Pourquoi le choisir
          </p>
          <p className="mt-1.5 text-xs italic leading-relaxed text-muted-warm">{why}</p>
        </div>
      </div>
    </motion.div>
  );
}
