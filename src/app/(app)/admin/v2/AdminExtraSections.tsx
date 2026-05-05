'use client';

import ActivityTimeline, {
  type ActivityLogEntry,
} from '@/components/gnd/ActivityTimeline';
import FunnelSection, {
  type FunnelStage,
} from '@/components/gnd/FunnelSection';
import ClassementSection, {
  type CommercialRank,
} from '@/components/gnd/ClassementSection';
import PaliersSection, {
  type CommercialPalier,
} from '@/components/gnd/PaliersSection';

export type AdminExtraData = {
  funnel: FunnelStage[];
  classement: CommercialRank[];
  paliers: CommercialPalier[];
  activity: ActivityLogEntry[];
};

export default function AdminExtraSections({ data }: { data: AdminExtraData }) {
  return (
    <div
      style={{
        padding: '0 40px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Row 1: Funnel + Classement */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: 16,
        }}
      >
        <FunnelSection stages={data.funnel} />
        <ClassementSection ranking={data.classement} />
      </div>

      {/* Row 2: Paliers */}
      <PaliersSection commerciaux={data.paliers} />

      {/* Row 3: Activity Timeline */}
      <div
        style={{
          background: 'rgba(253,246,238,0.03)',
          border: '1px solid rgba(232,133,61,0.10)',
          borderRadius: 18,
          padding: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 24,
              height: 1,
              background: '#E8853D',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: '#E8853D',
            }}
          >
            ACTIVITÉ RÉCENTE · ÉQUIPE
          </span>
        </div>
        <ActivityTimeline logs={data.activity} />
      </div>
    </div>
  );
}
