/**
 * Déduplication des prospects — types & helpers partagés (CRM Sprint 3).
 *
 * La détection elle-même tourne côté serveur (page admin `/admin/doublons`,
 * client service-role) : on charge les prospects actifs, on les groupe par
 * `email_norm` exact OU par les 9 derniers chiffres de `phone_norm`, et on
 * écarte les groupes dont la `signature` figure dans `dedup_dismissed`.
 *
 * Les colonnes `email_norm` / `phone_norm` sont des colonnes générées STORED
 * (migration 0013) — on ne renormalise donc rien en JS, on consomme la valeur
 * Postgres telle quelle. Le helper `phoneKey9` reproduit la logique
 * `right(phone_norm, 9)` utilisée pour le rapprochement téléphonique.
 *
 * Triage « entreprises différentes » : un groupe n'est signalé que s'il
 * couvre 2+ noms de sociétés DISTINCTS partageant le même email/tél. Deux
 * fiches d'une même société (même standard téléphonique p.ex.) ne sont donc
 * pas remontées comme doublon à arbitrer. Un même numéro partagé entre deux
 * sociétés distinctes PEUT être légitime (centre d'affaires, secrétariat
 * mutualisé…) : la vue ne décide rien, elle expose le rapprochement à
 * l'humain qui tranche.
 */

/** Critère de rapprochement d'un groupe de doublons. */
export type DedupCriterion = 'email' | 'phone';

/** Fiche minimale affichée dans un groupe de doublons. */
export type DedupProspect = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  next_action_at: string | null;
  created_at: string;
};

/** Un groupe de doublons détecté : un critère commun + 2+ fiches. */
export type DedupGroup = {
  /** Clé stable du groupe (ex. 'email:jean@x.fr' / 'phone:612345678'). */
  signature: string;
  criterion: DedupCriterion;
  /** Valeur partagée affichée (email complet ou tél normalisé). */
  value: string;
  prospects: DedupProspect[];
  /** id suggéré pour la fiche maître (la plus complète, puis la plus ancienne). */
  suggestedMasterId: string;
};

/** Clé téléphone = 9 derniers chiffres de phone_norm (≥ 9 chiffres requis). */
export function phoneKey9(phoneNorm: string | null | undefined): string | null {
  if (!phoneNorm) return null;
  const digits = phoneNorm.replace(/\D/g, '');
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

/** Signature stable d'un groupe à partir du critère et de sa clé. */
export function signatureFor(criterion: DedupCriterion, key: string): string {
  return `${criterion}:${key}`;
}

/** Clé de société normalisée : minuscules, espaces compressés, trimé.
 *  Sert à compter les entreprises DISTINCTES d'un groupe (cf. buildDedupGroups).
 *  Renvoie null si le nom est vide. */
export function companyKey(companyName: string | null | undefined): string | null {
  if (!companyName) return null;
  const key = companyName.toLowerCase().replace(/\s+/g, ' ').trim();
  return key || null;
}

/** Score de complétude d'une fiche — sert à proposer la fiche maître.
 *  Plus la fiche est renseignée, plus le score est haut. À score égal, le
 *  caller départage par ancienneté (created_at le plus ancien gagne). */
export function completenessScore(p: DedupProspect): number {
  let score = 0;
  if (p.email) score += 1;
  if (p.phone) score += 1;
  if (p.contact_name) score += 1;
  if (p.city) score += 1;
  if (p.notes && p.notes.trim()) score += 2;
  if (p.next_action_at) score += 1;
  if (p.assigned_to) score += 1;
  return score;
}

/**
 * Choisit la fiche maître d'un groupe : la plus complète ; à complétude
 * égale, la plus ancienne (created_at). Déterministe.
 */
export function pickMaster(prospects: DedupProspect[]): string {
  let best = prospects[0];
  let bestScore = completenessScore(best);
  for (const p of prospects.slice(1)) {
    const s = completenessScore(p);
    if (
      s > bestScore ||
      (s === bestScore && new Date(p.created_at) < new Date(best.created_at))
    ) {
      best = p;
      bestScore = s;
    }
  }
  return best.id;
}

/** Nombre d'entreprises DISTINCTES (par companyKey) dans une liste de fiches.
 *  Les fiches sans nom de société comptent chacune comme une entité distincte
 *  (on ne les fusionne pas aveuglément sous une clé vide). */
export function distinctCompanyCount(prospects: DedupProspect[]): number {
  let nullCount = 0;
  const keys = new Set<string>();
  for (const p of prospects) {
    const k = companyKey(p.company_name);
    if (k) keys.add(k);
    else nullCount += 1;
  }
  return keys.size + nullCount;
}

/**
 * Construit les groupes de doublons à partir d'une liste de prospects actifs.
 *
 * Règles :
 *   - rapproche par `email_norm` exact (non null), OU par les 9 derniers
 *     chiffres de `phone_norm` (non null, ≥ 9 chiffres) ;
 *   - un groupe valide compte ≥ 2 fiches ET couvre ≥ 2 entreprises
 *     DISTINCTES (sinon ce sont des fiches de la même société, hors périmètre
 *     de cette revue) ;
 *   - les signatures présentes dans `dismissed` sont exclues ;
 *   - tri des groupes par taille décroissante (les plus gros d'abord),
 *     limité à `maxGroups`.
 *
 * Une même fiche peut apparaître dans 2 groupes (un par email, un par tél) —
 * c'est volontaire : l'admin traite chaque rapprochement indépendamment.
 */
export function buildDedupGroups(
  rows: Array<DedupProspect & { email_norm: string | null; phone_norm: string | null }>,
  dismissed: Set<string>,
  maxGroups = 200
): DedupGroup[] {
  const byEmail = new Map<string, DedupProspect[]>();
  const byPhone = new Map<string, DedupProspect[]>();

  for (const r of rows) {
    if (r.email_norm) {
      const arr = byEmail.get(r.email_norm) ?? [];
      arr.push(r);
      byEmail.set(r.email_norm, arr);
    }
    const pk = phoneKey9(r.phone_norm);
    if (pk) {
      const arr = byPhone.get(pk) ?? [];
      arr.push(r);
      byPhone.set(pk, arr);
    }
  }

  const groups: DedupGroup[] = [];

  const collect = (
    map: Map<string, DedupProspect[]>,
    criterion: DedupCriterion
  ) => {
    for (const [key, list] of map) {
      if (list.length < 2) continue;
      // Revue « entreprises différentes » : on ignore les rapprochements qui ne
      // couvrent qu'une seule société (doublon intra-société, hors périmètre).
      if (distinctCompanyCount(list) < 2) continue;
      const signature = signatureFor(criterion, key);
      if (dismissed.has(signature)) continue;
      groups.push({
        signature,
        criterion,
        value:
          criterion === 'email'
            ? key
            : (list.find((p) => p.phone)?.phone ?? key),
        prospects: list
          .slice()
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        suggestedMasterId: pickMaster(list),
      });
    }
  };

  collect(byEmail, 'email');
  collect(byPhone, 'phone');

  groups.sort((a, b) => b.prospects.length - a.prospects.length);
  return groups.slice(0, maxGroups);
}
