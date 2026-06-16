import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Config Vitest minimale pour les helpers PURS du CRM.
 *
 * - environnement `node` : aucun helper testé ne touche au DOM (calcul devis,
 *   rotting, dedup, permissions, CA, pipeline, sanitize Sheets…). On évite donc
 *   le coût d'un environnement jsdom.
 * - alias `@/` → `src/` : reproduit le `paths` de tsconfig.json pour que les
 *   imports `@/lib/...` résolvent comme en prod (les modules purs importent
 *   parfois d'autres modules purs via cet alias, ex. finance → ca-utils).
 * - include limité aux fichiers de test : on ne ramasse JAMAIS de code
 *   server-only par erreur.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
