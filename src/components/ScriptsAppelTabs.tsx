'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AlertTriangle, ClipboardList, Phone, Sparkles, Users } from 'lucide-react';

/**
 * Tabs interactives pour les 3 scripts d'appel.
 *
 * UX : un seul script visible à la fois (sinon la page déroule sur des
 * km). Indicateur amber qui glisse entre les onglets via layoutId.
 * Contenu changé avec AnimatePresence (fade + y).
 */
export default function ScriptsAppelTabs() {
  const [active, setActive] = useState<'appel1' | 'appel2' | 'appel3'>('appel1');
  const current = SCRIPTS.find((s) => s.id === active)!;

  return (
    <div>
      {/* Tabs nav */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-[rgba(74,36,26,0.12)] bg-cream/60 p-1.5">
        {SCRIPTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className="relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm"
          >
            {active === s.id && (
              <motion.span
                layoutId="scripts-active-tab"
                className="absolute inset-0 rounded-xl bg-choco shadow-warm"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-1.5 ${
                active === s.id ? 'text-cream' : 'text-[#6F5A50]'
              }`}
            >
              <s.icon className="h-3.5 w-3.5" aria-hidden />
              <span>{s.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Tab summary header */}
      <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="font-display text-xl font-medium text-ink-warm">
          {current.title}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-dark">
          {current.duration}
        </span>
      </div>
      <p className="mb-7 max-w-2xl text-sm leading-relaxed text-[#6F5A50]">
        {current.summary}
      </p>

      {/* Tab content with transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          {current.steps.map((step, i) => (
            <ScriptStep key={i} step={step} index={i} />
          ))}

          {current.warning && (
            <div className="rounded-2xl border border-brand/30 bg-brand-pale/40 p-5">
              <div className="mb-2 flex items-center gap-2 font-display text-sm font-medium text-ink-warm">
                <AlertTriangle className="h-4 w-4 text-brand-dark" aria-hidden />
                <span>À NE PAS faire</span>
              </div>
              <ul className="space-y-1.5 text-sm text-[#6F5A50]">
                {current.warning.map((w, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-dark" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current.collect && (
            <div className="rounded-2xl border border-[rgba(74,36,26,0.12)] bg-cream p-5">
              <div className="mb-3 flex items-center gap-2 font-display text-sm font-medium text-ink-warm">
                <ClipboardList className="h-4 w-4 text-brand-dark" aria-hidden />
                <span>Infos à collecter quand le prospect dit OUI</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {current.collect.map((c) => (
                  <div key={c.label}>
                    <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
                      {c.label}
                    </p>
                    <p className="text-xs leading-relaxed text-[#6F5A50]">
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {current.binome && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(74,36,26,0.12)] bg-cream p-5">
                <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
                  Commercial
                </p>
                <p className="text-sm leading-relaxed text-[#6F5A50]">
                  Introduit · résume le contexte · note les infos · appuie les
                  arguments du fondateur.
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(74,36,26,0.12)] bg-gradient-to-br from-choco to-[#2A1510] p-5 text-cream">
                <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-brand">
                  Fondateur
                </p>
                <p className="text-sm leading-relaxed text-cream/85">
                  Prend le lead · pose les questions clés · traite le blocage ·
                  peut closer si nécessaire.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ScriptStep({
  step,
  index,
}: {
  step: { label: string; quote?: string; body?: React.ReactNode };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="rounded-2xl border border-transparent px-5 py-4 transition-colors hover:border-[rgba(74,36,26,0.10)] hover:bg-cream/40"
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="font-display text-base font-medium italic leading-none text-brand">
          {String(index + 1).padStart(2, '0')}
        </span>
        <p className="font-display text-base font-medium text-ink-warm">
          {step.label}
        </p>
      </div>
      {step.quote && (
        <blockquote className="mb-2 border-l-2 border-brand pl-4 font-display text-base italic leading-snug text-ink-warm">
          « {step.quote} »
        </blockquote>
      )}
      {step.body && (
        <div className="text-sm leading-relaxed text-[#6F5A50]">
          {step.body}
        </div>
      )}
    </motion.div>
  );
}

// ===========================================================
// Static data — source : Scripts-dappel-and-Argumentaire-commercial.pptx
// ===========================================================

type ScriptStepData = {
  label: string;
  quote?: string;
  body?: React.ReactNode;
};

type Script = {
  id: 'appel1' | 'appel2' | 'appel3';
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  duration: string;
  summary: string;
  steps: ScriptStepData[];
  warning?: string[];
  collect?: { label: string; body: string }[];
  binome?: boolean;
};

const SCRIPTS: Script[] = [
  {
    id: 'appel1',
    label: 'Appel 1 · Qualification',
    icon: Phone,
    title: 'Appel 1 — Qualification',
    duration: '2-3 min max',
    summary:
      "Premier contact à froid. Objectif : qualifier le prospect et obtenir l'email pour envoyer un exemple. Ne pas pitcher le prix.",
    steps: [
      {
        label: 'Ouverture',
        quote:
          "Bonjour, c'est [Prénom] de GND Consulting. Je vous appelle parce qu'on développe des sites internet pour les commerces comme le vôtre. Est-ce que vous avez 2 minutes ?",
        body: (
          <p>
            <span className="font-semibold text-brand-dark">Si occupé :</span>{' '}
            « Pas de souci, je peux vous rappeler à quel moment ? » → noter le
            créneau, raccrocher poliment.
          </p>
        ),
      },
      {
        label: 'Qualification rapide',
        quote: 'Est-ce que [Nom du commerce] a déjà un site internet ?',
        body: (
          <p>
            Trois réponses possibles —{' '}
            <span className="font-semibold text-ink-warm">Non / Jamais considéré</span>{' '}
            · <span className="font-semibold text-ink-warm">Oui mais insatisfait</span>{' '}
            · <span className="font-semibold text-ink-warm">Oui et satisfait</span>.
            Adapter le ton sans pitcher le prix.
          </p>
        ),
      },
      {
        label: 'Collecte email',
        quote: "Pour vous envoyer ça, c'est quoi votre email ?",
        body: (
          <p>
            Épeler pour confirmer →{' '}
            <span className="italic text-ink-warm">
              « Parfait, je vous envoie ça dans la journée. Je vous rappelle
              [demain/dans 2 jours] pour en discuter. Ça vous va ? »
            </span>
          </p>
        ),
      },
    ],
    warning: [
      'Ne pas pitcher le prix.',
      'Ne pas rentrer dans les détails techniques.',
      "Objectif unique : obtenir l'email + fixer le rappel.",
    ],
  },
  {
    id: 'appel2',
    label: 'Appel 2 · Closing Simple',
    icon: Sparkles,
    title: 'Appel 2 — Closing Simple',
    duration: '5-10 min',
    summary:
      "Deuxième contact après envoi de l'exemple. Objectif : closer la vente. Pitch des packs, collecte des infos, paiement.",
    steps: [
      {
        label: 'Ouverture',
        quote:
          "Bonjour, c'est [Prénom] de GND Consulting. On s'était parlé [jour], je vous avais envoyé un exemple de site. Vous avez eu le temps de regarder ?",
        body: (
          <p>
            <span className="font-semibold text-brand-dark">Si non :</span>{' '}
            résumer en 2 mots — design pro, adapté mobile, infos essentielles.
          </p>
        ),
      },
      {
        label: 'Proposition',
        quote:
          'Concrètement pour [Nom du commerce], vous cherchez plutôt un site vitrine classique ou vous avez aussi besoin d’un système de réservation ou de commande en ligne ?',
      },
      {
        label: 'Pitch des formules',
        body: (
          <ul className="space-y-2.5">
            <li>
              <span className="font-semibold text-brand-dark">
                Vitrine Essentiel à partir de 800 €
              </span>{' '}
              — Présentation activité, services/menu, formulaire contact,
              optimisé mobile, livré en quelques jours.
            </li>
            <li>
              <span className="font-semibold text-brand-dark">
                Vitrine + Réservation à partir de 1 500 €
              </span>{' '}
              — Tout le précédent + système de réservation/commande en ligne
              avec notifications automatiques.
            </li>
          </ul>
        ),
      },
      {
        label: 'Closing & paiement',
        quote: "Est-ce que ça vous convient si on part là-dessus ?",
        body: (
          <p>
            <span className="font-semibold text-brand-dark">Acompte 50 %</span>{' '}
            pour démarrer · solde à la livraison. Si blocage réel → proposer un
            échange avec le fondateur (passage en Appel 3).
          </p>
        ),
      },
    ],
    collect: [
      {
        label: 'Identité',
        body: 'Nom exact du commerce · adresse complète.',
      },
      {
        label: 'Visuels',
        body: "Logo (s'il en a un) · contenu à mettre sur le site.",
      },
      {
        label: 'Technique',
        body: 'Nom de domaine souhaité (ou existant) · compte Google pour l’hébergement.',
      },
    ],
  },
  {
    id: 'appel3',
    label: 'Appel 3 · Closing Binôme',
    icon: Users,
    title: 'Appel 3 — Closing Binôme',
    duration: 'Téléphone ou visio',
    summary:
      "Si l'Appel 2 n'a pas closer, le fondateur entre en jeu pour débloquer la situation. Approche devis personnalisé.",
    steps: [
      {
        label: 'Brief du fondateur (avant l’appel)',
        body: (
          <ul className="space-y-1.5">
            <li className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /><span>Nom du commerce et activité.</span></li>
            <li className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /><span>Ce qui a été dit en Appels 1 et 2.</span></li>
            <li className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /><span>Besoins identifiés (vitrine / réservation / e-commerce).</span></li>
            <li className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /><span>Point de blocage précis.</span></li>
            <li className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /><span>Personnalité du client (méfiant, pressé, indécis).</span></li>
            <li className="flex gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" /><span>Budget évoqué si mentionné.</span></li>
          </ul>
        ),
      },
      {
        label: 'Closing fondateur',
        quote:
          "Bon [Prénom client], on a fait le tour. Vous avez toutes les infos. Qu'est-ce que vous en pensez, on part là-dessus ?",
      },
    ],
    binome: true,
  },
];
