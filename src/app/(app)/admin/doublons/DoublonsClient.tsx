'use client';

import { useMemo, useState, useTransition } from 'react';
import { labelForStatus } from '@/lib/prospects';
import type { DedupGroup } from '@/lib/dedup';
import { mergeProspects, dismissGroup } from './actions';

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Props = {
  groups: DedupGroup[];
  assignedNames: Record<string, string>;
  totalActive: number;
};

export default function DoublonsClient({ groups, assignedNames, totalActive }: Props) {
  // Sélection de la fiche maître par groupe (défaut = suggestion serveur).
  const initialMasters = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of groups) m[g.signature] = g.suggestedMasterId;
    return m;
  }, [groups]);

  const [masters, setMasters] = useState<Record<string, string>>(initialMasters);
  // Groupes traités dans cette session (fusionnés ou ignorés) → on les masque.
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = groups.filter((g) => !resolved.has(g.signature));

  function handleMerge(g: DedupGroup) {
    const masterId = masters[g.signature] ?? g.suggestedMasterId;
    const duplicateIds = g.prospects.map((p) => p.id).filter((id) => id !== masterId);
    if (duplicateIds.length === 0) return;
    const masterName =
      g.prospects.find((p) => p.id === masterId)?.company_name ?? 'la fiche maître';
    if (
      !confirm(
        `Fusionner ${duplicateIds.length} fiche(s) dans « ${masterName} » ?\n` +
          `Les doublons seront archivés (pas supprimés) et leur historique rattaché.`
      )
    ) {
      return;
    }
    setBusy(g.signature);
    setFeedback(null);
    startTransition(async () => {
      const res = await mergeProspects(masterId, duplicateIds);
      setBusy(null);
      if (res.error) {
        setFeedback(`Erreur : ${res.error}`);
        return;
      }
      setResolved((prev) => new Set(prev).add(g.signature));
      setFeedback(`${res.merged} fiche(s) fusionnée(s) dans « ${masterName} ».`);
    });
  }

  function handleDismiss(g: DedupGroup) {
    setBusy(g.signature);
    setFeedback(null);
    startTransition(async () => {
      const res = await dismissGroup(g.signature);
      setBusy(null);
      if (res.error) {
        setFeedback(`Erreur : ${res.error}`);
        return;
      }
      setResolved((prev) => new Set(prev).add(g.signature));
      setFeedback('Groupe marqué « pas un doublon ».');
    });
  }

  return (
    <div className="relative mx-auto max-w-[1040px] px-7 pb-16 pt-10 font-inter text-ink-warm">
      <span aria-hidden className="watermark absolute right-0 top-4 text-[120px] leading-none">
        Doublons
      </span>

      <header className="relative mb-7">
        <div className="label-eyebrow mb-3">ADMIN · QUALITÉ DATA</div>
        <h1 className="m-0 font-marcellus text-[32px] font-medium leading-[1.1] tracking-[-0.01em] text-choco">
          Doublons détectés
        </h1>
        <p className="mt-3 max-w-[640px] text-sm leading-[1.55] text-[#6F5A50]">
          Fiches actives partageant le même email ou le même numéro (9 derniers chiffres).
          Choisissez la fiche maître, fusionnez — les doublons sont archivés (jamais supprimés)
          et leur historique est rattaché. « Ignorer » écarte définitivement un faux positif.
        </p>
      </header>

      <div className="mb-7 flex flex-wrap gap-3">
        <Stat label="Groupes à traiter" value={visible.length} tone={visible.length > 0 ? 'warn' : 'ok'} />
        <Stat label="Fiches actives" value={totalActive} tone="ink" />
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="surface-accent mb-5 rounded-2xl px-4 py-3 text-[13px] text-ink-warm"
        >
          {feedback}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="surface-ceramic flex flex-col items-center rounded-3xl px-6 py-12 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-pale text-brand-dark">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <p className="m-0 font-marcellus text-xl text-choco">
            Aucun doublon à traiter.
          </p>
          <p className="mt-2 text-[13px] text-[#6F5A50]">
            La base est propre — ou tous les groupes ont été traités. 👍
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {visible.map((g) => {
            const masterId = masters[g.signature] ?? g.suggestedMasterId;
            const isBusy = busy === g.signature;
            return (
              <section
                key={g.signature}
                className="surface-ceramic card-hover overflow-hidden rounded-3xl"
              >
                {/* En-tête de groupe : critère commun */}
                <div className="flex flex-wrap items-center gap-2.5 border-b border-[rgba(74,36,26,0.10)] px-[18px] py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                      g.criterion === 'email'
                        ? 'bg-info-bg text-info-fg'
                        : 'bg-ok-bg text-ok-fg'
                    }`}
                  >
                    {g.criterion === 'email' ? 'Email commun' : 'Téléphone commun'}
                  </span>
                  <span className="font-inter text-[13px] text-ink-warm">{g.value}</span>
                  <span className="ml-auto font-inter text-[11px] font-bold tabular-nums text-brand-burnt">
                    {g.prospects.length} fiches
                  </span>
                </div>

                {/* Liste des fiches du groupe */}
                <div className="flex flex-col">
                  {g.prospects.map((p) => {
                    const isMaster = p.id === masterId;
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-start gap-3 border-b border-[rgba(83,36,24,0.06)] px-[18px] py-3.5 transition ${
                          isMaster ? 'bg-brand-pale/60' : 'hover:bg-cream-deep/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`master-${g.signature}`}
                          checked={isMaster}
                          onChange={() =>
                            setMasters((prev) => ({ ...prev, [g.signature]: p.id }))
                          }
                          aria-label={`Définir ${p.company_name} comme fiche maître`}
                          className="mt-1 accent-brand"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-inter text-sm font-semibold text-ink-warm">
                              {p.company_name}
                            </span>
                            {isMaster && (
                              <span className="rounded-full border border-brand-burnt px-[7px] py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-brand-burnt">
                                Maître
                              </span>
                            )}
                            <span className="font-inter text-[9px] uppercase tracking-[0.1em] text-[#6F5A50]">
                              {labelForStatus(p.status)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-[#6F5A50]">
                            {p.contact_name && <span>{p.contact_name}</span>}
                            {p.email && <span className="font-inter">{p.email}</span>}
                            {p.phone && (
                              <span className="font-inter text-brand-burnt">{p.phone}</span>
                            )}
                            {p.city && <span>{p.city}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 font-inter text-[10px] text-muted-warm">
                            <span>Créé {fmt(p.created_at)}</span>
                            <span>
                              {p.assigned_to
                                ? assignedNames[p.assigned_to] ?? '—'
                                : 'Non assigné'}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Actions de groupe */}
                <div className="flex flex-wrap gap-2.5 border-t border-[rgba(74,36,26,0.10)] px-[18px] py-3.5">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleMerge(g)}
                    className="orange-glow rounded-full bg-brand px-[18px] py-2.5 font-inter text-[13px] font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
                  >
                    {isBusy ? 'Fusion…' : 'Fusionner'}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDismiss(g)}
                    className="rounded-full border border-border-soft bg-white px-[18px] py-2.5 font-inter text-[13px] font-semibold text-choco transition hover:bg-cream-deep disabled:cursor-wait disabled:opacity-60"
                  >
                    Ignorer (pas un doublon)
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'warn' | 'ok' | 'ink' }) {
  const valueColor =
    tone === 'warn' ? 'text-brand-burnt' : tone === 'ok' ? 'text-ok-fg' : 'text-choco';
  return (
    <div className="surface-ceramic min-w-[150px] flex-1 rounded-3xl p-6">
      <div className="label-eyebrow mb-2">{label}</div>
      <div className={`font-marcellus text-[30px] font-medium leading-none tabular-nums ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
