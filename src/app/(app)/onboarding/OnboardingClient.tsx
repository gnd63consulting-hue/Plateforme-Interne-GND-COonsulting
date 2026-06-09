'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { OnboardingChecklist } from './OnboardingChecklist';

const CONTACT_EMAIL = 'contact@gndconsulting.fr';
const BONUS_TIERS = [
  { contrats: 20, bonus: 250 },
  { contrats: 25, bonus: 500 },
  { contrats: 30, bonus: 750 },
];

type Props = {
  prenom: string;
  commissionPct: number | null;
  nbProspects: number;
  userId: string;
};

/* ---------- count-up hook (commission) ---------- */
function useCountUp(target: number | null, run: boolean, duration = 1100): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run || target == null) {
      if (target == null) setVal(0);
      return;
    }
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return val;
}

/* ---------- variants ---------- */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
};

/* ============================================================ */
/*  Welcome overlay — première ouverture uniquement              */
/* ============================================================ */
function WelcomeOverlay({
  prenom,
  onDone,
}: {
  prenom: string;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key="welcome"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-gnd-cream"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      {/* fond chaleureux animé */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gnd-cream via-white to-gnd-cream-dim" />
        <motion.div
          className="absolute right-[-12%] top-[-18%] h-[55%] w-[55%] rounded-full bg-gnd-amber/15 blur-[130px]"
          animate={reduce ? {} : { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-15%] left-[-10%] h-[55%] w-[55%] rounded-full bg-gnd-bronze/10 blur-[130px]"
          animate={reduce ? {} : { scale: [1.1, 1, 1.1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* particules douces */}
        {!reduce &&
          [...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-gnd-amber/40"
              style={{ left: `${12 + i * 14}%`, top: `${70 - (i % 3) * 8}%` }}
              animate={{ y: [0, -26, 0], opacity: [0, 1, 0] }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut',
              }}
            />
          ))}
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        {/* G mark */}
        <motion.div
          initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
          className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gnd-bronze text-2xl font-bold text-gnd-cream shadow-warm-lg"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
        >
          G
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-gnd-amber"
        >
          Bienvenue dans l&apos;équipe
        </motion.p>

        <h1
          className="font-display text-4xl font-medium leading-tight text-gnd-bronze md:text-6xl"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
        >
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 120, damping: 16 }}
            className="inline-block"
          >
            Bienvenue chez GND,{' '}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, type: 'spring', stiffness: 120, damping: 16 }}
            className="inline-block italic text-gnd-amber"
          >
            {prenom}.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-4 max-w-md text-gnd-bronze-soft"
        >
          On a hâte de t&apos;avoir avec nous. Voici ton espace pour tout
          comprendre et démarrer fort.
        </motion.p>

        <motion.button
          type="button"
          onClick={onDone}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, type: 'spring', stiffness: 160, damping: 16 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="group mt-9 inline-flex items-center gap-2 rounded-full bg-gnd-bronze px-7 py-3.5 text-sm font-semibold text-gnd-cream shadow-warm-lg"
        >
          <Sparkles className="h-4 w-4 text-gnd-amber" aria-hidden />
          Découvrir mon espace
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ============================================================ */
/*  Section card (entrée animée + hover lift)                    */
/* ============================================================ */
function Card({
  emoji,
  title,
  children,
  wide = false,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.section
      variants={item}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={
        'rounded-3xl border border-gnd-bronze/10 bg-white/80 p-7 shadow-warm backdrop-blur-sm transition-shadow hover:shadow-warm-lg ' +
        (wide ? 'md:col-span-2' : '')
      }
    >
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-medium text-gnd-bronze">
        <span aria-hidden className="text-xl">
          {emoji}
        </span>
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

/* ============================================================ */
/*  Main                                                         */
/* ============================================================ */
export default function OnboardingClient({
  prenom,
  commissionPct,
  nbProspects,
  userId,
}: Props) {
  const welcomeKey = useMemo(() => `gnd-ob-welcome-${userId}`, [userId]);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(welcomeKey) === '1';
    } catch {
      seen = false;
    }
    setShowWelcome(!seen);
  }, [welcomeKey]);

  function dismissWelcome() {
    try {
      localStorage.setItem(welcomeKey, '1');
    } catch {
      // ignore
    }
    setShowWelcome(false);
  }

  const contentReady = showWelcome === false;
  const commissionShown = useCountUp(commissionPct, contentReady);

  return (
    <>
      <AnimatePresence>
        {showWelcome === true && (
          <WelcomeOverlay prenom={prenom} onDone={dismissWelcome} />
        )}
      </AnimatePresence>

      <motion.div
        className="mx-auto max-w-5xl"
        variants={container}
        initial="hidden"
        animate={contentReady ? 'show' : 'hidden'}
      >
        {/* Hero */}
        <motion.header variants={item} className="relative mb-8 overflow-hidden">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-16 select-none font-display text-[12rem] font-black leading-none text-gnd-bronze/[0.04] md:text-[16rem]"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            G
          </span>
          <div className="relative">
            <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-gnd-amber">
              Onboarding commercial
            </p>
            <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-gnd-bronze md:text-5xl">
              Bienvenue chez GND,{' '}
              <span className="italic text-gnd-amber">{prenom}</span>.
            </h1>
            <p className="mt-3 max-w-xl text-gnd-bronze-soft">
              Tout ce dont tu as besoin pour démarrer : ton espace, tes
              prospects, ta rémunération.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {commissionPct != null && (
                <motion.span
                  initial={{ scale: 0.9 }}
                  animate={contentReady ? { scale: 1 } : {}}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gnd-amber/25 bg-gnd-amber/10 px-3.5 py-1.5 text-sm font-semibold text-gnd-amber tabular-nums"
                >
                  Commission&nbsp;: {commissionShown}%
                </motion.span>
              )}
              <Link
                href="/prospects"
                className="group inline-flex items-center gap-1.5 rounded-full border border-gnd-bronze/15 bg-white px-3.5 py-1.5 text-sm font-medium text-gnd-bronze transition-all hover:border-gnd-bronze/30 hover:shadow-warm"
              >
                {nbProspects} prospect{nbProspects > 1 ? 's' : ''} assigné
                {nbProspects > 1 ? 's' : ''}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card emoji="🚀" title="Tes premiers pas" wide>
            <OnboardingChecklist storageKey={`gnd-onboarding-${userId}`} />
          </Card>

          <Card emoji="💰" title="Ta rémunération">
            <ul className="space-y-2 text-sm text-gnd-bronze">
              <li>
                <strong>Ta commission : {commissionPct ?? '—'}%</strong> par
                contrat signé.
              </li>
              <li>
                <strong>Paiement</strong> : 15 jours après encaissement total du
                client.
              </li>
              <li className="text-gnd-bronze-soft">
                Acompte 50% → livraison → solde 50% → tu factures → payé sous 15 j.
              </li>
            </ul>
            <div className="mt-4 rounded-2xl bg-gnd-cream/60 p-4">
              <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gnd-amber">
                Paliers bonus (sur 3 mois)
              </p>
              <div className="flex flex-wrap gap-2">
                {BONUS_TIERS.map((t, i) => (
                  <motion.span
                    key={t.contrats}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                    className="rounded-full border border-gnd-bronze/12 bg-white px-3 py-1 text-xs font-medium text-gnd-bronze"
                  >
                    {t.contrats} contrats → <strong>{t.bonus}€</strong>
                  </motion.span>
                ))}
              </div>
            </div>
          </Card>

          <Card emoji="🎯" title="Process de vente — A à Z">
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
          </Card>

          <Card emoji="📞" title="Communication">
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
          </Card>

          <Card emoji="✅" title="Déclarer un contrat signé">
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
          </Card>

          <Card emoji="👁️" title="Ton suivi">
            <p className="text-sm text-gnd-bronze">
              Suis chaque deal en temps réel : formule, montant, acompte 50%,
              livraison, solde, <strong>commission due</strong> et statut de
              paiement. Transparence totale.
            </p>
            <Link
              href="/prospects"
              className="group mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gnd-amber"
            >
              Ouvrir mon Carnet de bord
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Card>

          <Card emoji="🚫" title="Règles d'or">
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
          </Card>

          <Card emoji="📂" title="Tes ressources" wide>
            <p className="mb-3 text-sm text-gnd-bronze-soft">
              Scripts d&apos;appel, templates emails, grille tarifaire, site
              démo, et les documents de closing (CGV, Brief Client, FAQ, Process
              de Livraison).
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ressources"
                className="group inline-flex items-center gap-1.5 rounded-full bg-gnd-bronze px-4 py-2 text-sm font-semibold text-gnd-cream transition-all hover:opacity-90"
              >
                Sales toolkit
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/formation"
                className="rounded-full border border-gnd-bronze/15 bg-white px-4 py-2 text-sm font-semibold text-gnd-bronze transition-all hover:border-gnd-bronze/30 hover:shadow-warm"
              >
                Formation (7 modules) →
              </Link>
            </div>
          </Card>
        </div>

        <motion.p
          variants={item}
          className="mt-8 text-center text-xs text-gnd-bronze-soft"
        >
          Des questions ? → WhatsApp · Infos clients / facturation ? → Email
        </motion.p>
      </motion.div>
    </>
  );
}
