'use client';

import { useMemo, useState } from 'react';
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  FileSignature,
  Filter,
  Mail,
  Phone,
  Search,
  Sparkles,
  User,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import {
  formatDate,
  labelForStatus,
  STATUS_OPTIONS,
  toneForStatus,
  type Prospect,
} from '@/lib/prospects';
import ProspectDetailsModal from './ProspectDetailsModal';
import ProspectModal, { type ProspectFormValues } from './ProspectModal';

type User = { id: string; label: string };

type Props = {
  prospects: Prospect[];
  users: User[];
};

export default function AdminProspectsPanel({
  prospects: initialProspects,
  users,
}: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] =
    useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [brancheFilter, setBrancheFilter] = useState<string>('all');
  const [caFilter, setCaFilter] = useState<string>('all');
  const [viewing, setViewing] = useState<Prospect | null>(null);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const userLabel = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.label]));
    return (id: string | null) =>
      !id ? '— non assigné' : map.get(id) ?? id.slice(0, 8);
  }, [users]);

  const classificationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of prospects) if (p.classification) set.add(p.classification);
    return [...set].sort();
  }, [prospects]);

  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of prospects) if (p.sector) set.add(p.sector);
    return [...set].sort();
  }, [prospects]);

  const brancheOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of prospects) if (p.branche) set.add(p.branche);
    return [...set].sort();
  }, [prospects]);

  const caOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of prospects) if (p.ca_estime) set.add(p.ca_estime);
    return [...set].sort();
  }, [prospects]);

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (
        classificationFilter !== 'all' &&
        p.classification !== classificationFilter
      )
        return false;
      if (sectorFilter !== 'all' && p.sector !== sectorFilter) return false;
      if (brancheFilter !== 'all' && p.branche !== brancheFilter) return false;
      if (caFilter !== 'all' && p.ca_estime !== caFilter) return false;
      const owner = p.assigned_to ?? p.created_by;
      if (assigneeFilter === 'all') return true;
      if (assigneeFilter === 'unassigned') return !p.assigned_to;
      return owner === assigneeFilter;
    });
  }, [
    prospects,
    assigneeFilter,
    statusFilter,
    classificationFilter,
    sectorFilter,
    brancheFilter,
    caFilter,
  ]);

  function pushStatusToNotion(prospectId: string) {
    fetch(`/api/prospects/${prospectId}/sync-status-to-notion`, {
      method: 'POST',
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(
        `[admin sync-status-to-notion] failed for prospect ${prospectId}:`,
        err
      );
    });
  }

  async function handleStatusChange(prospect: Prospect, status: string) {
    setError(null);
    const { data, error } = await supabase
      .from('prospects')
      .update({ status })
      .eq('id', prospect.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? updated : p))
      );
      if (updated.notion_page_id) {
        pushStatusToNotion(updated.id);
      }
    }
  }

  async function handleEdit(values: ProspectFormValues) {
    if (!editing) return;
    setError(null);

    const patch = {
      company_name: values.company_name.trim(),
      contact_name: values.contact_name.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      sector: values.sector.trim() || null,
      city: values.city.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
    };

    const { data, error } = await supabase
      .from('prospects')
      .update(patch)
      .eq('id', editing.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      throw error;
    }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) =>
        prev.map((p) => (p.id === editing.id ? updated : p))
      );
      if (values.status !== editing.status && updated.notion_page_id) {
        pushStatusToNotion(updated.id);
      }
    }
  }

  function resetFilters() {
    setAssigneeFilter('all');
    setStatusFilter('all');
    setClassificationFilter('all');
    setSectorFilter('all');
    setBrancheFilter('all');
    setCaFilter('all');
  }

  const activeFilterCount =
    (assigneeFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (classificationFilter !== 'all' ? 1 : 0) +
    (sectorFilter !== 'all' ? 1 : 0) +
    (brancheFilter !== 'all' ? 1 : 0) +
    (caFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* ===== Header : count + filter chips ============================== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-800">
            {filtered.length}
          </span>
          <span className="text-sm text-gnd-muted">
            prospect{filtered.length > 1 ? 's' : ''} affiché
            {filtered.length > 1 ? 's' : ''}
            {filtered.length !== prospects.length &&
              ` sur ${prospects.length} au total`}
          </span>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-3 w-3" />
            Réinitialiser ({activeFilterCount})
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ===== Filters bar ================================================ */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gnd-muted">
          <Filter className="h-3.5 w-3.5" />
          Filtres
        </span>

        <FilterSelect
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          options={[
            { value: 'all', label: 'Tous les commerciaux' },
            { value: 'unassigned', label: 'Non assignés' },
            ...users.map((u) => ({ value: u.id, label: u.label })),
          ]}
        />

        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Tous les statuts' },
            ...STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          ]}
        />

        {classificationOptions.length > 0 && (
          <FilterSelect
            value={classificationFilter}
            onChange={setClassificationFilter}
            options={[
              { value: 'all', label: 'Toutes priorités' },
              ...classificationOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        )}

        {sectorOptions.length > 0 && (
          <FilterSelect
            value={sectorFilter}
            onChange={setSectorFilter}
            options={[
              { value: 'all', label: 'Tous secteurs' },
              ...sectorOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
        )}

        {brancheOptions.length > 0 && (
          <FilterSelect
            value={brancheFilter}
            onChange={setBrancheFilter}
            options={[
              { value: 'all', label: 'Toutes branches' },
              ...brancheOptions.map((b) => ({ value: b, label: b })),
            ]}
          />
        )}

        {caOptions.length > 0 && (
          <FilterSelect
            value={caFilter}
            onChange={setCaFilter}
            options={[
              { value: 'all', label: 'Tous CA estimés' },
              ...caOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        )}
      </div>

      {/* ===== Table ====================================================== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm text-[10px] uppercase tracking-wider text-gnd-muted">
              <tr>
                <Th className="w-44">Assigné à</Th>
                <Th>Entreprise</Th>
                <Th>Contact</Th>
                <Th>Coordonnées</Th>
                <Th className="max-w-[260px]">Adresse</Th>
                <Th>Secteur</Th>
                <Th className="w-36">Statut</Th>
                <Th>Source</Th>
                <Th>MAJ</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-2 text-center text-gnd-muted">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Filter className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        Aucun prospect ne matche les filtres.
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <ProspectRow
                  key={p.id}
                  prospect={p}
                  assigneeLabel={userLabel(p.assigned_to)}
                  onChangeStatus={handleStatusChange}
                  onView={() => setViewing(p)}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ProspectDetailsModal
        prospect={viewing}
        onClose={() => setViewing(null)}
      />

      <ProspectModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
        initial={
          editing
            ? {
                company_name: editing.company_name,
                contact_name: editing.contact_name ?? '',
                phone: editing.phone ?? '',
                email: editing.email ?? '',
                website: editing.website ?? '',
                sector: editing.sector ?? '',
                city: editing.city ?? '',
                status: editing.status,
                notes: editing.notes ?? '',
              }
            : undefined
        }
        title={editing ? `Modifier : ${editing.company_name}` : 'Modifier'}
        submitLabel="Enregistrer"
      />
    </div>
  );
}

// =====================================================================
// Sous-composants
// =====================================================================

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-3 text-left font-semibold first:pl-4 last:pr-4 ${className}`}
    >
      {children}
    </th>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const isActive = value !== 'all';
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-sm transition focus:outline-none focus:ring-2 ${
        isActive
          ? 'border-blue-300 bg-blue-50 text-blue-900 focus:ring-blue-200'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:ring-slate-200'
      }`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ProspectRow({
  prospect,
  assigneeLabel,
  onChangeStatus,
  onView,
  onEdit,
}: {
  prospect: Prospect;
  assigneeLabel: string;
  onChangeStatus: (p: Prospect, status: string) => void;
  onView: () => void;
  onEdit: () => void;
}) {
  const p = prospect;
  const tel = p.phone?.trim() || null;
  const mail = p.email?.trim() || null;
  const StatusIcon = statusIcon(p.status);

  return (
    <tr className="group transition hover:bg-slate-50/70">
      <td className="px-3 py-3 first:pl-4">
        <div className="flex items-center gap-2">
          <UserAvatar name={assigneeLabel} />
          <span className="truncate text-xs text-slate-700">
            {assigneeLabel}
          </span>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-gnd-primary line-clamp-2">
            {p.company_name}
          </span>
          {p.classification && (
            <span
              title={classificationTooltip(p.classification) ?? undefined}
              className={`inline-flex w-fit cursor-help items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${classificationToneClass(
                p.classification
              )}`}
            >
              {p.classification}
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col">
          <span className="text-slate-800 line-clamp-1">
            {p.contact_name ?? '—'}
          </span>
          {p.role_contact && (
            <span className="text-[11px] text-gnd-muted">{p.role_contact}</span>
          )}
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          {tel ? (
            <a
              href={`tel:${tel.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1 text-xs font-mono text-gnd-primary hover:underline"
            >
              <Phone className="h-3 w-3 text-slate-400" />
              {tel}
            </a>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
          {mail ? (
            <a
              href={`mailto:${mail}`}
              className="inline-flex max-w-[180px] items-center gap-1 text-xs text-gnd-primary hover:underline"
              title={mail}
            >
              <Mail className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{mail}</span>
            </a>
          ) : null}
        </div>
      </td>

      <td className="max-w-[260px] px-3 py-3 align-top">
        <span
          className="line-clamp-2 text-xs text-slate-600"
          title={p.address ?? p.city ?? undefined}
        >
          {p.address ?? p.city ?? '—'}
        </span>
      </td>

      <td className="px-3 py-3 align-top">
        {p.sector ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {p.sector}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${toneForStatus(
              p.status
            )}`}
          >
            <StatusIcon className="h-3 w-3" />
          </span>
          <select
            value={p.status}
            onChange={(e) => onChangeStatus(p, e.target.value)}
            className={`min-w-0 cursor-pointer rounded-md border-0 bg-transparent py-0.5 pl-1 pr-5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-slate-300 ${toneForStatus(
              p.status
            )}`}
            aria-label={`Statut de ${p.company_name}`}
          >
            {!STATUS_OPTIONS.some((o) => o.value === p.status) && (
              <option value={p.status}>{labelForStatus(p.status)}</option>
            )}
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        {p.notion_page_id ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200">
            <Sparkles className="h-2.5 w-2.5" />
            Notion
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
            <UserPlus className="h-2.5 w-2.5" />
            Manuel
          </span>
        )}
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-gnd-muted">
        {formatRelativeDate(p.updated_at)}
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-top text-right last:pr-4">
        <div className="flex justify-end gap-1">
          <button
            onClick={onView}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            aria-label={`Voir l'analyse complète de ${p.company_name}`}
            title="Voir l'analyse complète"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-gnd-primary"
            aria-label={`Modifier ${p.company_name}`}
            title="Modifier le prospect"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// =====================================================================
// Helpers visuels
// =====================================================================

function statusIcon(status: string) {
  switch (status) {
    case 'a_contacter':
      return Mail;
    case 'contacte':
      return Phone;
    case 'rdv_pris':
      return CalendarCheck;
    case 'devis_envoye':
      return FileSignature;
    case 'gagne':
      return CheckCircle2;
    case 'perdu':
      return XCircle;
    case 'archived':
      return Archive;
    default:
      return User;
  }
}

// =====================================================================
// Classification — colors + tooltips (mirror of ProspectDetailsModal)
// New canonical values (since 2026-04-27): 🔥 Chaud / 🌡️ Tiède / ❄️ Froid.
// Legacy fallbacks kept for backward compatibility during migration.
// =====================================================================

const CLASSIFICATION_TOOLTIPS_TABLE: Record<string, string> = {
  '🔥 Chaud':
    'Lead à contacter en priorité. Décisionnaire identifié, canal direct, signal timing fort.',
  '🌡️ Tiède':
    'Bon profil mais avec friction. Identité floue, dirigeant senior, ou à éduquer / requalifier.',
  '❄️ Froid':
    'À requalifier ultérieurement. NURTURE / non urgent / signal timing faible.',
};

function classificationTooltip(
  classification: string | null
): string | null {
  if (!classification) return null;
  return CLASSIFICATION_TOOLTIPS_TABLE[classification] ?? null;
}

function classificationToneClass(c: string): string {
  // New canonical values
  if (c.startsWith('🔥')) return 'bg-rose-100 text-rose-800 ring-rose-200';
  if (c.startsWith('🌡️')) return 'bg-amber-100 text-amber-800 ring-amber-200';
  if (c.startsWith('❄️')) return 'bg-sky-100 text-sky-800 ring-sky-200';
  // Legacy fallbacks
  if (c.startsWith('Lead A') || c === 'A' || c.startsWith('A (')) {
    return 'bg-amber-100 text-amber-800 ring-amber-200';
  }
  if (c.startsWith('Lead B') || c === 'B' || c.startsWith('B (')) {
    return 'bg-blue-100 text-blue-800 ring-blue-200';
  }
  if (c.startsWith('Lead C') || c === 'C' || c.startsWith('C (')) {
    return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
  if (c.startsWith('Rejet')) {
    return 'bg-rose-100 text-rose-800 ring-rose-200';
  }
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-pink-500',
  'bg-fuchsia-500',
  'bg-purple-500',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-white ${colorFromName(
        name
      )}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `il y a ${diffDays}j`;
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)}sem`;
    return formatDate(iso);
  } catch {
    return formatDate(iso);
  }
}
