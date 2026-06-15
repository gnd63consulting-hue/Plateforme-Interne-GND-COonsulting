import { labelForStatus } from './prospects';
import { bucketForDue, effectiveDue, formatDateTime, type Task } from './tasks';

/**
 * Digest email du matin (Sprint 19) — logique PURE + rendu HTML.
 *
 * La route /api/notifications/digest (cron) fait les requetes service-role et
 * l'envoi Resend ; ce module ne fait que transformer des lignes en items et
 * rendre l'email. Aucun acces reseau ici (testable, sans cle).
 */

/** Statuts clos : une relance sur un prospect clos n'est plus actionnable. */
export const DIGEST_CLOSED_STATUSES = new Set<string>([
  'gagne',
  'perdu',
  'archived',
  'pas_interesse',
  'coordonnees_invalides',
  'ne_plus_demarcher',
  'processus_termine',
]);

export type DigestBucket = 'overdue' | 'today';

export type DigestItem = {
  kind: 'relance' | 'task';
  bucket: DigestBucket;
  title: string;
  sub: string;
  href: string;
  due: string | null;
};

export type DigestProspectRow = {
  id: string;
  company_name: string;
  status: string;
  next_action_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
};

/** Owner d'un prospect pour le digest : assigned_to prioritaire, sinon created_by. */
export function prospectOwnerId(p: DigestProspectRow): string | null {
  return p.assigned_to ?? p.created_by ?? null;
}

export function prospectToDigestItem(
  p: DigestProspectRow,
  baseUrl: string,
  now: Date
): DigestItem | null {
  if (DIGEST_CLOSED_STATUSES.has(p.status)) return null;
  const bucket = bucketForDue(p.next_action_at, now);
  if (bucket !== 'overdue' && bucket !== 'today') return null;
  return {
    kind: 'relance',
    bucket,
    title: p.company_name,
    sub: `Relance · ${labelForStatus(p.status)}`,
    href: `${baseUrl}/prospects/${p.id}`,
    due: p.next_action_at,
  };
}

export function taskToDigestItem(
  t: Task,
  baseUrl: string,
  now: Date
): DigestItem | null {
  if (t.done) return null;
  const due = effectiveDue(t);
  const bucket = bucketForDue(due, now);
  if (bucket !== 'overdue' && bucket !== 'today') return null;
  return {
    kind: 'task',
    bucket,
    title: t.title,
    sub: due ? `Tâche · ${formatDateTime(due)}` : 'Tâche',
    href: t.prospect_id
      ? `${baseUrl}/prospects/${t.prospect_id}`
      : `${baseUrl}/prospects/taches`,
    due,
  };
}

export function sortDigestItems(items: DigestItem[]): DigestItem[] {
  return [...items].sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket === 'overdue' ? -1 : 1;
    const da = a.due ? new Date(a.due).getTime() : Infinity;
    const db = b.due ? new Date(b.due).getTime() : Infinity;
    return da - db;
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Rend le sujet + HTML + texte brut du digest pour un commercial. */
export function renderDigestEmail(opts: {
  firstName: string;
  items: DigestItem[];
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { firstName, items, appUrl } = opts;
  const overdue = items.filter((i) => i.bucket === 'overdue');
  const today = items.filter((i) => i.bucket === 'today');
  const n = items.length;
  const subject = `${n} action${n > 1 ? 's' : ''} à traiter aujourd'hui — GND CRM`;

  const row = (it: DigestItem) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #E2D5C3;">
      <a href="${esc(it.href)}" style="text-decoration:none;">
        <span style="display:inline-block;font-family:Georgia,serif;font-size:15px;color:#532418;">${esc(it.title)}</span><br/>
        <span style="font-size:12px;color:#7B665C;">${esc(it.sub)}</span>
      </a>
    </td></tr>`;

  const section = (label: string, color: string, list: DigestItem[]) =>
    list.length === 0
      ? ''
      : `<p style="margin:18px 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${color};">${esc(
          label
        )} · ${list.length}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${list
          .map(row)
          .join('')}</table>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F6EFE7;padding:24px;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2D5C3;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#B5601C;">GND CRM · Ton matin</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:500;color:#532418;">Bonjour ${esc(
            firstName
          )},</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#7B665C;">Tu as <b style="color:#B5601C;">${n} action${
            n > 1 ? 's' : ''
          }</b> à traiter aujourd'hui.</p>
        </td></tr>
        <tr><td style="padding:0 28px 8px;">
          ${section('En retard', '#A04A4A', overdue)}
          ${section("Aujourd'hui", '#B5601C', today)}
        </td></tr>
        <tr><td style="padding:16px 28px 28px;">
          <a href="${esc(
            appUrl
          )}/mon-tableau" style="display:inline-block;background:#F39253;color:#532418;font-weight:700;font-size:13px;text-decoration:none;padding:11px 22px;border-radius:999px;">Ouvrir mon tableau →</a>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#9A8A80;">GND Consulting — notification automatique. Ne pas répondre.</p>
    </td></tr></table>
  </body></html>`;

  const text = [
    `Bonjour ${firstName},`,
    `Tu as ${n} action${n > 1 ? 's' : ''} à traiter aujourd'hui.`,
    '',
    ...(overdue.length
      ? ['EN RETARD:', ...overdue.map((i) => `- ${i.title} (${i.sub})`), '']
      : []),
    ...(today.length
      ? ["AUJOURD'HUI:", ...today.map((i) => `- ${i.title} (${i.sub})`), '']
      : []),
    `Ouvrir: ${appUrl}/mon-tableau`,
  ].join('\n');

  return { subject, html, text };
}
