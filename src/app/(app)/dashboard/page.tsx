import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { MODULES } from '@/lib/modules-registry';

export const dynamic = 'force-dynamic';

type ProspectStatutCount = {
  a_contacter: number;
  contacte: number;
  rdv_pris: number;
  devis_envoye: number;
  gagne: number;
  perdu: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guarantees user, but we re-check for type safety.
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const { data: progressions } = await supabase
    .from('progressions')
    .select('module_slug, completed');

  const completedSet = new Set(
    (progressions ?? [])
      .filter((p) => p.completed)
      .map((p) => p.module_slug)
  );

  const completedCount = MODULES.filter((m) => completedSet.has(m.slug)).length;
  const nextModule =
    MODULES.find((m) => !completedSet.has(m.slug)) ?? MODULES[MODULES.length - 1];

  const { data: prospects } = await supabase
    .from('prospects')
    .select('statut');

  const statutCounts: ProspectStatutCount = {
    a_contacter: 0,
    contacte: 0,
    rdv_pris: 0,
    devis_envoye: 0,
    gagne: 0,
    perdu: 0,
  };
  for (const row of prospects ?? []) {
    const key = row.statut as keyof ProspectStatutCount;
    if (key in statutCounts) statutCounts[key]++;
  }

  const prenom =
    profile?.full_name?.split(' ')[0] ??
    profile?.email?.split('@')[0] ??
    'commercial';

  const progressPercent = Math.round((completedCount / MODULES.length) * 100);
  const allDone = completedCount === MODULES.length;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gnd-primary">Bonjour {prenom}</h1>
        <p className="mt-1 text-gnd-muted">
          Ton hub personnel : formation, ressources et suivi prospects.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {/* Formation */}
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gnd-primary">Ma formation</h2>
            <p className="mt-1 text-sm text-gnd-muted">
              {completedCount} / {MODULES.length} modules validés
            </p>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gnd-accent transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Link
            href={allDone ? '/formation' : `/formation/${nextModule.slug}`}
            className="btn-primary mt-6 w-full"
          >
            {allDone ? 'Revoir les modules' : 'Continuer'}
          </Link>
        </div>

        {/* Prospects */}
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gnd-primary">Mes prospects</h2>
            <p className="mt-1 text-sm text-gnd-muted">
              {prospects?.length ?? 0} prospect{(prospects?.length ?? 0) > 1 ? 's' : ''} au total
            </p>

            <ul className="mt-4 space-y-1 text-sm text-slate-600">
              <li className="flex justify-between">
                <span>À contacter</span>
                <span className="font-medium">{statutCounts.a_contacter}</span>
              </li>
              <li className="flex justify-between">
                <span>RDV pris</span>
                <span className="font-medium">{statutCounts.rdv_pris}</span>
              </li>
              <li className="flex justify-between">
                <span>Gagnés</span>
                <span className="font-medium text-emerald-600">{statutCounts.gagne}</span>
              </li>
            </ul>
          </div>

          <Link href="/prospects" className="btn-secondary mt-6 w-full">
            Voir mes prospects
          </Link>
        </div>

        {/* Ressources */}
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gnd-primary">Mes ressources</h2>
            <p className="mt-1 text-sm text-gnd-muted">
              Fiches produits, scripts, templates et argumentaires.
            </p>
          </div>

          <Link href="/ressources" className="btn-secondary mt-6 w-full">
            Accéder aux ressources
          </Link>
        </div>
      </section>
    </div>
  );
}
