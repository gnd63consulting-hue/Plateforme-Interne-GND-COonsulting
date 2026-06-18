import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import {
  INTEL_SELECT_COLUMNS,
  latestEnrichmentByProspect,
  type ProspectIntelRow,
  type LatestEnrichment,
} from '@/lib/prospect-intel';
import IntelCallListClient, { type IntelRowVM } from './IntelCallListClient';

export const dynamic = 'force-dynamic';

/**
 * Liste d'appel phone-first (Hermes / enrichissement Atlas).
 *
 * Affiche les prospects de l'utilisateur (RLS owner) enrichis de l'intel
 * la plus recente (prospect_intel, cascade FR). Le telephone couvre ~100% de
 * la base, l'email ~35% -> on met l'appel en avant. Aucun montant financier.
 *
 * Degrade proprement : si la migration 0028 n'est pas encore appliquee, la
 * requete prospect_intel renvoie 0 ligne pour un commercial -> la liste
 * s'affiche sans intel (coordonnees brutes du prospect), sans erreur.
 */
export default async function ProspectIntelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  type PRow = {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    prenom_contact: string | null;
    role_contact: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    sector: string | null;
    status: string | null;
    website: string | null;
  };

  const { data: prospectsRaw } = await supabase
    .from('prospects')
    .select(
      'id, company_name, contact_name, prenom_contact, role_contact, phone, email, city, sector, status, website'
    )
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const prospects = (prospectsRaw ?? []) as unknown as PRow[];
  const ids = prospects.map((p) => p.id);

  let intelMap = new Map<string, LatestEnrichment>();
  if (ids.length) {
    const { data: intelRaw } = await supabase
      .from('prospect_intel')
      .select(INTEL_SELECT_COLUMNS)
      .eq('intel_type', 'enrichment')
      .in('prospect_id', ids)
      .order('created_at', { ascending: false });
    intelMap = latestEnrichmentByProspect(
      (intelRaw ?? []) as unknown as ProspectIntelRow[]
    );
  }

  const rows: IntelRowVM[] = prospects.map((p) => {
    const e = intelMap.get(p.id);
    const dirigeant =
      e?.dirigeant_nom ??
      p.contact_name ??
      ([p.prenom_contact, p.role_contact].filter(Boolean).join(' ') || null);
    return {
      id: p.id,
      company: p.company_name ?? '--',
      dirigeant: dirigeant || null,
      tel: e?.tel_value || p.phone || null,
      email: e?.email_value || p.email || null,
      emailStatus: e?.email_status ?? null,
      city: e?.ville || p.city || null,
      sector: e?.naf_secteur || p.sector || null,
      status: p.status ?? null,
      enrichStatus: e?.status ?? null,
      angle: e?.angle_gnd ?? null,
      signal: e?.signal_detecte ?? null,
      presence: e?.presence_digitale ?? null,
      confidence: e?.confidence?.overall ?? null,
      sourceCount: Array.isArray(e?.source_urls) ? e!.source_urls!.length : 0,
      hasIntel: !!e,
    };
  });

  return <IntelCallListClient rows={rows} />;
}
