import type { ActivityKind } from './activities';

/**
 * Couche SUIVI ÉQUIPE — agrégats par commercial (logique PURE, testable).
 *
 * Deux familles d'agrégats, toutes deux nourries via service-role côté page
 * /admin/suivi-equipe (les tables sont RLS owner — un admin ne les verrait pas
 * autrement) :
 *
 *  1. ACTIVITÉ : par owner, comptage des `activities` par `kind` (appels, notes,
 *     emails, rdv, changements de statut) + tâches terminées aujourd'hui, sur
 *     deux fenêtres : « aujourd'hui » (>= début de journée locale) et
 *     « 7 derniers jours » (>= début de journée locale il y a 6 jours).
 *     S'y ajoute la métrique DÉRIVÉE `contacts` (cf. CONTACT_STATUSES).
 *
 *  2. CONNEXIONS : par user, dernière connexion, nb de sessions (7j / 30j),
 *     temps cumulé (total / 7j) et durée moyenne par session, à partir de
 *     `login_sessions` (migration 0056).
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ACTIVITÉ PAR COMMERCIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Statuts dont l'ATTEINTE prouve un contact abouti (une vraie interaction a eu
 * lieu). Dérivés des valeurs réelles de `prospects.status` (cf.
 * src/lib/prospects.ts → ProspectStatus / STATUS_OPTIONS).
 *
 * On compte un « contact » à chaque activité `status_change` dont le NOUVEAU
 * statut (`metadata.to`) appartient à cet ensemble.
 *
 * INCLUS (contact établi / conversation engagée ou plus) :
 *   contacte · en_discussion · a_rappeler · en_attente_retour · rdv_pris ·
 *   devis_envoye · gagne · a_recontacter · pas_interesse
 *   (« pas_interesse » : un refus suppose qu'on a parlé à la cible → contact).
 *
 * EXCLUS :
 *   a_contacter (état initial, aucun contact) · tentative_appel (tentative non
 *   aboutie : répondeur, pas de réponse) · perdu / coordonnees_invalides /
 *   ne_plus_demarcher / processus_termine / archived / prospecte (sorties ou
 *   états techniques qui ne prouvent pas un échange).
 */
export const CONTACT_STATUSES = new Set<string>([
  'contacte',
  'en_discussion',
  'a_rappeler',
  'en_attente_retour',
  'rdv_pris',
  'devis_envoye',
  'gagne',
  'a_recontacter',
  'pas_interesse',
]);

/** Ligne `activities` minimale nécessaire au comptage. */
export type ActivityRow = {
  kind: ActivityKind | string;
  owner_id: string;
  occurred_at: string;
  /** Pour kind='status_change' : { from, to }. Sert au comptage `contacts`. */
  metadata?: Record<string, unknown> | null;
};

/** Ligne `tasks` minimale pour les tâches terminées. */
export type DoneTaskRow = {
  owner_id: string;
  done: boolean;
  done_at: string | null;
};

/** Compteurs d'activité d'un commercial sur une fenêtre temporelle. */
export type ActivityCounts = {
  appels: number;
  /** Passages à un statut de contact (dérivé de status_change.to). */
  contacts: number;
  notes: number;
  emails: number;
  rdv: number;
  changementsStatut: number;
  tachesFaites: number;
  /** Somme des 5 types d'activité + tâches faites (PAS `contacts` : dérivé). */
  total: number;
};

/** Activité d'un commercial sur les deux fenêtres (aujourd'hui / 7 jours). */
export type RepActivity = {
  userId: string;
  name: string;
  today: ActivityCounts;
  week: ActivityCounts;
};

function emptyCounts(): ActivityCounts {
  return {
    appels: 0,
    contacts: 0,
    notes: 0,
    emails: 0,
    rdv: 0,
    changementsStatut: 0,
    tachesFaites: 0,
    total: 0,
  };
}

/** Mappe un `kind` d'activité vers la clé de compteur correspondante. */
function kindKey(kind: string): keyof ActivityCounts | null {
  switch (kind) {
    case 'call':
      return 'appels';
    case 'note':
      return 'notes';
    case 'email':
      return 'emails';
    case 'meeting':
      return 'rdv';
    case 'status_change':
      return 'changementsStatut';
    default:
      return null; // 'task' et kinds inconnus : non comptés ici.
  }
}

/** Lit le nouveau statut (`metadata.to`) d'une activité status_change. */
function statusTo(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  return typeof metadata.to === 'string' ? metadata.to : null;
}

