import { bucketForDue, effectiveDue, type Task } from './tasks';
import {
  DIGEST_CLOSED_STATUSES,
  prospectOwnerId,
  type DigestProspectRow,
} from './digest';

/**
 * Couche MANAGER (Sprint 20) — supervision equipe.
 *
 * Agrege par commercial le nombre de relances + taches DUES (en retard /
 * aujourd'hui), pour : (a) la page admin /admin/suivi-equipe, (b) le digest
 * email manager (admins prevenus des retards de l'equipe). Logique PURE.
 */

export type RepSummary = {
  userId: string;
  name: string;
  relancesOverdue: number;
  relancesToday: number;
  tasksOverdue: number;
  tasksToday: number;
  oldestOverdueIso: string | null;
  overdueTotal: number;
  totalDue: number;
};

export type DigestUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function displayName(u: DigestUserRow): string {
  return u.full_name ?? (u.email ? u.email.split('@')[0] : '—');
}

/**
 * Construit un resume par commercial. Tous les users passes sont seedes (un
 * commercial sans retard apparait avec des 0 — « tout le monde est suivi »).
 * Tri : plus de retards d'abord, puis plus d'actions dues, puis alphabetique.
 */
export function buildRepSummaries(
  users: DigestUserRow[],
  prospects: DigestProspectRow[],
  tasks: Task[],
  now: Date
): RepSummary[] {
  const map = new Map<string, RepSummary>();
  const nameOf = new Map(users.map((u) => [u.id, displayName(u)]));

  const ensure = (id: string): RepSummary => {
    let s = map.get(id);
    if (!s) {
      s = {
        userId: id,
        name: nameOf.get(id) ?? '—',
        relancesOverdue: 0,
        relancesToday: 0,
        tasksOverdue: 0,
        tasksToday: 0,
        oldestOverdueIso: null,
        overdueTotal: 0,
        totalDue: 0,
      };
      map.set(id, s);
    }
    return s;
  };

  for (const u of users) ensure(u.id);

  const noteOldest = (s: RepSummary, iso: string | null) => {
    if (iso && (!s.oldestOverdueIso || iso < s.oldestOverdueIso)) {
      s.oldestOverdueIso = iso;
    }
  };

  for (const p of prospects) {
    if (DIGEST_CLOSED_STATUSES.has(p.status)) continue;
    const bucket = bucketForDue(p.next_action_at, now);
    if (bucket !== 'overdue' && bucket !== 'today') continue;
    const owner = prospectOwnerId(p);
    if (!owner) continue;
    const s = ensure(owner);
    if (bucket === 'overdue') {
      s.relancesOverdue++;
      noteOldest(s, p.next_action_at);
    } else {
      s.relancesToday++;
    }
  }

  for (const t of tasks) {
    if (t.done) continue;
    const due = effectiveDue(t);
    const bucket = bucketForDue(due, now);
    if (bucket !== 'overdue' && bucket !== 'today') continue;
    const s = ensure(t.owner_id);
    if (bucket === 'overdue') {
      s.tasksOverdue++;
      noteOldest(s, due);
    } else {
      s.tasksToday++;
    }
  }

  for (const s of map.values()) {
    s.overdueTotal = s.relancesOverdue + s.tasksOverdue;
    s.totalDue = s.overdueTotal + s.relancesToday + s.tasksToday;
  }

  return [...map.values()].sort(
    (a, b) =>
      b.overdueTotal - a.overdueTotal ||
      b.totalDue - a.totalDue ||
      a.name.localeCompare(b.name)
  );
}

