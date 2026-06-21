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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-cream"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      {/* fond chaleureux animé */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-white to-cream" />
        <motion.div
          className="absolute right-[-12%] top-[-18%] h-[55%] w-[55%] rounded-full bg-brand-soft blur-[130px]"
          animate={reduce ? {} : { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-15%] left-[-10%] h-[55%] w-[55%] rounded-full bg-brand-soft blur-[130px]"
          animate={reduce ? {} : { scale: [1.1, 1, 1.1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* particules douces */}
        {!reduce &&
          [...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-brand/40"
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
          className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-choco shadow-soft-md"
          style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
        >
          G
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-dark"
        >
          Bienvenue dans l&apos;équipe
        </motion.p>

        <h1
          className="font-marcellus text-4xl font-medium leading-tight text-choco md:text-6xl"
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
            className="inline-block italic text-brand-dark"
          >
            {prenom}.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-4 max-w-md text-muted-warm"
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
          className="group mt-9 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-choco shadow-soft-md"
        >
          <Sparkles className="h-4 w-4 text-brand-dark" aria-hidden />
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
        'panel card-hover group/card relative overflow-hidden rounded-[14px] p-4 ' +
        (wide ? 'md:col-span-2' : '')
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-3 select-none text-[2.25rem] leading-none opacity-[0.06] transition-opacity duration-300 group-hover/card:opacity-[0.1]"
      >
        {emoji}
      </span>
      <div className="relative mb-3 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-lg shadow-soft"
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <span className="mb-1 inline-flex items-center gap-2">
            <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              GND
            </span>
          </span>
          <h2 className="font-marcellus text-base font-medium tracking-tight text-choco">
            {title}
          </h2>
        </div>
      </div>
      <div className="relative">{children}</div>
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
        <motion.header
          variants={item}
          className="surface-chocolate relative mb-6 overflow-hidden rounded-[16px] p-5 sm:p-6"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-10 select-none font-marcellus text-[110px] font-black leading-none text-cream/[0.08]"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            G
          </span>
          <div className="relative">
            <span className="mb-3 inline-flex items-center gap-2">
              <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-[#E0A572]">
                Onboarding commercial
              </span>
            </span>
            <h1 className="font-marcellus text-3xl font-medium leading-tight tracking-tight text-cream">
              Bienvenue chez GND,{' '}
              <span className="italic text-[#E0A572]">{prenom}</span>.
            </h1>
            <p className="mt-3 max-w-xl text-cream/55">
              Tout ce dont tu as besoin pour démarrer : ton espace, tes
              prospects, ta rémunération.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {commissionPct != null && (
                <motion.span
                  initial={{ scale: 0.9 }}
                  animate={contentReady ? { scale: 1 } : {}}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/15 px-3.5 py-1.5 text-sm font-semibold text-[#E0A572]"
                >
                  Commission&nbsp;: <span className="font-num tabular-nums">{commissionShown}%</span>
                </motion.span>
              )}
              <Link
                href="/prospects"
                className="group inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-cream/[0.06] px-3.5 py-1.5 text-sm font-medium text-cream/80 transition-all hover:bg-cream/10"
              >
                <span className="font-num tabular-nums">{nbProspects}</span> prospect{nbProspects > 1 ? 's' : ''} assigné
                {nbProspects > 1 ? 's' : ''}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card emoji="🚀" title="Tes premiers pas" wide>
            <OnboardingChecklist storageKey={`gnd-onboarding-${userId}`} />
          </Card>

          <Card emoji="💰" title="Ta rémunération">
            <ul className="text-sm text-ink-warm [&>li+li]:border-t [&>li+li]:border-[rgba(74,36,26,0.07)]">
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted-warm">Commission par contrat signé</span>
                <strong className="shrink-0 font-num tabular-nums text-choco">{commissionPct ?? '—'}%</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted-warm">Paiement après encaissement total</span>
                <strong className="shrink-0 font-num tabular-nums text-choco">15 j</strong>
              </li>
            </ul>
            <p className="hairline mt-2 rounded-2xl bg-cream/50 px-3.5 py-2.5 text-xs text-muted-warm">
              Acompte 50% → livraison → solde 50% → tu factures → payé sous 15 j.
            </p>
            <div className="panel-accent mt-3 rounded-2xl p-4">
              <span className="mb-3 inline-flex items-center gap-2">
                <span aria-hidden className="h-px w-4 bg-gradient-to-r from-brand-burnt to-transparent" />
                <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
                  Paliers bonus (sur 3 mois)
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                {BONUS_TIERS.map((t, i) => (
                  <motion.span
                    key={t.contrats}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                    className="hairline-brand inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink-warm shadow-soft"
                  >
                    <span className="font-num tabular-nums">{t.contrats}</span> contrats → <strong className="font-num tabular-nums text-brand-burnt">{t.bonus}€</strong>
                  </motion.span>
                ))}
              </div>
            </div>
          </Card>

          <Card emoji="🎯" title="Process de vente — A à Z">
            <ol className="text-sm text-ink-warm [&>li+li]:border-t [&>li+li]:border-[rgba(74,36,26,0.07)]">
              <li className="flex items-center gap-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">1</span>
                <span>Tu prospectes sur ta zone / liste attribuée</span>
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">2</span>
                <span>Tu qualifies (besoin, budget, décideur)</span>
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">3</span>
                <span>Tu présentes l&apos;offre adaptée</span>
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">4</span>
                <span>Tu closes et fais signer le devis</span>
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">5</span>
                <span>Tu transmets les infos par email</span>
              </li>
            </ol>
            <p className="hairline mt-2 rounded-2xl bg-cream/50 px-3.5 py-2.5 text-xs text-muted-warm">
              Blocage majeur uniquement → tu me contactes, on voit ensemble.
            </p>
          </Card>

          <Card emoji="📞" title="Communication">
            <ul className="text-sm text-ink-warm [&>li+li]:border-t [&>li+li]:border-[rgba(74,36,26,0.07)]">
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted-warm">Questions rapides / informel</span>
                <strong className="shrink-0 rounded-full bg-ok-bg px-2.5 py-0.5 text-xs text-ok-fg">WhatsApp</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted-warm">Infos clients (nom, formule, montant)</span>
                <strong className="shrink-0 rounded-full bg-info-bg px-2.5 py-0.5 text-xs text-info-fg">Email</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted-warm">Déclarer un contrat signé</span>
                <strong className="shrink-0 rounded-full bg-info-bg px-2.5 py-0.5 text-xs text-info-fg">Email</strong>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted-warm">Facturation &amp; commissions</span>
                <strong className="shrink-0 rounded-full bg-info-bg px-2.5 py-0.5 text-xs text-info-fg">Email</strong>
              </li>
            </ul>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-flex items-center rounded-full bg-cream-deep px-3.5 py-1.5 text-sm font-semibold text-brand-burnt transition hover:bg-brand-pale"
            >
              {CONTACT_EMAIL}
            </a>
          </Card>

          <Card emoji="✅" title="Déclarer un contrat signé">
            <p className="mb-3 text-sm text-muted-warm">
              Par email à {CONTACT_EMAIL}, avec :
            </p>
            <ul className="space-y-2 text-sm text-ink-warm">
              <li className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Nom du commerce</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Contact : nom + téléphone + email</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Formule (Essentiel / Réservation / Pack Complet)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>Montant signé</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span><strong className="text-choco">Devis signé en pièce jointe</strong></span>
              </li>
            </ul>
          </Card>

          <Card emoji="👁️" title="Ton suivi">
            <p className="text-sm text-ink-warm">
              Suis chaque deal en temps réel : formule, montant, acompte 50%,
              livraison, solde, <strong>commission due</strong> et statut de
              paiement. Transparence totale.
            </p>
            <Link
              href="/prospects"
              className="group mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark"
            >
              Ouvrir mon Carnet de bord
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Card>

          <Card emoji="🚫" title="Règles d'or">
            <ol className="text-sm text-ink-warm [&>li+li]:border-t [&>li+li]:border-[rgba(74,36,26,0.07)]">
              <li className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">1</span>
                <span><strong className="text-choco">Confidentialité</strong> — tarifs, marges et méthodes restent confidentiels.</span>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">2</span>
                <span><strong className="text-choco">Pas de doublon</strong> — uniquement ta zone / liste attribuée.</span>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">3</span>
                <span>Interdit d&apos;appeler un prospect marqué « En cours » par un autre.</span>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-pale font-num text-[11px] font-semibold text-brand-burnt tabular-nums">4</span>
                <span><strong className="text-choco">Autonomie</strong> — tu gères ton emploi du temps.</span>
              </li>
            </ol>
          </Card>

          <Card emoji="📂" title="Tes ressources" wide>
            <p className="mb-3 text-sm text-muted-warm">
              Scripts d&apos;appel, templates emails, grille tarifaire, site
              démo, et les documents de closing (CGV, Brief Client, FAQ, Process
              de Livraison).
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ressources"
                className="group inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] shadow-soft transition-all hover:opacity-90"
              >
                Sales toolkit
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/formation"
                className="rounded-full border border-border-soft bg-white px-5 py-2.5 text-sm font-semibold text-choco transition-all hover:border-brand/30 hover:shadow-soft"
              >
                Formation (<span className="font-num tabular-nums">7</span> modules) →
              </Link>
            </div>
          </Card>
        </div>

        <motion.p
          variants={item}
          className="mt-8 text-center text-xs text-muted-warm"
        >
          Des questions ? → WhatsApp · Infos clients / facturation ? → Email
        </motion.p>
      </motion.div>
    </>
  );
}
