import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  ENROLLMENT_SELECT_COLUMNS,
  SEQUENCE_STEP_SELECT_COLUMNS,
  kindLabel,
  nextDueFrom,
  type SequenceEnrollment,
  type SequenceStep,
} from '@/lib/sequences';

export const dynamic = 'force-dynamic';

/**
 * Moteur des séquences de relance (Sprint 7).
 *
 * GET /api/sequences/tick — déclenché par Vercel Cron (quotidien, cf.
 * vercel.json). Service-role UNIQUEMENT (bypass RLS) : on balaie toutes les
 * inscriptions de tous les commerciaux.
 *
 * Authentification : identique à /api/admin/sync-prospects.
 *   - `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron — auto-set quand
 *     CRON_SECRET est défini en env var)
 *   - `Authorization: Bearer ${ADMIN_SYNC_SECRET}` (déclenchement manuel curl)
 *
 * Pour chaque enrollment status='active' avec next_due_at <= now() :
 *   0. Auto-stop si le prospect est sorti du pipeline (gagné/perdu/etc.) →
 *      status='stopped', aucune tâche créée.
 *   1. Récupère l'étape courante (position = current_step).
 *   2. Crée une tâche (public.tasks) owner = propriétaire du prospect
 *      (assigned_to ?? created_by), due_at=remind_at=now, et pose
 *      prospects.next_action_at = now (relance due maintenant).
 *   3. Log une activité (kind='task') sur la timeline du prospect.
 *   4. Avance : current_step += 1 ; étape suivante → next_due_at = now +
 *      delay(étape suivante) ; sinon status='done', next_due_at=null.
 *
 * Idempotence pratique : on borne le batch (LIMIT) et on traite chaque
 * enrollment indépendamment. Une étape sans tâche correspondante (current_step
 * hors borne) clôt proprement l'inscription (done).
 */

const ROUTE = '/api/sequences/tick';

/**
 * Alerte de MISCONFIG : si NI CRON_SECRET NI ADMIN_SYNC_SECRET ne sont posés en
 * env, ce cron renverra 401 à CHAQUE déclenchement Vercel (échec silencieux et
 * permanent). On le rend bruyant dans les logs (distinct d'un 401 d'appel non
 * autorisé légitime) pour qu'un secret oublié soit détectable.
 */
function warnIfNoCronSecretConfigured(): void {
  if (!process.env.CRON_SECRET && !process.env.ADMIN_SYNC_SECRET) {
    console.error(
      `[cron][MISCONFIG] ${ROUTE}: no CRON_SECRET/ADMIN_SYNC_SECRET set — cron will 401 forever`
    );
  }
}

/** Statuts de prospect qui stoppent une séquence (sortie du pipeline). */
const AUTO_STOP_STATUSES = new Set<string>([
  'gagne',
  'perdu',
  'ne_plus_demarcher',
  'archived',
]);

/** Taille max de batch par tick (garde-fou ; le quotidien suffit largement). */
const BATCH_LIMIT = 500;

function authenticate(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const adminSecret = process.env.ADMIN_SYNC_SECRET;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true;
  return false;
}

