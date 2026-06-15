'use client';

import { useMemo, useState, useTransition } from 'react';
import { labelForStatus } from '@/lib/prospects';
import type { DedupGroup } from '@/lib/dedup';
import { mergeProspects, dismissGroup } from './actions';

// Design System crème/orange — tokens locaux (suite admin claire).
const INK = '#2A2320';           // texte corps (ex CREAM)
const INK_SOFT = '#7B665C';      // texte secondaire (ex CREAM_SOFT)
const INK_FAINT = '#9B8A7E';     // texte tertiaire (ex CREAM_FAINT)
const CHOCO = '#532418';         // titres serif
const AMBER = '#B5601C';         // accent lisible sur clair (ex AMBER)
const BRAND = '#F39253';         // orange plein (fills/boutons/radio)
const GREEN = '#4F7A38';         // vert lisible sur clair (ex GREEN)
const CARD_BG = '#FFFFFF';       // cartes (ex CARD_BG)
const BORDER = '1px solid #E2D5C3';
const SERIF = 'var(--font-marcellus), Georgia, serif';
const MONO = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';
const SANS = 'var(--font-inter), system-ui, sans-serif';

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
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 28px 64px', color: INK }}>
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: AMBER,
            marginBottom: 10,
          }}
        >
          ADMIN · QUALITÉ DATA
        </div>
        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: CHOCO,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Doublons détectés
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: INK_SOFT,
            marginTop: 12,
            maxWidth: 640,
          }}
        >
          Fiches actives partageant le même email ou le même numéro (9 derniers chiffres).
          Choisissez la fiche maître, fusionnez — les doublons sont archivés (jamais supprimés)
          et leur historique est rattaché. « Ignorer » écarte définitivement un faux positif.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <Stat label="Groupes à traiter" value={visible.length} color={visible.length > 0 ? AMBER : GREEN} />
        <Stat label="Fiches actives" value={totalActive} color={CHOCO} />
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 20,
            borderRadius: 14,
            border: BORDER,
            background: 'rgba(243,146,83,0.10)',
            padding: '12px 16px',
            fontSize: 13,
            color: INK,
          }}
        >
          {feedback}
        </div>
      )}

      {visible.length === 0 ? (
        <div
          style={{
            background: CARD_BG,
            border: BORDER,
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(83,36,24,0.06)',
          }}
        >
          <p style={{ fontFamily: SERIF, fontSize: 20, color: CHOCO, margin: 0 }}>
            Aucun doublon à traiter.
          </p>
          <p style={{ fontSize: 13, color: INK_SOFT, marginTop: 8 }}>
            La base est propre — ou tous les groupes ont été traités. 👍
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {visible.map((g) => {
            const masterId = masters[g.signature] ?? g.suggestedMasterId;
            const isBusy = busy === g.signature;
            return (
              <section
                key={g.signature}
                style={{
                  background: CARD_BG,
                  border: BORDER,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(83,36,24,0.06)',
                }}
              >
                {/* En-tête de groupe : critère commun */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2D5C3',
                    background: '#FBF7F2',
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.16em',
                      color: g.criterion === 'email' ? AMBER : GREEN,
                      background: '#FFFFFF',
                      border: BORDER,
                      borderRadius: 999,
                      padding: '4px 10px',
                    }}
                  >
                    {g.criterion === 'email' ? 'Email commun' : 'Téléphone commun'}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: INK }}>{g.value}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      color: AMBER,
                    }}
                  >
                    {g.prospects.length} fiches
                  </span>
                </div>

                {/* Liste des fiches du groupe */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {g.prospects.map((p) => {
                    const isMaster = p.id === masterId;
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '14px 18px',
                          borderBottom: '1px solid #F0E7DA',
                          background: isMaster ? 'rgba(243,146,83,0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name={`master-${g.signature}`}
                          checked={isMaster}
                          onChange={() =>
                            setMasters((prev) => ({ ...prev, [g.signature]: p.id }))
                          }
                          aria-label={`Définir ${p.company_name} comme fiche maître`}
                          style={{ marginTop: 4, accentColor: BRAND }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: SANS,
                                fontSize: 14,
                                fontWeight: 600,
                                color: INK,
                              }}
                            >
                              {p.company_name}
                            </span>
                            {isMaster && (
                              <span
                                style={{
                                  fontFamily: MONO,
                                  fontSize: 8,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.16em',
                                  color: AMBER,
                                  border: `1px solid ${AMBER}`,
                                  borderRadius: 999,
                                  padding: '2px 7px',
                                }}
                              >
                                Maître
                              </span>
                            )}
                            <span
                              style={{
                                fontFamily: MONO,
                                fontSize: 9,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: INK_SOFT,
                              }}
                            >
                              {labelForStatus(p.status)}
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 14,
                              fontSize: 12,
                              color: INK_SOFT,
                            }}
                          >
                            {p.contact_name && <span>{p.contact_name}</span>}
                            {p.email && <span style={{ fontFamily: MONO }}>{p.email}</span>}
                            {p.phone && (
                              <span style={{ fontFamily: MONO, color: AMBER }}>{p.phone}</span>
                            )}
                            {p.city && <span>{p.city}</span>}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 14,
                              fontFamily: MONO,
                              fontSize: 10,
                              color: INK_FAINT,
                            }}
                          >
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
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    padding: '14px 18px',
                    borderTop: '1px solid #E2D5C3',
                  }}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleMerge(g)}
                    style={{
                      fontFamily: SANS,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#FFFFFF',
                      background: BRAND,
                      border: 'none',
                      borderRadius: 999,
                      padding: '9px 18px',
                      cursor: isBusy ? 'wait' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    {isBusy ? 'Fusion…' : 'Fusionner'}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDismiss(g)}
                    style={{
                      fontFamily: SANS,
                      fontSize: 13,
                      fontWeight: 600,
                      color: INK_SOFT,
                      background: '#FFFFFF',
                      border: BORDER,
                      borderRadius: 999,
                      padding: '9px 18px',
                      cursor: isBusy ? 'wait' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                    }}
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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
        background: CARD_BG,
        border: BORDER,
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(83,36,24,0.06)',
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: INK_FAINT,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 30,
          fontWeight: 500,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}
