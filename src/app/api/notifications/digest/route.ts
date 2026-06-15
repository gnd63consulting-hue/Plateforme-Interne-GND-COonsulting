import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { TASK_SELECT_COLUMNS, type Task } from '@/lib/tasks';
import {
  prospectOwnerId,
  prospectToDigestItem,
  taskToDigestItem,
  sortDigestItems,
  renderDigestEmail,
  type DigestItem,
  type DigestProspectRow,
} from '@/lib/digest';
import { buildRepSummaries, renderManagerEmail } from '@/lib/manager-digest';

export const dynamic = 'force-dynamic';

/**
 * Digest email du matin (Sprint 19) + couche manager (Sprint 20).
 *
 * GET /api/notifications/digest — declenche par Vercel Cron (quotidien, cf.
 * vercel.json). Service-role UNIQUEMENT (bypass RLS) : on balaie relances +
 * taches dues de TOUS les commerciaux et on envoie a chacun SON recap, puis aux
 * admins un recap des retards de l'equipe.
 *
 * DORMANT par defaut : si RESEND_API_KEY n'est pas defini, la route ne fait
 * RIEN (skipped) et ne plante jamais. Envoi sortant uniquement (aucune boite lue).
 * Auth : identique a /api/sequences/tick (CRON_SECRET / ADMIN_SYNC_SECRET).
 */

const PROSPECT_COLS =
  'id, company_name, status, next_action_at, assigned_to, created_by';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function authenticate(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const adminSecret = process.env.ADMIN_SYNC_SECRET;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true;
  return false;
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
  }
}

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  active: boolean | null;
};

function pushItem(map: Map<string, DigestItem[]>, key: string, item: DigestItem) {
  const list = map.get(key);
  if (list) list.push(item);
  else map.set(key, [item]);
}

async function runDigest() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dormant : pas de cle => no-op propre, jamais d'erreur.
    return {
      skipped: true,
      reason: 'RESEND_API_KEY absent — digest en dormance (rien envoye).',
    };
  }
  const from =
    process.env.RESEND_FROM ?? 'GND CRM <notifications@gndconsulting.fr>';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://plateforme-interne-gnd-c-oonsulting.vercel.app';

  const admin = createAdminClient();
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + 1);
  const endIso = end.toISOString();

  const [{ data: usersRaw }, { data: prosRaw }, { data: tasksRaw }] =
    await Promise.all([
      admin.from('users').select('id, full_name, email, role, active'),
      admin
        .from('prospects')
        .select(PROSPECT_COLS)
        .not('next_action_at', 'is', null)
        .lte('next_action_at', endIso)
        .limit(5000),
      admin.from('tasks').select(TASK_SELECT_COLUMNS).eq('done', false).limit(10000),
    ]);

  const users = (usersRaw ?? []) as unknown as UserRow[];
  const userById = new Map(users.map((u) => [u.id, u]));

  // Regroupe les items dus par owner.
  const byUser = new Map<string, DigestItem[]>();
  for (const p of (prosRaw ?? []) as unknown as DigestProspectRow[]) {
    const item = prospectToDigestItem(p, appUrl, now);
    if (!item) continue;
    const owner = prospectOwnerId(p);
    if (!owner) continue;
    pushItem(byUser, owner, item);
  }
  for (const t of (tasksRaw ?? []) as unknown as Task[]) {
    const item = taskToDigestItem(t, appUrl, now);
    if (!item) continue;
    pushItem(byUser, t.owner_id, item);
  }

  let sent = 0;
  let skippedNoEmail = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const [userId, items] of byUser) {
    if (items.length === 0) continue;
    const u = userById.get(userId);
    if (!u || !u.email || u.active === false) {
      skippedNoEmail++;
      continue;
    }
    const firstName =
      (u.full_name ?? u.email).split(/[\s.@]+/)[0] || 'à toi';
    const { subject, html, text } = renderDigestEmail({
      firstName,
      items: sortDigestItems(items),
      appUrl,
    });
    try {
      await sendViaResend(apiKey, from, u.email, subject, html, text);
      sent++;
    } catch (e) {
      errors.push({
        userId,
        error: e instanceof Error ? e.message : 'unknown',
      });
    }
  }

  // --- Digest MANAGER : les admins sont prevenus des retards de l'equipe. ---
  const summaries = buildRepSummaries(
    users
      .filter((u) => u.active !== false)
      .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email })),
    (prosRaw ?? []) as unknown as DigestProspectRow[],
    (tasksRaw ?? []) as unknown as Task[],
    now
  );
  const adminRoles = new Set(['admin', 'admin_limited']);
  let managerSent = 0;
  if (summaries.some((s) => s.overdueTotal > 0)) {
    for (const u of users) {
      if (!u.role || !adminRoles.has(u.role) || !u.email || u.active === false) continue;
      const firstName = (u.full_name ?? u.email).split(/[\s.@]+/)[0] || 'a toi';
      const { subject, html, text } = renderManagerEmail({
        adminFirstName: firstName,
        summaries,
        appUrl,
        now,
      });
      try {
        await sendViaResend(apiKey, from, u.email, subject, html, text);
        managerSent++;
      } catch (e) {
        errors.push({
          userId: u.id,
          error: `manager: ${e instanceof Error ? e.message : 'unknown'}`,
        });
      }
    }
  }

  return {
    recipientsWithActions: byUser.size,
    sent,
    managerSent,
    skippedNoEmail,
    errors,
  };
}

export async function GET(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDigest();
  return NextResponse.json(result);
}

/** POST identique — declenchement manuel (curl) hors verbe impose par Vercel Cron. */
export async function POST(req: Request) {
  return GET(req);
}