/** Début de journée locale (00:00) pour une date donnée. */
export function startOfDayLocal(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Début de la fenêtre « 7 derniers jours » : 00:00 locale il y a 6 jours
 * (aujourd'hui inclus = 7 jours glissants).
 */
export function startOfWeekWindow(now: Date): Date {
  const d = startOfDayLocal(now);
  d.setDate(d.getDate() - 6);
  return d;
}

/**
 * Agrège l'activité par commercial. Tous les users passés sont seedés (un
 * commercial sans activité apparaît à 0). Tri : plus d'activité 7j d'abord,
 * puis alphabétique.
 */
export function buildRepActivity(
  users: { id: string; name: string }[],
  activities: ActivityRow[],
  doneTasks: DoneTaskRow[],
  now: Date
): RepActivity[] {
  const startToday = startOfDayLocal(now).getTime();
  const startWeek = startOfWeekWindow(now).getTime();

  const map = new Map<string, RepActivity>();
  for (const u of users) {
    map.set(u.id, {
      userId: u.id,
      name: u.name,
      today: emptyCounts(),
      week: emptyCounts(),
    });
  }

  const ensure = (id: string, fallbackName = '—'): RepActivity => {
    let s = map.get(id);
    if (!s) {
      s = {
        userId: id,
        name: fallbackName,
        today: emptyCounts(),
        week: emptyCounts(),
      };
      map.set(id, s);
    }
    return s;
  };

  for (const a of activities) {
    const key = kindKey(a.kind);
    if (!key) continue;
    const t = new Date(a.occurred_at).getTime();
    if (Number.isNaN(t) || t < startWeek) continue;
    const s = ensure(a.owner_id);
    s.week[key]++;
    s.week.total++;
    // Métrique dérivée « contacts » : un status_change vers un statut de
    // contact (NON ajoutée à .total pour ne pas double-compter status_change).
    const isContact =
      a.kind === 'status_change' && CONTACT_STATUSES.has(statusTo(a.metadata) ?? '');
    if (isContact) s.week.contacts++;
    if (t >= startToday) {
      s.today[key]++;
      s.today.total++;
      if (isContact) s.today.contacts++;
    }
  }

  for (const task of doneTasks) {
    if (!task.done || !task.done_at) continue;
    const t = new Date(task.done_at).getTime();
    if (Number.isNaN(t) || t < startWeek) continue;
    const s = ensure(task.owner_id);
    s.week.tachesFaites++;
    s.week.total++;
    if (t >= startToday) {
      s.today.tachesFaites++;
      s.today.total++;
    }
  }

  return [...map.values()].sort(
    (a, b) => b.week.total - a.week.total || a.name.localeCompare(b.name)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONNEXIONS PAR MEMBRE
// ─────────────────────────────────────────────────────────────────────────────

/** Ligne `login_sessions` minimale. */
export type LoginSessionRow = {
  user_id: string;
  started_at: string;
  last_seen_at: string;
};

/** Agrégat de connexions d'un membre. */
export type RepConnections = {
  userId: string;
  name: string;
  derniereConnexionIso: string | null;
  sessions7j: number;
  sessions30j: number;
  tempsTotalMin: number;
  temps7jMin: number;
  dureeMoyenneMin: number;
  /** Sessions récentes (les plus récentes d'abord) pour la ligne dépliable. */
  recentes: { startedAtIso: string; dureeMin: number }[];
};

/** Durée d'une session en minutes (>= 0). */
function sessionMinutes(s: LoginSessionRow): number {
  const start = new Date(s.started_at).getTime();
  const end = new Date(s.last_seen_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  const diff = (end - start) / 60_000;
  return diff > 0 ? Math.round(diff) : 0;
}

/**
 * Agrège les connexions par membre. Seuls les users passés sont seedés (un
 * membre sans aucune session apparaît tout de même, à 0). Tri : connexion la
 * plus récente d'abord, puis alphabétique.
 */
export function buildRepConnections(
  users: { id: string; name: string }[],
  sessions: LoginSessionRow[],
  now: Date,
  recentLimit = 6
): RepConnections[] {
  const start7 = startOfWeekWindow(now).getTime();
  const start30 = startOfDayLocal(now);
  start30.setDate(start30.getDate() - 29);
  const start30Ms = start30.getTime();

  const byUser = new Map<string, LoginSessionRow[]>();
  for (const s of sessions) {
    const arr = byUser.get(s.user_id);
    if (arr) arr.push(s);
    else byUser.set(s.user_id, [s]);
  }

  const out: RepConnections[] = users.map((u) => {
    const list = (byUser.get(u.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.last_seen_at).getTime() -
          new Date(a.last_seen_at).getTime()
      );

    let derniereConnexionIso: string | null = null;
    let sessions7j = 0;
    let sessions30j = 0;
    let tempsTotalMin = 0;
    let temps7jMin = 0;

    for (const s of list) {
      const startedMs = new Date(s.started_at).getTime();
      const seenMs = new Date(s.last_seen_at).getTime();
      const mins = sessionMinutes(s);
      tempsTotalMin += mins;
      if (
        derniereConnexionIso == null ||
        seenMs > new Date(derniereConnexionIso).getTime()
      ) {
        derniereConnexionIso = s.last_seen_at;
      }
      if (!Number.isNaN(startedMs)) {
        if (startedMs >= start7) {
          sessions7j++;
          temps7jMin += mins;
        }
        if (startedMs >= start30Ms) {
          sessions30j++;
        }
      }
    }

    const dureeMoyenneMin = sessions7j > 0 ? Math.round(temps7jMin / sessions7j) : 0;

    return {
      userId: u.id,
      name: u.name,
      derniereConnexionIso,
      sessions7j,
      sessions30j,
      tempsTotalMin,
      temps7jMin,
      dureeMoyenneMin,
      recentes: list.slice(0, recentLimit).map((s) => ({
        startedAtIso: s.started_at,
        dureeMin: sessionMinutes(s),
      })),
    };
  });

  return out.sort((a, b) => {
    const ta = a.derniereConnexionIso
      ? new Date(a.derniereConnexionIso).getTime()
      : 0;
    const tb = b.derniereConnexionIso
      ? new Date(b.derniereConnexionIso).getTime()
      : 0;
    return tb - ta || a.name.localeCompare(b.name);
  });
}

/** Formate une durée en minutes en libellé court FR (« 1 h 25 », « 40 min », « — »). */
export function formatMinutes(min: number): string {
  if (!min || min <= 0) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Date + heure relative/absolue courte FR pour la dernière connexion. */
export function formatLastSeen(iso: string | null, now: Date): string {
  if (!iso) return 'Jamais';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ === 1) return 'Hier';
  if (diffJ < 7) return `Il y a ${diffJ} j`;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}
