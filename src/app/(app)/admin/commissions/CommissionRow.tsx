'use client';

import { useState, useTransition } from 'react';
import { markCommissionPaid, markCommissionUnpaid } from './actions';

const CREAM = '#FDF6EE';
const CREAM_SOFT = 'rgba(253,246,238,0.6)';
const AMBER = '#E8853D';
const GREEN = '#7FC9A3';
const MONO = 'var(--font-geist-mono), ui-monospace, monospace';
const SANS = 'var(--font-geist-sans), system-ui, sans-serif';

/**
 * Ligne de commission (admin, thème dark). Le bouton « Marquer payé »
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
    localStatut === 'paye' ? GREEN : localStatut === 'annule' ? CREAM_SOFT : AMBER;
  const liveLabel = localStatut === statut ? statutLabel : localStatut === 'paye' ? 'Payé' : 'À payer';

  return (
    <tr style={{ borderBottom: '1px solid rgba(253,246,238,0.06)' }}>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color: CREAM_SOFT, whiteSpace: 'nowrap' }}>
        {dateLabel}
      </td>
      <td style={{ padding: '12px 16px', color: CREAM, fontFamily: SANS }}>
        {company ?? '—'}
      </td>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color: CREAM_SOFT, fontVariantNumeric: 'tabular-nums' }}>
        {baseLabel}
      </td>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 12, color: CREAM_SOFT, fontVariantNumeric: 'tabular-nums' }}>
        {rateLabel}
      </td>
      <td style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: CREAM, fontVariantNumeric: 'tabular-nums' }}>
        {amountLabel}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: statutColor }}>
          {liveLabel}
        </span>
        {error && (
          <span style={{ display: 'block', fontFamily: SANS, fontSize: 11, color: '#E8896B', marginTop: 2 }}>
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
              color: '#1A0F0E',
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
              color: CREAM_SOFT,
              background: 'transparent',
              border: '1px solid rgba(232,133,61,0.20)',
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
          <span style={{ fontFamily: SANS, fontSize: 12, color: CREAM_SOFT }}>—</span>
        )}
      </td>
    </tr>
  );
}
