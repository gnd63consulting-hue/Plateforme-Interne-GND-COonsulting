import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type ModuleMeta = {
  slug: string;
  order: number;
  title: string;
  duration: number; // minutes
};

export type ModuleContent = {
  meta: ModuleMeta;
  body: string;
};

/**
 * Liste de référence des 7 modules d'onboarding, dans l'ordre.
 * Synchronisée avec les fichiers MDX de src/content.
 * Source de vérité pour l'ordre, le titre et la durée affichée.
 *
 * Mapping volontaire (slug → thématique du brief Quiz Natif v1) :
 *   module-01-decouverte-gnd       → M1 Découverte GND          (10 questions)
 *   module-02-offre-sites-vitrines → M2 L'offre Sites Vitrines  (12 questions)
 *   module-03-process-vente        → M3 Le process de vente     (12 questions)
 *   module-04-techniques-vente     → M4 Techniques de vente     (10 questions)
 *   module-05-objections           → M5 Traitement des objections (10 questions)
 *   module-06-bases-techniques     → M6 Bases techniques        (10 questions)
 *   module-07-outils-process       → M7 Outils & process        ( 8 questions)
 */
export const MODULES: ModuleMeta[] = [
  {
    slug: 'module-01-decouverte-gnd',
    order: 1,
    title: 'Découverte GND',
    duration: 12,
  },
  {
    slug: 'module-02-offre-sites-vitrines',
    order: 2,
    title: "L'offre Sites Vitrines",
    duration: 17,
  },
  {
    slug: 'module-03-process-vente',
    order: 3,
    title: 'Le process de vente',
    duration: 17,
  },
  {
    slug: 'module-04-techniques-vente',
    order: 4,
    title: 'Techniques de vente',
    duration: 17,
  },
  {
    slug: 'module-05-objections',
    order: 5,
    title: 'Traitement des objections',
    duration: 15,
  },
  {
    slug: 'module-06-bases-techniques',
    order: 6,
    title: 'Bases techniques',
    duration: 15,
  },
  {
    slug: 'module-07-outils-process',
    order: 7,
    title: 'Outils & process',
    duration: 12,
  },
];

export function getModuleBySlug(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug);
}

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

/**
 * Charge le MDX d'un module depuis le disque, retourne le frontmatter
 * fusionné avec le registry et le markdown brut. Server-only.
 */
export function loadModuleContent(slug: string): ModuleContent | null {
  const meta = getModuleBySlug(slug);
  if (!meta) return null;

  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);

  return {
    meta: {
      ...meta,
      ...(parsed.data as Partial<ModuleMeta>),
      slug,
    } as ModuleMeta,
    body: parsed.content,
  };
}

/**
 * Charge un MDX arbitraire de src/content (utilisé pour /ressources).
 */
export function loadContentFile(
  fileName: string
): { data: Record<string, unknown>; body: string } | null {
  const filePath = path.join(CONTENT_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  return { data: parsed.data, body: parsed.content };
}