async function runTick() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // -------- 1. Inscriptions actives échues --------
  const { data: dueRows, error: dueErr } = await admin
    .from('sequence_enrollments')
    .select(ENROLLMENT_SELECT_COLUMNS)
    .eq('status', 'active')
    .not('next_due_at', 'is', null)
    .lte('next_due_at', nowIso)
    .order('next_due_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (dueErr) {
    return { error: `Lecture des inscriptions échouée : ${dueErr.message}`, status: 500 as const };
  }

  const enrollments = (dueRows ?? []) as unknown as SequenceEnrollment[];

  let triggered = 0;
  let stopped = 0;
  let completed = 0;
  let advanced = 0;
  const errors: { enrollment_id: string; error: string }[] = [];

  for (const enr of enrollments) {
    try {
      // ---- Charge le prospect (propriétaire + statut pipeline) ----
      const { data: prospect, error: pErr } = await admin
        .from('prospects')
        .select('id, status, assigned_to, created_by')
        .eq('id', enr.prospect_id)
        .maybeSingle();

      if (pErr) {
        errors.push({ enrollment_id: enr.id, error: pErr.message });
        continue;
      }

      // Prospect supprimé entre-temps (ON DELETE CASCADE devrait l'éviter,
      // mais on stoppe proprement par sécurité).
      if (!prospect) {
        await admin
          .from('sequence_enrollments')
          .update({ status: 'stopped', next_due_at: null })
          .eq('id', enr.id);
        stopped++;
        continue;
      }

      // ---- 0. Auto-stop si sorti du pipeline ----
      if (AUTO_STOP_STATUSES.has(prospect.status as string)) {
        await admin
          .from('sequence_enrollments')
          .update({ status: 'stopped', next_due_at: null })
          .eq('id', enr.id);
        stopped++;
        continue;
      }

      // ---- 1. Étape courante ----
      const { data: stepRow, error: sErr } = await admin
        .from('sequence_steps')
        .select(SEQUENCE_STEP_SELECT_COLUMNS)
        .eq('sequence_id', enr.sequence_id)
        .eq('position', enr.current_step)
        .maybeSingle();

      if (sErr) {
        errors.push({ enrollment_id: enr.id, error: sErr.message });
        continue;
      }

      // Pas d'étape à cette position → séquence terminée.
      if (!stepRow) {
        await admin
          .from('sequence_enrollments')
          .update({ status: 'done', next_due_at: null })
          .eq('id', enr.id);
        completed++;
        continue;
      }

      const step = stepRow as unknown as SequenceStep;
      const ownerId =
        (prospect.assigned_to as string | null) ??
        (prospect.created_by as string);

      // ---- 2. Crée la tâche de relance ----
      const taskTitle = `${kindLabel(step.kind)} — ${step.title}`;
      const { error: taskErr } = await admin.from('tasks').insert({
        prospect_id: enr.prospect_id,
        title: taskTitle,
        due_at: nowIso,
        remind_at: nowIso,
        owner_id: ownerId,
      });

      if (taskErr) {
        errors.push({ enrollment_id: enr.id, error: `task: ${taskErr.message}` });
        continue;
      }

      // Pose la relance « due maintenant » sur le prospect.
      await admin
        .from('prospects')
        .update({ next_action_at: nowIso })
        .eq('id', enr.prospect_id);

      // ---- 3. Log l'activité (best-effort) ----
      await admin.from('activities').insert({
        prospect_id: enr.prospect_id,
        kind: 'task',
        body:
          step.template_body
            ? `Étape séquence déclenchée : ${taskTitle}\n\n${step.template_body}`
            : `Étape séquence déclenchée : ${taskTitle}`,
        metadata: {
          sequence_id: enr.sequence_id,
          enrollment_id: enr.id,
          step_position: enr.current_step,
          step_kind: step.kind,
        },
        owner_id: ownerId,
      });

      triggered++;

      // ---- 4. Avance vers l'étape suivante ----
      const nextPosition = enr.current_step + 1;
      const { data: nextStep, error: nErr } = await admin
        .from('sequence_steps')
        .select('delay_days')
        .eq('sequence_id', enr.sequence_id)
        .eq('position', nextPosition)
        .maybeSingle();

      if (nErr) {
        errors.push({ enrollment_id: enr.id, error: `next: ${nErr.message}` });
        // La tâche est créée ; on ne bloque pas. L'enrollment sera rejoué au
        // prochain tick (next_due_at toujours échu) — mais on a déjà avancé ?
        // Non : on n'a pas encore écrit current_step. On le tente quand même.
      }

      if (nextStep) {
        await admin
          .from('sequence_enrollments')
          .update({
            current_step: nextPosition,
            next_due_at: nextDueFrom(
              (nextStep as { delay_days: number }).delay_days,
              new Date()
            ),
          })
          .eq('id', enr.id);
        advanced++;
      } else {
        // Plus d'étape → terminé.
        await admin
          .from('sequence_enrollments')
          .update({
            current_step: nextPosition,
            status: 'done',
            next_due_at: null,
          })
          .eq('id', enr.id);
        completed++;
      }
    } catch (err) {
      errors.push({
        enrollment_id: enr.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return {
    scanned: enrollments.length,
    triggered,
    advanced,
    completed,
    stopped,
    errors,
  };
}

export async function GET(req: Request) {
  warnIfNoCronSecretConfigured();
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runTick();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error(`[cron][ERROR] ${ROUTE}: ${message}`);
    return NextResponse.json({ error: 'Sequence tick failed' }, { status: 500 });
  }
}

/**
 * POST identique au GET — permet un déclenchement manuel (curl / bouton admin
 * futur) sans dépendre du verbe imposé par Vercel Cron.
 */
export async function POST(req: Request) {
  return GET(req);
}
