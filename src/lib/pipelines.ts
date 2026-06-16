/**
 * Multi-pipeline (Phase 1) — helpers PURS + types pour les "lignes de metier"
 * (boards) : Sites web / Mariage / Audiovisuel, etc.
 *
 * ⚠️ NE PAS confondre avec `src/lib/pipeline.ts` (SINGULIER) qui definit les
 * STAGES/colonnes Kanban STATIQUES. Ce fichier-ci gere les BOARDS multiples ;
 * les stages restent identiques quel que soit le board (la dynamisation des
 * stages par pipeline est la Phase 2, hors scope).
 *
 * Le DATA-FETCH (requete Supabase) vit cote serveur dans la page
 * `prospects/page.tsx` ; ici on garde uniquement des helpers purs et testables
 * (selection du defaut, filtrage par pipeline) + les types partages.
 *
 * Schema (migration 0024) :
 *   pipelines(id, name, position, is_default, color, created_at)
 *   prospects.pipeline_id UUID NULL  (NULL ⇒ traite comme le pipeline defaut)
 */

/** Une ligne de metier (board) telle que stockee en base. */
export type Pipeline = {
  id: string;
  name: string;
  position: number;
  is_default: boolean;
  color: string | null;
  created_at: string;
};

/** Colonnes a demander dans `select(...)` pour charger un pipeline complet. */
export const PIPELINE_SELECT_COLUMNS =
  'id, name, position, is_default, color, created_at';

/**
 * Tri stable des pipelines pour l'affichage du selecteur : par `position`
 * croissante, puis par `created_at` (depart egal), puis par `name` (ultime
 * depart). Ne mute PAS l'entree (retourne une copie triee).
 */
export function sortPipelines(pipelines: Pipeline[]): Pipeline[] {
  return [...pipelines].sort(
    (a, b) =>
      a.position - b.position ||
      a.created_at.localeCompare(b.created_at) ||
      a.name.localeCompare(b.name, 'fr')
  );
}

/**
 * Pipeline par defaut d'une liste : le premier `is_default` (apres tri stable),
 * sinon le tout premier pipeline, sinon `null` (liste vide). Sert de selection
 * initiale du board et de cible des fiches sans `pipeline_id`.
 */
export function defaultPipeline(pipelines: Pipeline[]): Pipeline | null {
  const sorted = sortPipelines(pipelines);
  return sorted.find((p) => p.is_default) ?? sorted[0] ?? null;
}

/** Id du pipeline par defaut, ou `null` si aucun pipeline. */
export function defaultPipelineId(pipelines: Pipeline[]): string | null {
  return defaultPipeline(pipelines)?.id ?? null;
}

/**
 * Le `pipeline_id` EFFECTIF d'une fiche : sa valeur si posee, sinon le defaut
 * (une fiche `pipeline_id = NULL` est traitee comme appartenant au defaut).
 * `defaultId` peut etre `null` (aucun pipeline) → on renvoie alors la valeur
 * brute (eventuellement null).
 */
export function effectivePipelineId(
  prospectPipelineId: string | null | undefined,
  defaultId: string | null
): string | null {
  return prospectPipelineId ?? defaultId;
}

/**
 * Filtre une liste de fiches par pipeline selectionne, en traitant les fiches
 * `pipeline_id = NULL` comme appartenant au pipeline par defaut.
 *
 * - `selectedId === null`  → AUCUN filtrage (toutes les fiches), utile si la
 *   base ne contient encore aucun pipeline.
 * - `selectedId === defaultId` → on inclut aussi les fiches sans pipeline_id
 *   (NULL), pour que le comportement avec un seul pipeline soit IDENTIQUE a
 *   aujourd'hui (toutes les fiches restent visibles).
 *
 * Generique sur `{ pipeline_id?: string | null }` pour rester testable sans
 * dependre du type Prospect complet.
 */
export function filterByPipeline<T extends { pipeline_id?: string | null }>(
  prospects: T[],
  selectedId: string | null,
  defaultId: string | null
): T[] {
  if (selectedId === null) return prospects;
  return prospects.filter(
    (p) => effectivePipelineId(p.pipeline_id, defaultId) === selectedId
  );
}
