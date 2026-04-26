/**
 * Bidirectional status mapping between Notion (~20 fine-grained values) and
 * Supabase (8 practical sales-pipeline values).
 *
 * Notion is the source of truth at INSERT time (sync-prospects route).
 * Supabase becomes the source of truth once a commercial moves the status on
 * the platform — the change is pushed back to Notion via
 * /api/prospects/[id]/sync-status-to-notion to keep them aligned.
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

  // Active opportunity (proposal sent / under negotiation)
  if (s === 'Opportunité') {
    return 'devis_envoye';
  }

  // Won
  if (s === 'Gagné' || s === 'Transféré vente') {
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
      return 'Opportunité';
    case 'gagne':
      return 'Gagné';
    case 'perdu':
      return 'Perdu';
    case 'archived':
      return 'Archivé';
    case 'prospecte':
      // Legacy default — treat like a_contacter
      return 'Qualifié';
    default:
      return null;
  }
}
