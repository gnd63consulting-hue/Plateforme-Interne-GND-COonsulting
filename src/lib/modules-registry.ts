import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type ModuleMeta = {
  slug: string;
  order: number;
  title: string;
  duration: number; // minutes
  tally_url: string;
};

export type ModuleContent = {
  meta: ModuleMeta;
  body: string;
};

/**
 * Authoritative list of the 7 onboarding modules, in order.
 * Kept in sync with the MDX files in src/content.
 * Source of truth for the UI order and quiz URLs.
 */
export const MODULES: ModuleMeta[] = [
  {
    slug: 'module-01-decouverte-gnd',
    order: 1,
    title: 'Découverte GND Consulting',
    duration: 15,
    tally_url: 'https://tally.so/r/PLACEHOLDER-01',
  },
  {
    slug: 'module-02-offre-sites-vitrines',
    order: 2,
    title: "L'offre Sites Vitrines",
    duration: 20,
    tally_url: 'https://tally.so/r/PLACEHOLDER-02',
  },
  {
    slug: 'module-03-process-de-vente',
    order: 3,
    title: 'Maîtriser le process de vente',
    duration: 20,
    tally_url: 'https://tally.so/r/PLACEHOLDER-03',
  },
  {
    slug: 'module-04-techniques-de-vente',
    order: 4,
    title: 'Techniques de vente & closing',
    duration: 20,
    tally_url: 'https://tally.so/r/PLACEHOLDER-04',
  },
  {
    slug: 'module-05-objections',
    order: 5,
    title: 'Traiter les objections',
    duration: 15,
    tally_url: 'https://tally.so/r/PLACEHOLDER-05',
  },
  {
    slug: 'module-06-bases-techniques',
    order: 6,
    title: 'Bases techniques',
    duration: 15,
    tally_url: 'https://tally.so/r/PLACEHOLDER-06',
  },
  {
    slug: 'module-07-outils-process',
    order: 7,
    title: 'Outils & process quotidiens',
    duration: 15,
    tally_url: 'https://tally.so/r/PLACEHOLDER-07',
  },
];

export function getModuleBySlug(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug);
}

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

/**
 * Load a module's MDX file from disk, returning its frontmatter (merged
 * with the registry) and raw markdown body. Server-only.
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
      // allow the MDX frontmatter to override registry values if needed
      ...(parsed.data as Partial<ModuleMeta>),
      slug,
    } as ModuleMeta,
    body: parsed.content,
  };
}

/**
 * Load an arbitrary MDX file from src/content (used for /ressources).
 */
export function loadContentFile(fileName: string): { data: Record<string, unknown>; body: string } | null {
  const filePath = path.join(CONTENT_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  return { data: parsed.data, body: parsed.content };
}
