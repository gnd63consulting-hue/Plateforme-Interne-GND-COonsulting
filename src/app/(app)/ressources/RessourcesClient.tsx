'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FolderOpen,
  Lock,
  Mail,
  MessageSquare,
  PhoneCall,
  Phone,
  Shield,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import RessourcesHeroVisual from '@/components/RessourcesHeroVisual';
import ScriptsAppelTabs from '@/components/ScriptsAppelTabs';

export default function RessourcesClient() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const watermarkY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const watermarkOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  return (
    <div className="relative">
      {/* Hero — split 7/5 */}
      <header
        ref={heroRef}
        className="relative mb-20 grid min-h-[60vh] grid-cols-1 items-center gap-12 overflow-hidden lg:grid-cols-[7fr_5fr] lg:gap-16"
      >
        <motion.span
          aria-hidden
          style={{ y: watermarkY, opacity: watermarkOpacity }}
          className="pointer-events-none absolute -bottom-10 -left-4 select-none whitespace-nowrap font-marcellus text-[20vw] font-medium leading-none tracking-tighter text-choco/[0.04] sm:-bottom-20 sm:text-[16rem]"
        >
          Ressources.
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-brand" />
            <span className="font-inter text-[10px] font-medium uppercase tracking-[0.2em] text-brand-dark">
              Sales toolkit
            </span>
          </div>
          <h1 className="font-marcellus text-display-xl font-medium leading-[0.95] tracking-tight text-choco">
            Ressources{' '}
            <span className="italic text-brand-dark">commerciales</span>.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-warm sm:text-lg">
            Outils stratégiques et supports opérationnels pour piloter ta
            performance commerciale au sein de GND Consulting.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <RessourcesHeroVisual />
        </motion.div>
      </header>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <section className="space-y-12 lg:col-span-8">
          {/* 01 · Argumentaire */}
          <SectionCard
            label="01 · Argumentaire clé"
            icon={<MessageSquare className="h-5 w-5" aria-hidden />}
            title="Les 5 piliers du pitch"
            subtitle="Cinq angles d'argumentation à maîtriser pour tout appel sortant ou rendez-vous qualifié."
          >
            <ArgGrid
              items={[
                { bold: 'Visibilité Google', body: "76 % des recherches mobiles locales aboutissent à une visite dans la journée. Sans site, le commerçant est invisible." },
                { bold: 'Zéro dépendance', body: "Le client est propriétaire du site et du nom de domaine. Pas d'abonnement, pas de plateforme qui peut changer les règles." },
                { bold: '3 à 5 fois moins cher', body: "Qu'une agence classique, 2 à 3 fois plus rapide qu'un freelance." },
                { bold: '1 à 2 semaines', body: 'De délai de livraison contre 6 à 16 semaines ailleurs.' },
                { bold: 'Paiement en 2 fois', body: '50 % à la commande, 50 % à la livraison. Aucun frais caché.' },
              ]}
            />
          </SectionCard>

          {/* 02 · Do's & Don'ts — now 3 columns */}
          <SectionCard
            label="02 · Do's & Don'ts"
            icon={<Target className="h-5 w-5" aria-hidden />}
            title="Les réflexes"
            subtitle="Les bons gestes pour cadencer un cycle de vente, les pièges qui coûtent un deal, et les phrases interdites en interne."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DosDontsCard
                tone="do"
                title="À privilégier"
                items={[
                  { node: "Appel 1 court (2 min max) pour récupérer l'email." },
                  { node: "Envoyer l'Email 1 dans les 2 heures après l'appel." },
                  { node: 'Fixer un rendez-vous précis (date + heure).' },
                  {
                    node: (
                      <>
                        Montrer les sites démo{' '}
                        <DemoLink href="https://opapapoulet-marly-la-ville.vercel.app/">
                          O Papa Poulet
                        </DemoLink>{' '}
                        et{' '}
                        <DemoLink href="https://faim-de-semaine-website-v2-qs3p.vercel.app/">
                          Faim de Semaine
                        </DemoLink>
                        .
                      </>
                    ),
                  },
                  { node: 'Mettre à jour la fiche Notion le jour même.' },
                ]}
              />
              <DosDontsCard
                tone="dont"
                title="À éviter"
                items={[
                  { node: 'Donner un prix fixe avant qualification du besoin.' },
                  { node: '« Je ne vous dérange pas ? » en ouverture.' },
                  { node: 'Promettre des délais non validés par GND.' },
                  { node: 'Proposer une maquette personnalisée gratuite.' },
                  { node: "Contacter un prospect « En cours » d'un collègue." },
                ]}
              />
              <DosDontsCard
                tone="never"
                title="À ne JAMAIS dire"
                items={[
                  { node: <><span className="italic">« Tarifs de lancement »</span> ou <span className="italic">« les prix vont remonter »</span> (fausse urgence).</> },
                  { node: <><span className="italic">« Tarifs préférentiels »</span> ou <span className="italic">« spécialement pour vous »</span>.</> },
                  { node: 'Promettre un délai sans avoir validé avec Roodny.' },
                  { node: 'Comparer ouvertement à un concurrent nommé.' },
                ]}
              />
            </div>
          </SectionCard>

          {/* 03 · Scripts d'appel (NEW) */}
          <SectionCard
            label="03 · Scripts d'appel"
            icon={<PhoneCall className="h-5 w-5" aria-hidden />}
            title="Les 3 temps d'un cycle de vente"
            subtitle="Trois appels, trois objectifs distincts. Chacun a un rôle précis dans le processus de vente — ne pas les confondre."
          >
            {/* Internal banner */}
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft/50 px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-warm">
                <span className="font-semibold text-ink-warm">
                  Document interne équipe.
                </span>{' '}
                Partageable avec les commerciaux freelances uniquement. Ne JAMAIS
                partager avec un client ou un prospect.
              </p>
            </div>

            <ScriptsAppelTabs />
          </SectionCard>

          {/* 04 · Objections (NEW) */}
          <SectionCard
            label="04 · Objections fréquentes"
            icon={<Shield className="h-5 w-5" aria-hidden />}
            title="Les 6 réponses prêtes"
            subtitle="Les objections les plus courantes et la réponse-pivot à utiliser pour rouvrir la conversation. Répéter, pas réciter."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {OBJECTIONS.map((o, i) => (
                <ObjectionCard key={o.title} index={i} {...o} />
              ))}
            </div>
          </SectionCard>

          {/* 05 · Scripts & templates (was 03) */}
          <SectionCard
            label="05 · Templates prêts-à-envoyer"
            icon={<FolderOpen className="h-5 w-5" aria-hidden />}
            title="Prêt-à-envoyer"
            subtitle="Les templates utilisés en interne. Copier-coller assumé, personnaliser le prénom + le nom de l'établissement."
          >
            <div className="space-y-3">
              {TEMPLATES.map((t, i) => (
                <TemplateCard key={t.title} index={i} {...t} />
              ))}
            </div>
          </SectionCard>
        </section>

        {/* Sidebar */}
        <aside className="space-y-8 lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-white to-cream shadow-soft"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-brand to-transparent" />
            <div className="p-7">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-6 bg-brand" />
                <span className="font-inter text-[10px] font-medium uppercase tracking-[0.2em] text-brand-dark">
                  Contacts
                </span>
              </div>
              <h2 className="mb-6 font-marcellus text-2xl font-medium tracking-tight text-choco">
                Contacts utiles
              </h2>
              <div className="space-y-5">
                {CONTACTS.map((c) => (
                  <div key={c.name} className="border-l-2 border-brand/30 pl-4">
                    <p className="font-marcellus text-base font-medium text-choco">
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-warm">{c.role}</p>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="mt-1 inline-flex items-center gap-1 font-inter text-xs text-brand-dark transition-colors hover:text-brand"
                      >
                        {c.email}
                        <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <a
                href="mailto:contact@gndconsulting.fr"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-xs font-semibold text-choco transition-all hover:bg-brand-dark hover:shadow-soft-md"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Contacter le support
              </a>
            </div>
          </motion.div>

          {/* Carte Module 03 — version CREME lisible (etait sombre/illisible) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-border-soft bg-cream-deep p-7 shadow-soft"
          >
            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 font-inter text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
                <Sparkles className="h-3 w-3" aria-hidden />
                Module 03
              </div>
              <h3 className="font-marcellus text-xl font-medium leading-tight text-choco">
                Process de vente <span className="italic text-brand-dark">complet</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-warm">
                Le module 03 déroule l'intégralité du process commercial.
                Scénario A, scénario B, et les 6 étapes.
              </p>
              <Link
                href="/formation/module-03-process-vente"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-xs font-semibold text-choco transition-all hover:bg-brand-dark hover:gap-3"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Ouvrir le module
              </Link>
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-3 right-3 select-none font-marcellus text-7xl font-medium italic leading-none text-brand/10"
              >
                03
              </span>
            </div>
          </motion.div>
        </aside>
      </div>

      {/* Pricing */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-24"
      >
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-8 bg-brand" />
              <span className="font-inter text-[10px] font-medium uppercase tracking-[0.2em] text-brand-dark">
                Pricing 2026
              </span>
            </div>
            <h2 className="font-marcellus text-display-md font-medium leading-tight tracking-tight text-choco">
              Trois packs,{' '}
              <span className="italic text-brand-dark">trois ambitions</span>
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-warm">
              Sites vitrines pour commerces et PME locales. Paiement unique en 2
              fois (50/50). Aucun abonnement.
            </p>
          </div>
          <p className="font-inter text-[10px] uppercase tracking-[0.18em] text-muted-warm lg:max-w-xs lg:text-right">
            Chaque pack est un point de départ. Devis sur-mesure si besoins
            spécifiques.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
          {PACKS.map((p, i) => (
            <PricingCard key={p.name} pack={p} index={i} />
          ))}
        </div>
      </motion.section>

      {/* Modalités */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-20"
      >
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-8 bg-brand" />
            <span className="font-inter text-[10px] font-medium uppercase tracking-[0.2em] text-brand-dark">
              Modalités & engagement
            </span>
          </div>
          <h2 className="font-marcellus text-display-md font-medium leading-tight tracking-tight text-choco">
            Comment ça se passe{' '}
            <span className="italic text-brand-dark">concrètement</span>
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-warm">
            Cadre simple et transparent. Pas d'abonnement caché.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ModalityCard
            icon={<CreditCard className="h-5 w-5" aria-hidden />}
            title="Paiement"
            lines={[
              { strong: '50 %', text: 'à la signature du devis.' },
              { strong: '50 %', text: 'à la livraison.' },
            ]}
            footnote="Pas d'abonnement, pas de frais cachés. Le site est à vous, vous avez tous les accès."
          />
          <ModalityCard
            icon={<Clock className="h-5 w-5" aria-hidden />}
            title="Délai de livraison"
            lines={[
              { strong: '1 à 2 semaines', text: 'pour Vitrine Essentiel et Vitrine + Réservation.' },
              { strong: '3 semaines+', text: 'pour Pack Complet selon les spécificités du projet.' },
            ]}
          />
        </div>

        {/* Footer contact — CHOCOLAT PLEIN + texte CREME (etait fonce-sur-fonce illisible) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 overflow-hidden rounded-3xl border border-choco bg-choco p-10 text-cream shadow-soft-lg md:p-14"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="mb-3 font-inter text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
                Une question, un projet ?
              </p>
              <h3 className="font-marcellus text-3xl font-medium leading-tight md:text-4xl">
                On en discute{' '}
                <span className="italic text-brand">directement</span>.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-cream/70">
                GND Consulting — agence créative et tech.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+33759506322"
                className="group inline-flex items-center gap-3 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-choco transition-all hover:bg-brand-dark hover:shadow-soft-md"
              >
                <Phone className="h-4 w-4" aria-hidden />
                07 59 50 63 22
              </a>
              <a
                href="mailto:contact@gndconsulting.fr"
                className="group inline-flex items-center gap-3 rounded-full border border-cream/25 bg-cream/5 px-6 py-3.5 text-sm font-semibold text-cream transition-all hover:bg-cream/10"
              >
                <Mail className="h-4 w-4" aria-hidden />
                contact@gndconsulting.fr
              </a>
            </div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

// ===========================================================
// Sub-components
// ===========================================================

function SectionCard({
  label, icon, title, subtitle, children,
}: {
  label: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-3xl border border-border-soft bg-white p-8 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-md sm:p-10"
    >
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
            {icon}
          </span>
          <div>
            <p className="mb-1 font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
              {label}
            </p>
            <h2 className="font-marcellus text-2xl font-medium leading-tight tracking-tight text-choco sm:text-3xl">
              {title}
            </h2>
          </div>
        </div>
      </div>
      {subtitle && (
        <p className="mb-6 max-w-2xl text-pretty text-sm leading-relaxed text-muted-warm">
          {subtitle}
        </p>
      )}
      {children}
    </motion.div>
  );
}

function ArgGrid({ items }: { items: { bold: string; body: string }[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <motion.li
          key={item.bold}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
          className="flex gap-4 rounded-2xl border border-transparent px-4 py-3 transition-colors hover:border-border-soft hover:bg-cream"
        >
          <span className="shrink-0 font-marcellus text-xl font-medium italic leading-none text-brand-dark">
            {String(i + 1).padStart(2, '0')}
          </span>
          <p className="text-sm leading-relaxed text-muted-warm">
            <span className="font-semibold text-brand-dark">{item.bold}</span>
            <span className="text-ink-warm"> — </span>
            {item.body}
          </p>
        </motion.li>
      ))}
    </ul>
  );
}

function DosDontsCard({
  tone, title, items,
}: {
  tone: 'do' | 'dont' | 'never';
  title: string;
  items: { node: React.ReactNode }[];
}) {
  const styles = {
    do: { border: 'border-emerald-700/15', bg: 'bg-emerald-50/40', label: 'text-emerald-800', dot: 'bg-emerald-700/60', icon: <CheckCircle2 className="h-4 w-4" aria-hidden /> },
    dont: { border: 'border-border-soft', bg: 'bg-cream', label: 'text-ink-warm', dot: 'bg-muted-warm/50', icon: <XCircle className="h-4 w-4" aria-hidden /> },
    never: { border: 'border-rose-700/20', bg: 'bg-rose-50/40', label: 'text-rose-800', dot: 'bg-rose-700/60', icon: <AlertTriangle className="h-4 w-4" aria-hidden /> },
  } as const;
  const s = styles[tone];
  return (
    <div className={`rounded-2xl border p-6 ${s.border} ${s.bg}`}>
      <div className={`mb-4 flex items-center gap-2 font-marcellus text-base font-medium ${s.label}`}>
        {s.icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -4 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
            className="flex gap-2.5 text-sm leading-relaxed text-muted-warm"
          >
            <span aria-hidden className={`mt-2 h-1 w-1 shrink-0 rounded-full ${s.dot}`} />
            <span>{item.node}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ObjectionCard({
  index, title, prospect, response,
}: {
  index: number;
  title: string;
  prospect: string;
  response: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col rounded-2xl border border-border-soft bg-white/40 p-5 transition-all hover:border-brand/30 hover:bg-white"
    >
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-marcellus text-2xl font-medium italic leading-none text-brand-dark">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h4 className="font-marcellus text-base font-medium text-choco">
          {title}
        </h4>
      </div>
      <p className="mb-3 text-xs italic leading-relaxed text-muted-warm">
        « {prospect} »
      </p>
      <div className="border-t border-border-soft pt-3 text-sm leading-relaxed text-muted-warm">
        {response}
      </div>
    </motion.div>
  );
}

function TemplateCard({ title, body, index }: { title: string; body: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
      className="group flex gap-4 rounded-2xl border border-border-soft bg-white/40 p-5 transition-all hover:border-brand/30 hover:bg-white"
    >
      <span aria-hidden className="shrink-0 font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
        T{String(index + 1).padStart(2, '0')}
      </span>
      <div>
        <p className="font-marcellus text-base font-medium leading-tight text-choco">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-warm">{body}</p>
      </div>
    </motion.div>
  );
}

function DemoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-medium text-brand-dark underline decoration-brand/40 underline-offset-2 transition-colors hover:text-brand hover:decoration-brand"
    >
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

// =============== PRICING (PDF-aligned) ===============

type Pack = {
  num: string; name: string; priceLabel: string; highlight?: boolean;
  forWho: string; why: string; features: string[];
};

const PACKS: Pack[] = [
  {
    num: '01', name: 'Vitrine Essentiel', priceLabel: '800',
    forWho: 'Restaurateur de quartier, coiffeur, petit institut de beauté, artisan qui démarre, vidéaste vitrine simple, coach indépendant.',
    why: "Solution clé en main pour les commerces qui n'ont pas encore de présence en ligne. Mise en place rapide, prix accessible.",
    features: ['Site vitrine 3 à 5 pages', 'Présentation activité, coordonnées, formulaire de contact', 'Intégration Google Maps', 'Design responsive mobile et desktop', 'Hébergement et nom de domaine 1ère année inclus', 'Optimisation des performances et de la vitesse', 'Formation rapide à la prise en main'],
  },
  {
    num: '02', name: 'Vitrine + Réservation', priceLabel: '1 200 – 1 500', highlight: true,
    forWho: "Restaurateur ambitieux, coach sportif, institut bien établi, vidéaste mariage, professions qui ont besoin d'un agenda en ligne.",
    why: 'Vous transformez vos visiteurs en clients directement réservés depuis le site. Plus de coups de fil pour les rendez-vous.',
    features: ['Tout ce qui est dans Vitrine Essentiel', 'Module de réservation en ligne intégré (rendez-vous ou tables)', 'Galerie photo professionnelle', 'Page menu / prestations détaillées', 'Optimisation SEO local de base', 'Notifications automatiques par email', 'Tableau de bord pour gérer vos disponibilités'],
  },
  {
    num: '03', name: 'Pack Complet', priceLabel: '2 500 +',
    forWho: 'PME locale structurée, artisan ambitieux, commerce multi-sites, professionnel établi qui veut piloter sa visibilité.',
    why: "Vous prenez le contrôle de votre référencement local et de vos performances. Le site devient un vrai levier business.",
    features: ['Tout ce qui est dans Vitrine + Réservation', 'SEO avancé multi-pages + Google My Business optimisé', 'Intégrations sur-mesure (CRM, paiement, calendar, mailing)', 'Module e-commerce léger si pertinent', 'Suivi analytics et tableau de bord performance', 'Pages enrichies (blog, FAQ, témoignages clients)', "Accompagnement éditorial pour le lancement"],
  },
];

function PricingCard({ pack, index }: { pack: Pack; index: number }) {
  const { num, name, priceLabel, highlight, forWho, why, features } = pack;
  if (highlight) {
    // Pack premium : carte CHOCOLAT PLEIN + texte CREME (lisible, intentionnel).
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-choco bg-choco p-8 text-cream shadow-soft-lg lg:scale-[1.03] lg:z-10"
      >
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute right-6 top-0 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 font-inter text-[9px] font-semibold uppercase tracking-[0.18em] text-choco shadow-soft-md">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            Recommandé
          </span>
        </div>
        <div className="relative">
          <p className="mb-1 font-inter text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Pack {num}</p>
          <h3 className="font-marcellus text-2xl font-medium leading-tight tracking-tight">{name}</h3>
          <p className="mt-5 font-inter text-[10px] uppercase tracking-[0.18em] text-cream/50">À partir de</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-marcellus text-4xl font-medium leading-none text-cream md:text-5xl">{priceLabel}</span>
            <span className="font-marcellus text-2xl text-brand">€</span>
            <span className="ml-1 font-inter text-[10px] uppercase tracking-[0.15em] text-cream/50">TTC</span>
          </div>
        </div>
        <p className="relative mt-6 border-l-2 border-brand/40 pl-3 text-xs italic leading-relaxed text-cream/70">{forWho}</p>
        <ul className="relative mt-6 flex-grow space-y-2.5">
          {features.map((f, i) => (
            <motion.li key={f} initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 + i * 0.04 }} className="flex items-start gap-2.5 text-sm leading-relaxed text-cream/85">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span>{f}</span>
            </motion.li>
          ))}
        </ul>
        <div className="relative mt-6 rounded-2xl bg-white/10 p-4">
          <p className="font-inter text-[9px] font-semibold uppercase tracking-[0.2em] text-brand">Pourquoi le choisir</p>
          <p className="mt-1.5 text-xs italic leading-relaxed text-cream/80">{why}</p>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col rounded-3xl border border-border-soft bg-white p-8 shadow-soft transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-soft-md"
    >
      <div>
        <p className="mb-1 font-inter text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-warm">Pack {num}</p>
        <h3 className="font-marcellus text-2xl font-medium leading-tight tracking-tight text-choco">{name}</h3>
        <p className="mt-5 font-inter text-[10px] uppercase tracking-[0.18em] text-muted-warm">À partir de</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-marcellus text-4xl font-medium leading-none text-choco md:text-5xl">{priceLabel}</span>
          <span className="font-marcellus text-2xl text-brand-dark">€</span>
          <span className="ml-1 font-inter text-[10px] uppercase tracking-[0.15em] text-muted-warm">TTC</span>
        </div>
      </div>
      <p className="mt-6 border-l-2 border-brand/40 pl-3 text-xs italic leading-relaxed text-muted-warm">{forWho}</p>
      <ul className="mt-6 flex-grow space-y-2.5">
        {features.map((f, i) => (
          <motion.li key={f} initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 + i * 0.04 }} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-warm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" aria-hidden />
            <span>{f}</span>
          </motion.li>
        ))}
      </ul>
      <div className="mt-6 rounded-2xl bg-brand-soft p-4">
        <p className="font-inter text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-dark">Pourquoi le choisir</p>
        <p className="mt-1.5 text-xs italic leading-relaxed text-muted-warm">{why}</p>
      </div>
    </motion.div>
  );
}

function ModalityCard({ icon, title, lines, footnote }: { icon: React.ReactNode; title: string; lines: { strong: string; text: string }[]; footnote?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4 rounded-3xl border border-border-soft bg-white p-7 shadow-soft"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">{icon}</span>
        <h3 className="font-marcellus text-xl font-medium text-choco">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {lines.map((l) => (
          <p key={l.strong} className="text-sm leading-relaxed text-muted-warm">
            <span className="font-semibold text-brand-dark">{l.strong}</span> {l.text}
          </p>
        ))}
      </div>
      {footnote && <p className="text-xs italic leading-relaxed text-muted-warm">{footnote}</p>}
    </motion.div>
  );
}

// ===========================================================
// Static data
// ===========================================================

const CONTACTS = [
  { name: 'Roodny Pierre', role: 'Direction commerciale', email: 'contact@gndconsulting.fr' },
  { name: 'Production / livraison', role: 'Via la direction commerciale' },
  { name: 'Facturation / admin', role: 'contact@gndconsulting.fr' },
];

const TEMPLATES = [
  { title: 'Script Appel 1', body: <>Ouverture + accroche + qualification + engagement inversé (2 min). Voir section <span className="font-semibold text-brand-dark">03 · Scripts d'appel</span>.</> },
  { title: 'Template Email 1', body: <>Remerciement + lien site démo + rappel du rendez-vous. Liens démo : <DemoLink href="https://opapapoulet-marly-la-ville.vercel.app/">opapapoulet</DemoLink> · <DemoLink href="https://faim-de-semaine-website-v2-qs3p.vercel.app/">faim-de-semaine</DemoLink>.</> },
  { title: 'Template Email relance', body: <>À envoyer 2-3 jours après si pas de retour. Reprendre les mêmes liens démo pour relancer l'intérêt.</> },
  { title: 'Template déclaration contrat signé', body: <>Email à <code className="rounded bg-cream-deep px-1.5 py-0.5 font-inter text-[11px] text-ink-warm">contact@gndconsulting.fr</code> avec les 5 infos obligatoires. Détail dans le Module 07.</> },
];

// 6 objections from the PPTX
type Objection = { title: string; prospect: string; response: React.ReactNode };
const OBJECTIONS: Objection[] = [
  {
    title: 'Prix — « C’est trop cher »',
    prospect: 'Je trouve ça cher.',
    response: (
      <>
        <span className="italic">« Je comprends, le budget c’est important. C’est quoi votre fourchette idéale ? »</span> → écouter → expliquer la structure légère, pas de frais cachés, pas d’abonnement. Proposer l’étalement <span className="font-semibold text-brand-dark">50/50</span>.
      </>
    ),
  },
  {
    title: 'Besoin pas clair',
    prospect: 'Je sais pas si c’est utile pour moi.',
    response: (
      <>
        <span className="italic">« Concrètement, aujourd’hui vos clients ils vous trouvent comment ? »</span> → écouter → <span className="italic">« Ceux qui entendent parler de vous par bouche-à-oreille, s’ils veulent en savoir plus, ils tapent votre nom sur Google. Et là, qu’est-ce qu’ils trouvent ? »</span>
      </>
    ),
  },
  {
    title: 'Confiance — « Je vous connais pas »',
    prospect: 'Je vous connais pas, je sais pas si je peux faire confiance.',
    response: (
      <>
        <span className="italic">« On est une agence de communication digitale basée à Paris. Une fois livré, le site est à vous. Vous avez tous les accès, l’hébergement est à votre nom. On disparaît pas, mais même si c’était le cas, votre site continue de tourner. »</span>
      </>
    ),
  },
  {
    title: 'Timing — « Je vais y réfléchir »',
    prospect: 'Je vais y réfléchir.',
    response: (
      <>
        <span className="italic">« Je comprends, y’a toujours des priorités. Après, le site c’est le genre de truc où une fois que c’est fait, vous n’y pensez plus. Ça travaille pour vous en continu. »</span> → <span className="italic">« Qu’est-ce qui vous ferait dire oui aujourd’hui ? »</span>
      </>
    ),
  },
  {
    title: 'Sur-mesure — besoin spécifique',
    prospect: 'J’ai besoin d’un truc spécifique, pas un site standard.',
    response: (
      <>
        <span className="italic">« OK, vous avez des besoins spécifiques. Dites-moi exactement ce qu’il vous faudrait. »</span> → écouter → <span className="italic">« D’accord. Ça, c’est faisable. Ça sort du site vitrine classique, donc je vous fais un devis adapté. »</span>
      </>
    ),
  },
  {
    title: 'Questions techniques pures',
    prospect: 'J’ai des questions techniques précises.',
    response: (
      <>
        <span className="italic">« Allez-y, posez-moi vos questions, je vous réponds directement. »</span> → répondre simplement, sans jargon. Si trop technique → mettre en lien avec le fondateur.
      </>
    ),
  },
];
