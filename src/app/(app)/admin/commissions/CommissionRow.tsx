'use client';

import { useState, useTransition } from 'react';
import { markCommissionPaid, markCommissionUnpaid } from './actions';

// Design System crème/orange — tokens locaux (suite admin claire).
const INK = '#2A2320';           // texte corps (ex CREAM)
const INK_SOFT = '#7B665C';      // texte secondaire (ex CREAM_SOFT)
const AMBER = '#B5601C';         // accent texte lisible sur clair (ex AMBER)
const GREEN = '#4F7A38';         // vert lisible sur clair (ex GREEN)
const MONO = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';
const SANS = 'var(--font-inter), system-ui, sans-serif';

/**
 * Ligne de commission (admin, thème crème/orange). Le bouton « Marquer payé »
 * appelle la server action admin-guardée (service-role). Optimistic via
 * useTransition + state local du statut.
 */
export default function CommissionRow({
  id,
  dateLabel,
  company,
  baseLabel,
  rateLabel,
  amountLabel,
  statut,
  statutLabel,
}: {
  id: string;
  dateLabel: string;
  company: string | null;
  baseLabel: string;
  rateLabel: string;
  amountLabel: string;
  statut: string;
  statutLabel: string;
}) {
  const [localStatut, setLocalStatut] = useState(statut);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function pay() {
    setError('');
    startTransition(async () => {
      const res = await markCommissionPaid(id);
      if (res.error) setError(res.error);
      else setLocalStatut('paye');
    });
  }
  function unpay() {
    setError('');
    startTransition(async () => {
      const res = await markCommissionUnpaid(id);
      if (res.error) setError(res.error);
      else setLocalStatut('a_payer');
    });
  }

  const statutColor =
    localStatut === 'paye' ? GREEN : localStatut === 'annule' ? INK_SOFT : AMBER;
  const liveLabel = localStatut === statut ? statutLabel : localStatut === 'paye' ? 'Payé' : 'À payer';

  return (
    <tr style={{ borderBottom: '1px solid #F0E7DA' }}>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color: INK_SOFT, whiteSpace: 'nowrap' }}>
        {dateLabel}
      </td>
      <td style={{ padding: '12px 16px', color: INK, fontFamily: SANS }}>
        {company ?? '—'}
      </td>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color: INK_SOFT, fontVariantNumeric: 'tabular-nums' }}>
        {baseLabel}
      </td>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color: INK_SOFT, fontVariantNumeric: 'tabular-nums' }}>
        {rateLabel}
      </td>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#532418', fontVariantNumeric: 'tabular-nums' }}>
        {amountLabel}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: statutColor }}>
          {liveLabel}
        </span>
        {error && (
          <span style={{ display: 'block', fontFamily: SANS, fontSize: 11, color: '#B5421F', marginTop: 2 }}>
            {error}
          </span>
        )}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        {localStatut === 'a_payer' ? (
          <button
            type="button"
            onClick={pay}
            disabled={pending}
            style={{
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              background: GREEN,
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {pending ? '…' : 'Marquer payé'}
          </button>
        ) : localStatut === 'paye' ? (
          <button
            type="button"
            onClick={unpay}
            disabled={pending}
            style={{
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              color: INK_SOFT,
              background: '#FFFFFF',
              border: '1px solid #E2D5C3',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {pending ? '…' : 'Annuler paiement'}
          </button>
        ) : (
          <span style={{ fontFamily: SANS, fontSize: 12, color: INK_SOFT }}>—</span>
        )}
      </td>
    </tr>
  );
}
