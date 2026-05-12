/**
 * Bidirectional status mapping between Notion (~34 fine-grained values) and
 * Supabase (16 practical sales-pipeline values after the mai 2026 extension).
 *
 * Notion is the source of truth at INSERT time (sync-prospects route).
 * Supabase becomes the source of truth once a commercial moves the status on
 * the platform — the change is pushed back to Notion via
 * /api/prospects/[id]/sync-status-to-notion to keep them aligned.
 *
 * Vocabulary alignment (2026-04-26): we added `Devis envoyé` and `Devis signé`
 * to Notion's statut select to give honest names to the late-funnel stages.
 * The old labels `Opportunité` and `Gagné` are still recognised for back-
 * compat (some rows pre-update may still carry them).
 *
 * Mai 2026 extension: 9 new sales-floor statuses added in Notion (34 total)
 * and mirrored 1:1 in Supabase via prospects_status_check (16 values total):
 *   Tentative d'appel       <-> tentative_appel
 *   À rappeler              <-> a_rappeler
 *   En discussion           <-> en_discussion
 *   En attente retour       <-> en_attente_retour
 *   À recontacter           <-> a_recontacter
 *   Pas intéressé           <-> pas_interesse
 *   Coordonnées invalides   <-> coordonnees_invalides
 *   Ne plus démarcher       <-> ne_plus_demarcher
 *   Processus terminé       <-> processus_termine
 */

/**
 * Notion `statut` → Supabase `status`.
 *
 * Used by the sync-prospects route on INSERT only (UPDATE preserves whatever
 * the commercial set on the platform, like notes — see PR #13/#14).
 *
 * Returns null when the Notion status should NOT trigger an INSERT in Supabase
 * (Détecté = not yet qualified, dead statuses are handled separately by the
 * caller via NOTION_DEAD_STATUSES).
 */
export function notionStatusToSupabaseStatus(
  notionStatut: string | null | undefined
): string | null {
  if (!notionStatut) return null;

  const s = notionStatut.trim();

  // Not yet qualified → don't even import
  if (s === 'Détecté') return null;

  // Dead statuses → caller handles DELETE, but we map to 'archived' as a
  // fallback in case caller forgets the dead-set check.
  if (
    s === 'Rejeté' ||
    s === 'Non pertinent' ||
    s === 'REJECT' ||
    s === 'Archivé' ||
    s === 'Archive' ||
    s === 'NURTURE'
  ) {
    return 'archived';
  }

  // Qualified but not yet contacted
  if (
    s === 'En enrichissement' ||
    s === 'Enrichi' ||
    s === 'En scoring' ||
    s === 'Scoré' ||
    s === 'Qualifié' ||
    s === 'GO'
  ) {
    return 'a_contacter';
  }

  // ---- Nouveaux statuts terrain commercial (mai 2026) ----
  // Insérés AVANT les buckets génériques `Contacté` pour ne pas être
  // capturés par les conditions plus larges en dessous.
  if (s === "Tentative d'appel") return 'tentative_appel';
  if (s === 'À rappeler') return 'a_rappeler';
  if (s === 'En discussion') return 'en_discussion';
  if (s === 'En attente retour') return 'en_attente_retour';
  if (s === 'À recontacter') return 'a_recontacter';
  if (s === 'Pas intéressé') return 'pas_interesse';
  if (s === 'Coordonnées invalides') return 'coordonnees_invalides';
  if (s === 'Ne plus démarcher') return 'ne_plus_demarcher';
  if (s === 'Processus terminé') return 'processus_termine';

  // Contacted (any flavor of email/contact step)
  if (
    s === 'Contacté' ||
    s === 'Email généré' ||
    s === 'Email envoyé' ||
    s === 'Email ouvert' ||
    s === 'Email cliqué'
  ) {
    return 'contacte';
  }

  // RDV
  if (s === 'RDV réservé' || s === 'RDV réalisé') {
    return 'rdv_pris';
  }

  // Proposal sent / under signature. Both new label and legacy label are
  // accepted so existing rows tagged with `Opportunité` (e.g. Faim de
  // Semaine) keep mapping cleanly until they're re-tagged.
  if (s === 'Devis envoyé' || s === 'Opportunité') {
    return 'devis_envoye';
  }

  // Won — proposal signed by client. Both new label and legacy `Gagné`
  // (and the historic `Transféré vente`) are accepted.
  if (s === 'Devis signé' || s === 'Gagné' || s === 'Transféré vente') {
    return 'gagne';
  }

  // Lost
  if (s === 'Perdu') {
    return 'perdu';
  }

  // Unknown — let the caller decide (default in DB will kick in if null)
  return null;
}

/**
 * Supabase `status` → Notion `statut`.
 *
 * Used when a commercial changes status on the platform. We push the canonical
 * equivalent back to Notion so the source DB reflects the field reality.
 *
 * Returns null when no Notion equivalent makes sense (the caller should skip
 * the Notion update in that case).
 *
 * Vocabulary aligned 2026-04-26: `devis_envoye` writes `Devis envoyé`
 * (replaces `Opportunité`), and `gagne` writes `Devis signé` (replaces
 * `Gagné`). Both new labels are guaranteed to exist in the Notion select
 * thanks to the API ALTER applied at the same time as this PR.
 *
 * Mai 2026 extension: 9 new sales-floor mappings added 1:1 (the Notion
 * select 'statut' was extended to 34 options via the MCP first).
 */
export function supabaseStatusToNotionStatus(
  supabaseStatus: string | null | undefined
): string | null {
  if (!supabaseStatus) return null;

  switch (supabaseStatus) {
    case 'a_contacter':
      return 'Qualifié';
    case 'contacte':
      return 'Contacté';
    case 'rdv_pris':
      return 'RDV réservé';
    case 'devis_envoye':
      return 'Devis envoyé';
    case 'gagne':
      return 'Devis signé';
    case 'perdu':
      return 'Perdu';
    case 'archived':
      return 'Archivé';
    case 'prospecte':
      // Legacy default — treat like a_contacter
      return 'Qualifié';
    // ---- Nouveaux statuts terrain commercial (mai 2026) ----
    case 'tentative_appel':
      return "Tentative d'appel";
    case 'a_rappeler':
      return 'À rappeler';
    case 'en_discussion':
      return 'En discussion';
    case 'en_attente_retour':
      return 'En attente retour';
    case 'a_recontacter':
      return 'À recontacter';
    case 'pas_interesse':
      return 'Pas intéressé';
    case 'coordonnees_invalides':
      return 'Coordonnées invalides';
    case 'ne_plus_demarcher':
      return 'Ne plus démarcher';
    case 'processus_termine':
      return 'Processus terminé';
    default:
      return null;
  }
}
