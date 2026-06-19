import { createClient } from '@/lib/supabase-server';
import {
  DESIGN_REF_SELECT,
  type DesignRefRow,
  kindLabel,
  kindTone,
} from '@/lib/design-reference';

export const dynamic = 'force-dynamic';

function RefCard({ r }: { r: DesignRefRow }) {
  return (
    <article className="flex flex-col rounded-3xl border border-border-soft bg-white p-5 shadow-soft">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${kindTone(r.kind)}`}>
          {kindLabel(r.kind)}
        </span>
        {r.sector && <span className="text-xs text-choco/60">{r.sector}</span>}
      </div>
      <h2 className="font-marcellus text-lg text-brand-dark">{r.name}</h2>
      {r.notes && (
        <p className="mt-1 font-inter text-sm text-choco/80">{r.notes}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {r.url && (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-[#2A1810] transition hover:bg-brand-dark"
          >
            Voir le site ↗
          </a>
        )}
        {r.repo_url && (
          <a
            href={r.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-3 py-1.5 text-xs font-medium text-choco transition hover:bg-cream-deep/70"
          >
            Repo ↗
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * Page admin Inspiration : la bibliotheque design_references dont le Studio
 * (Metis + Dedale) s'inspire. Admin-only (RLS design_references_admin_all).
 */
export default async function InspirationPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('design_references')
    .select(DESIGN_REF_SELECT)
    .order('kind', { ascending: true })
    .order('name', { ascending: true });

  const rows = (data ?? []) as DesignRefRow[];
  const gnd = rows.filter((r) => r.kind === 'gnd_site');
  const ext = rows.filter((r) => r.kind === 'external_ref');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-marcellus text-3xl text-brand-dark">Inspiration</h1>
        <p className="mt-1 font-inter text-sm text-choco/70">
          Bibliotheque de references dont le Studio (Metis + Dedale) s'inspire pour produire les
          maquettes : sites GND (composants reutilisables) et references externes haut de gamme.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-border-soft bg-cream-deep/40 p-10 text-center font-inter text-choco/60">
          Aucune reference pour l'instant.
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.16em] text-muted-warm/80">
              Sites GND ({gnd.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gnd.map((r) => (
                <RefCard key={r.id} r={r} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.16em] text-muted-warm/80">
              References externes ({ext.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ext.map((r) => (
                <RefCard key={r.id} r={r} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
