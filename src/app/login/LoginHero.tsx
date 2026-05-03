'use client';

import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function LoginHero() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-2xl"
    >
      <motion.div variants={item} className="mb-6 flex items-center gap-2">
        <span className="h-px w-10 bg-gnd-amber" />
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-gnd-amber">
          GND Consulting
        </span>
      </motion.div>

      <motion.h1
        variants={item}
        className="font-display text-display-xl font-medium leading-[0.95] tracking-tight text-gnd-bronze"
      >
        Apprends.
        <br />
        <span className="italic text-gnd-amber">Convaincs.</span>
        <br />
        Signe.
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-8 max-w-md text-pretty text-base leading-relaxed text-gnd-bronze-soft sm:text-lg"
      >
        L&apos;espace de formation, de ressources et de pilotage des
        commerciaux GND. Pensé pour avancer vite, sans bruit.
      </motion.p>

      <motion.div
        variants={item}
        className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-xs text-gnd-bronze-soft"
      >
        <Stat label="Modules" value="7" />
        <Divider />
        <Stat label="De l&apos;appel à la signature" value="Process commercial" />
        <Divider />
        <Stat label="Pilotés en temps réel" value="Notion sync" />
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-2xl font-medium text-gnd-bronze">
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gnd-bronze-soft">
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="h-8 w-px bg-gnd-bronze/15" />;
}