/** Anciennete en jours d'un retard (>= 0), ou null. */
export function overdueAgeDays(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(iso);
  const diff = Math.floor((start.getTime() - d.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Email MANAGER : recap des commerciaux en retard, destine aux admins.
 * N'inclut que les reps avec au moins 1 retard (alerte actionnable).
 */
export function renderManagerEmail(opts: {
  adminFirstName: string;
  summaries: RepSummary[];
  appUrl: string;
  now: Date;
}): { subject: string; html: string; text: string } {
  const { adminFirstName, summaries, appUrl, now } = opts;
  const flagged = summaries.filter((s) => s.overdueTotal > 0);
  const totalOverdue = flagged.reduce((acc, s) => acc + s.overdueTotal, 0);
  const subject = `Suivi équipe — ${totalOverdue} action${
    totalOverdue > 1 ? 's' : ''
  } en retard (${flagged.length} commercial${flagged.length > 1 ? 'aux' : ''})`;

  const row = (s: RepSummary) => {
    const age = overdueAgeDays(s.oldestOverdueIso, now);
    const ageLabel = age == null ? '—' : age === 0 ? "aujourd'hui" : `${age} j`;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E2D5C3;font-family:Georgia,serif;font-size:14px;color:#532418;">${esc(
        s.name
      )}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E2D5C3;text-align:center;font-weight:700;color:#A04A4A;">${
        s.relancesOverdue
      }</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E2D5C3;text-align:center;font-weight:700;color:#A04A4A;">${
        s.tasksOverdue
      }</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E2D5C3;text-align:center;color:#7B665C;">${
        s.relancesToday + s.tasksToday
      }</td>
      <td style="padding:10px 12px;border-bottom:1px solid #E2D5C3;text-align:center;color:#B5601C;font-size:12px;">${ageLabel}</td>
    </tr>`;
  };

  const html = `<!doctype html><html><body style="margin:0;background:#F6EFE7;padding:24px;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E2D5C3;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#B5601C;">GND CRM · Suivi équipe</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:23px;font-weight:500;color:#532418;">Bonjour ${esc(
            adminFirstName
          )},</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#7B665C;">${
            flagged.length === 0
              ? "Personne n'est en retard. L'équipe est à jour. 👌"
              : `<b style="color:#A04A4A;">${flagged.length} commercial${
                  flagged.length > 1 ? 'aux' : ''
                }</b> ${
                  flagged.length > 1 ? 'ont' : 'a'
                } des relances/tâches en retard.`
          }</p>
        </td></tr>
        ${
          flagged.length === 0
            ? ''
            : `<tr><td style="padding:12px 28px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead><tr>
              <th style="text-align:left;padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9A8A80;border-bottom:1px solid #E2D5C3;">Commercial</th>
              <th style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9A8A80;border-bottom:1px solid #E2D5C3;">Relances retard</th>
              <th style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9A8A80;border-bottom:1px solid #E2D5C3;">Tâches retard</th>
              <th style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9A8A80;border-bottom:1px solid #E2D5C3;">Aujourd'hui</th>
              <th style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9A8A80;border-bottom:1px solid #E2D5C3;">Plus vieux</th>
            </tr></thead>
            <tbody>${flagged.map(row).join('')}</tbody>
          </table>
        </td></tr>`
        }
        <tr><td style="padding:16px 28px 28px;">
          <a href="${esc(
            appUrl
          )}/admin/suivi-equipe" style="display:inline-block;background:#F39253;color:#532418;font-weight:700;font-size:13px;text-decoration:none;padding:11px 22px;border-radius:999px;">Ouvrir le suivi équipe →</a>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#9A8A80;">GND Consulting — notification automatique (admin). Ne pas répondre.</p>
    </td></tr></table>
  </body></html>`;

  const text = [
    `Bonjour ${adminFirstName},`,
    flagged.length === 0
      ? "Personne n'est en retard. L'équipe est à jour."
      : `${flagged.length} commercial(aux) en retard :`,
    '',
    ...flagged.map(
      (s) =>
        `- ${s.name} : ${s.relancesOverdue} relance(s) + ${s.tasksOverdue} tâche(s) en retard`
    ),
    '',
    `Suivi: ${appUrl}/admin/suivi-equipe`,
  ].join('\n');

  return { subject, html, text };
}
