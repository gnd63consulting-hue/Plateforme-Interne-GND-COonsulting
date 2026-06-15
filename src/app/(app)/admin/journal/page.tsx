import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Journal d'activite (Sprint 13) — ecran de TRACABILITE admin.
 *
 * Lit public.audit_log, alimentee en append-only par le trigger generique
 * fn_audit() (SECURITY DEFINER) attache a 7 tables (prospects, activities,
 * tasks, commissions, quotes, quote_lines, sequence_enrollments). La RLS
 * audit_log_select_admin n'autorise la lecture qu'aux admins ; on double la
 * garde cote page (role admin/admin_limited, sinon redirect).
 *
 * Pour chaque entree UPDATE on calcule le diff champ par champ (ancien ->
 * nouveau) : c'est le "qui a change quoi, quand". INSERT = Creation, DELETE =
 * Suppression. Aucune migration : audit_log + RLS existent deja (0012 / 0016).
 */

// Design System crème/orange — tokens locaux (suite admin claire).
const INK = '#2A2320';           // texte corps (ex CREAM)
const INK_SOFT = '#7B665C';      // texte secondaire (ex CREAM_SOFT)
const INK_FAINT = '#9B8A7E';     // texte tertiaire (ex CREAM_FAINT)
const CHOCO = '#532418';         // titres serif
const AMBER = '#B5601C';         // accent lisible sur clair (ex AMBER)
const GREEN = '#4F7A38';         // vert lisible sur clair (ex GREEN)
const RED = '#B5421F';           // rouge lisible sur clair (ex RED)
const BLUE = '#3C6E9C';          // bleu lisible sur clair (ex BLUE)
const CARD_BG = '#FFFFFF';       // cartes (ex CARD_BG)
const BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';

const ADMIN_ROLES = new Set(['admin', 'admin_limited']);

const TABLE_LABELS: Record<string, string> = {
  prospects: 'Prospect',
  activities: 'Activite',
  tasks: 'Tache',
  commissions: 'Commission',
  quotes: 'Devis',
  quote_lines: 'Ligne de devis',
  sequence_enrollments: 'Inscription sequence',
};

const TABLE_FILTERS = [
  'prospects',
  'quotes',
  'tasks',
  'activities',
  'commissions',
  'sequence_enrollments',
  'quote_lines',
];

/** Champs ignores dans le diff (bruit technique / non lisible). */
const NOISE = new Set([
  'id',
  'created_at',
  'updated_at',
  'synced_at',
  'email_norm',
  'phone_norm',
  'owner_id',
  'created_by',
]);

type AuditRow = {
  id: number;
  table_name: string | null;
  record_id: string | null;
  action: string | null;
  actor_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
};

function recordLabel(
  table: string | null,
  row: Record<string, unknown> | null
): string {
  if (!row) return '';
  const r = row as Record<string, unknown>;
  switch (table) {
    case 'prospects':
      return String(r.company_name ?? r.contact_name ?? '');
    case 'quotes':
      return String(r.numero ?? '');
    case 'tasks':
      return String(r.title ?? '');
    case 'activities':
      return String(r.kind ?? '');
    default:
      return '';
  }
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 57) + '…' : s;
  }
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + '…' : s;
}

function diffFields(
  oldRow: Record<string, unknown> | null,
  newRow: Record<string, unknown> | null
): { key: string; from: string; to: string }[] {
  if (!oldRow || !newRow) return [];
  const out: { key: string; from: string; to: string }[] = [];
  const keys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
  for (const k of keys) {
    if (NOISE.has(k)) continue;
    const a = (oldRow as Record<string, unknown>)[k];
    const b = (newRow as Record<string, unknown>)[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ key: k, from: fmtVal(a), to: fmtVal(b) });
    }
  }
  return out;
}

function actionMeta(action: string | null): { label: string; color: string } {
  switch (action) {
    case 'INSERT':
      return { label: 'Creation', color: GREEN };
    case 'UPDATE':
      return { label: 'Modification', color: AMBER };
    case 'DELETE':
      return { label: 'Suppression', color: RED };
    default:
      return { label: action ?? '—', color: BLUE };
  }
}

function fmtWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table } = await searchParams;
  const activeTable = table && TABLE_FILTERS.includes(table) ? table : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.has(me.role)) redirect('/dashboard');

  // RLS audit_log_select_admin laisse passer les admins.
  let query = supabase
    .from('audit_log')
    .select(
      'id, table_name, record_id, action, actor_id, old_data, new_data, changed_at'
    )
    .order('changed_at', { ascending: false })
    .limit(200);
  if (activeTable) query = query.eq('table_name', activeTable);

  const { data: rowsRaw } = await query;
  const rows = (rowsRaw ?? []) as unknown as AuditRow[];

  // Resolution des noms d'acteurs.
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id).filter(Boolean)),
  ] as string[];
  const usersRes =
    actorIds.length > 0
      ? await supabase.from('users').select('id, full_name, email').in('id', actorIds)
      : { data: null };
  const actorName = new Map<string, string>();
  for (const u of (usersRes.data ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
  }[]) {
    actorName.set(u.id, u.full_name ?? u.email.split('@')[0]);
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: INK }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: AMBER, marginBottom: 10 }}>
          ADMIN · TRACABILITE
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', color: CHOCO, margin: 0, lineHeight: 1.1 }}>
          Journal d&apos;activite
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: INK_SOFT, marginTop: 12, maxWidth: 660 }}>
          Qui a fait quoi, quand. Chaque creation, modification et suppression sur
          les prospects, devis, taches, activites, commissions et sequences est
          tracee automatiquement (200 dernieres entrees).
        </p>
      </header>

      {/* Filtres par table */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <FilterChip href="/admin/journal" label="Tout" active={!activeTable} />
        {TABLE_FILTERS.map((t) => (
          <FilterChip
            key={t}
            href={`/admin/journal?table=${t}`}
            label={TABLE_LABELS[t] ?? t}
            active={activeTable === t}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: INK_SOFT }}>
          Aucune entree pour ce filtre.
        </p>
      ) : (
        <div style={{ background: CARD_BG, border: BORDER, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(83,36,24,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FBF7F2' }}>
                {['Quand', 'Qui', 'Action', 'Objet', 'Details'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: INK_FAINT, borderBottom: '1px solid #E2D5C3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = actionMeta(r.action);
                const labelRow = r.new_data ?? r.old_data;
                const objLabel = recordLabel(r.table_name, labelRow);
                const diffs =
                  r.action === 'UPDATE' ? diffFields(r.old_data, r.new_data) : [];
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F0E7DA', verticalAlign: 'top' }}>
                    <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 11, color: INK_SOFT, whiteSpace: 'nowrap' }}>
                      {fmtWhen(r.changed_at)}
                    </td>
                    <td style={{ padding: '12px 16px', color: INK }}>
                      {r.actor_id ? actorName.get(r.actor_id) ?? 'Inconnu' : '— systeme'}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontFamily: MONO, fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}14`, border: `1px solid ${meta.color}44` }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: INK }}>
                      <span style={{ color: INK_FAINT, fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {TABLE_LABELS[r.table_name ?? ''] ?? r.table_name}
                      </span>
                      {objLabel && (
                        <span style={{ display: 'block', fontFamily: SERIF, fontSize: 14, color: CHOCO, marginTop: 2 }}>
                          {objLabel}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: INK_SOFT, fontSize: 12.5 }}>
                      {r.action === 'INSERT' && 'Creation de l’element.'}
                      {r.action === 'DELETE' && 'Suppression de l’element.'}
                      {r.action === 'UPDATE' &&
                        (diffs.length === 0 ? (
                          <span style={{ color: INK_FAINT }}>Mise a jour (champs techniques).</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {diffs.slice(0, 6).map((d) => (
                              <div key={d.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'baseline' }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: AMBER }}>{d.key}</span>
                                <span style={{ color: INK_FAINT, textDecoration: 'line-through' }}>{d.from}</span>
                                <span style={{ color: INK_FAINT }}>→</span>
                                <span style={{ color: GREEN }}>{d.to}</span>
                              </div>
                            ))}
                            {diffs.length > 6 && (
                              <span style={{ color: INK_FAINT, fontSize: 11 }}>
                                +{diffs.length - 6} autre(s) champ(s)
                              </span>
                            )}
                          </div>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '6px 14px',
        borderRadius: 999,
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 600,
        textDecoration: 'none',
        color: active ? '#FFFFFF' : INK_SOFT,
        background: active ? '#F39253' : '#FBF7F2',
        border: active ? '1px solid #F39253' : '1px solid #E2D5C3',
      }}
    >
      {label}
    </a>
  );
}
