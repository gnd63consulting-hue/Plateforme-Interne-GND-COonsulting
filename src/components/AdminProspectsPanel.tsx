'use client';

import { useMemo, useState } from 'react';
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSignature,
  Filter,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
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

type Props = { prospects: Prospect[]; users: User[] };

export default function AdminProspectsPanel({
  prospects: initialProspects,
  users,
}: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [brancheFilter, setBrancheFilter] = useState<string>('all');
  const [caFilter, setCaFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
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
      if (classificationFilter !== 'all' && p.classification !== classificationFilter) return false;
      if (sectorFilter !== 'all' && p.sector !== sectorFilter) return false;
      if (brancheFilter !== 'all' && p.branche !== brancheFilter) return false;
      if (caFilter !== 'all' && p.ca_estime !== caFilter) return false;
      const owner = p.assigned_to ?? p.created_by;
      if (assigneeFilter === 'all') return true;
      if (assigneeFilter === 'unassigned') return !p.assigned_to;
      return owner === assigneeFilter;
    });
  }, [prospects, assigneeFilter, statusFilter, classificationFilter, sectorFilter, brancheFilter, caFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  function pushStatusToNotion(prospectId: string) {
    fetch(`/api/prospects/${prospectId}/sync-status-to-notion`, { method: 'POST' }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[admin sync-status-to-notion] failed for prospect ${prospectId}:`, err);
    });
  }

  async function handleStatusChange(prospect: Prospect, status: string) {
    setError(null);
    const { data, error } = await supabase.from('prospects').update({ status }).eq('id', prospect.id).select().single();
    if (error) { setError(error.message); return; }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? updated : p)));
      if (updated.notion_page_id) pushStatusToNotion(updated.id);
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
    const { data, error } = await supabase.from('prospects').update(patch).eq('id', editing.id).select().single();
    if (error) { setError(error.message); throw error; }
    if (data) {
      const updated = data as Prospect;
      setProspects((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      if (values.status !== editing.status && updated.notion_page_id) pushStatusToNotion(updated.id);
    }
  }

  function resetFilters() {
    setAssigneeFilter('all');
    setStatusFilter('all');
    setClassificationFilter('all');
    setSectorFilter('all');
    setBrancheFilter('all');
    setCaFilter('all');
    setPage(1);
  }

  const activeFilterCount =
    (assigneeFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (classificationFilter !== 'all' ? 1 : 0) +
    (sectorFilter !== 'all' ? 1 : 0) +
    (brancheFilter !== 'all' ? 1 : 0) +
    (caFilter !== 'all' ? 1 : 0);

  function setAndResetPage<T>(setter: (v: T) => void): (v: T) => void {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className="space-y-3">
      {/* ===== Header : count + reset ============================== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-medium tabular-nums text-ink-warm">
            {filtered.length}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#6F5A50]">
            prospect{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
            {filtered.length !== prospects.length && ` / ${prospects.length} total`}
          </span>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-dark transition hover:bg-brand/15 hover:text-brand"
          >
            <X className="h-3 w-3" />
            Réinitialiser ({activeFilterCount})
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ===== Filters bar (dark cockpit kept for identity) ===================== */}
      <div
        className="relative overflow-hidden rounded-2xl border border-brand/15 p-3 shadow-warm-xl"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, rgba(232, 133, 61, 0.08) 0%, transparent 60%),
            linear-gradient(135deg, #3D1F1E 0%, #1A0F0E 100%)
          `,
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            <Filter className="h-3 w-3" />
            Filtres
          </span>

          <FilterSelect
            value={assigneeFilter}
            onChange={setAndResetPage(setAssigneeFilter)}
            options={[
              { value: 'all', label: 'Tous les commerciaux' },
              { value: 'unassigned', label: 'Non assignés' },
              ...users.map((u) => ({ value: u.id, label: u.label })),
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={setAndResetPage(setStatusFilter)}
            options={[
              { value: 'all', label: 'Tous les statuts' },
              ...STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            ]}
          />
          {classificationOptions.length > 0 && (
            <FilterSelect
              value={classificationFilter}
              onChange={setAndResetPage(setClassificationFilter)}
              options={[
                { value: 'all', label: 'Toutes priorités' },
                ...classificationOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          )}
          {sectorOptions.length > 0 && (
            <FilterSelect
              value={sectorFilter}
              onChange={setAndResetPage(setSectorFilter)}
              options={[
                { value: 'all', label: 'Tous secteurs' },
                ...sectorOptions.map((s) => ({ value: s, label: s })),
              ]}
            />
          )}
          {brancheOptions.length > 0 && (
            <FilterSelect
              value={brancheFilter}
              onChange={setAndResetPage(setBrancheFilter)}
              options={[
                { value: 'all', label: 'Toutes branches' },
                ...brancheOptions.map((b) => ({ value: b, label: b })),
              ]}
            />
          )}
          {caOptions.length > 0 && (
            <FilterSelect
              value={caFilter}
              onChange={setAndResetPage(setCaFilter)}
              options={[
                { value: 'all', label: 'Tous CA estimés' },
                ...caOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          )}

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="ml-auto rounded-full border border-brand/15 bg-[#2A1510]/40 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cream/80 backdrop-blur-sm transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value={30} className="bg-[#2A1510] text-cream normal-case tracking-normal">30 par page</option>
            <option value={50} className="bg-[#2A1510] text-cream normal-case tracking-normal">50 par page</option>
            <option value={100} className="bg-[#2A1510] text-cream normal-case tracking-normal">100 par page</option>
          </select>
        </div>
      </div>

      {/* ===== Table (warm paper for readability) ====================== */}
      <div className="overflow-hidden rounded-3xl border border-[rgba(74,36,26,0.10)] bg-cream shadow-warm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gnd-bronze/8 text-sm">
            <thead className="sticky top-0 z-10 bg-cream backdrop-blur-sm">
              <tr className="border-b border-brand/15">
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
            <tbody className="divide-y divide-gnd-bronze/8">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
                        <Filter className="h-5 w-5 text-brand-dark" />
                      </div>
                      <p className="font-display text-base text-ink-warm">
                        Aucun prospect ne matche les filtres.
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-dark hover:text-brand hover:underline"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map((p) => (
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

      {/* ===== Pagination ====================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-[rgba(74,36,26,0.10)] bg-cream px-4 py-3 shadow-warm sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#6F5A50]">
            Page <span className="font-semibold text-ink-warm">{safePage}</span> sur{' '}
            <span className="text-ink-warm">{totalPages}</span>
            <span className="ml-2 text-muted-warm">
              · {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} / {filtered.length}
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-warm transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers(safePage, totalPages).map((n, idx) =>
              n === '…' ? (
                <span key={`gap-${idx}`} className="px-2 text-xs text-muted-warm">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums transition-colors ${
                    n === safePage ? 'bg-choco text-cream' : 'text-ink-warm hover:bg-brand/10'
                  }`}
                >
                  {n}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-warm transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ProspectDetailsModal prospect={viewing} onClose={() => setViewing(null)} />

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
// Sub-components
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
      className={`whitespace-nowrap px-3 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dark first:pl-4 last:pr-4 ${className}`}
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
      className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm transition focus:outline-none focus:ring-1 ${
        isActive
          ? 'border-brand/40 bg-brand/15 text-brand focus:ring-brand'
          : 'border-brand/15 bg-[#2A1510]/40 text-cream/80 hover:border-brand/30 hover:text-cream focus:ring-brand/30'
      }`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#2A1510] text-cream normal-case tracking-normal">
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
    <tr className="group transition hover:bg-cream-deep/40">
      <td className="px-3 py-3 first:pl-4">
        <div className="flex items-center gap-2">
          <UserAvatar name={assigneeLabel} />
          <span className="truncate text-xs text-ink-warm">{assigneeLabel}</span>
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-medium text-ink-warm line-clamp-2">
            {p.company_name}
          </span>
          {p.classification && (
            <span
              title={classificationTooltip(p.classification) ?? undefined}
              className={`inline-flex w-fit cursor-help items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] ring-1 ${classificationToneClass(p.classification)}`}
            >
              {p.classification}
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col">
          <span className="text-sm text-ink-warm line-clamp-1">{p.contact_name ?? '—'}</span>
          {p.role_contact && (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-warm">{p.role_contact}</span>
          )}
        </div>
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          {tel ? (
            <a
              href={`tel:${tel.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-dark transition-colors hover:text-brand"
            >
              <Phone className="h-3 w-3 text-brand/70" />
              {tel}
            </a>
          ) : (
            <span className="text-xs text-muted-warm">—</span>
          )}
          {mail ? (
            <a
              href={`mailto:${mail}`}
              className="inline-flex max-w-[180px] items-center gap-1.5 font-mono text-xs text-[#6F5A50] transition-colors hover:text-brand"
              title={mail}
            >
              <Mail className="h-3 w-3 shrink-0 text-brand/70" />
              <span className="truncate">{mail}</span>
            </a>
          ) : null}
        </div>
      </td>

      <td className="max-w-[260px] px-3 py-3 align-top">
        <span className="line-clamp-2 text-xs text-[#6F5A50]" title={p.address ?? p.city ?? undefined}>
          {p.address ?? p.city ?? '—'}
        </span>
      </td>

      <td className="px-3 py-3 align-top">
        {p.sector ? (
          <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-brand-dark">
            {p.sector}
          </span>
        ) : (
          <span className="text-xs text-muted-warm">—</span>
        )}
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex items-center gap-1.5">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${toneForStatus(p.status)}`}>
            <StatusIcon className="h-3 w-3" />
          </span>
          <select
            value={p.status}
            onChange={(e) => onChangeStatus(p, e.target.value)}
            className={`min-w-0 cursor-pointer rounded-md border-0 bg-transparent py-0.5 pl-1 pr-5 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-brand/30 ${toneForStatus(p.status)}`}
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
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-brand-dark ring-1 ring-brand/30">
            <Sparkles className="h-2.5 w-2.5" />
            Notion
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep/60 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#6F5A50] ring-1 ring-[rgba(74,36,26,0.12)]/15">
            <UserPlus className="h-2.5 w-2.5" />
            Manuel
          </span>
        )}
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[10px] uppercase tracking-[0.12em] text-[#6F5A50]">
        {formatRelativeDate(p.updated_at)}
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-top text-right last:pr-4">
        <div className="flex justify-end gap-1">
          <button
            onClick={onView}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/20 bg-white text-brand-dark transition hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
            aria-label={`Voir l'analyse complète de ${p.company_name}`}
            title="Voir l'analyse complète"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(74,36,26,0.12)] bg-white text-[#6F5A50] transition hover:border-brand/30 hover:text-ink-warm"
            aria-label={`Modifier ${p.company_name}`}
            title="Modifier le prospect"
          >
            <Edit3 className="h-3.5 w-3.5" />
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
    case 'a_contacter': return Mail;
    case 'contacte': return Phone;
    case 'rdv_pris': return CalendarCheck;
    case 'devis_envoye': return FileSignature;
    case 'gagne': return CheckCircle2;
    case 'perdu': return XCircle;
    case 'archived': return Archive;
    default: return UserIcon;
  }
}

const CLASSIFICATION_TOOLTIPS_TABLE: Record<string, string> = {
  '🔥 Chaud': 'Lead à contacter en priorité. Décisionnaire identifié, canal direct, signal timing fort.',
  '🌡️ Tiède': 'Bon profil mais avec friction. Identité floue, dirigeant senior, ou à éduquer / requalifier.',
  '❄️ Froid': 'À requalifier ultérieurement. NURTURE / non urgent / signal timing faible.',
};

function classificationTooltip(classification: string | null): string | null {
  if (!classification) return null;
  return CLASSIFICATION_TOOLTIPS_TABLE[classification] ?? null;
}

function classificationToneClass(c: string): string {
  if (c.startsWith('🔥')) return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (c.startsWith('🌡️')) return 'bg-amber-50 text-amber-800 ring-amber-200';
  if (c.startsWith('❄️')) return 'bg-info-bg text-info-fg ring-[rgba(49,104,156,0.25)]';
  if (c.startsWith('Lead A') || c === 'A' || c.startsWith('A (')) return 'bg-amber-50 text-amber-800 ring-amber-200';
  if (c.startsWith('Lead B') || c === 'B' || c.startsWith('B (')) return 'bg-info-bg text-info-fg ring-[rgba(49,104,156,0.25)]';
  if (c.startsWith('Lead C') || c === 'C' || c.startsWith('C (')) return 'bg-cream-deep text-ink-warm ring-border-soft';
  if (c.startsWith('Rejet')) return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-cream-deep text-ink-warm ring-border-soft';
}

const AVATAR_GRADIENTS = [
  'from-brand to-brand-dark',
  'from-choco to-[#2A1510]',
  'from-brand to-brand',
  'from-[#7D3E2C] to-choco',
  'from-gnd-clay to-brand-dark',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
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
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-mono text-[10px] font-bold text-cream shadow-warm ring-2 ring-cream ${colorFromName(name)}`}
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

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [];
  out.push(1);
  if (current > 3) out.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}
