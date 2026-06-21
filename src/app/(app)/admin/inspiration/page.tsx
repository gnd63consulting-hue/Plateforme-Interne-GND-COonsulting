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
    <article className="surface-ceramic card-hover flex flex-col rounded-3xl p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${kindTone(r.kind)}`}>
          {kindLabel(r.kind)}
        </span>
        {r.sector && <span className="text-xs text-[#6F5A50]">{r.sector}</span>}
      </div>
      <h2 className="font-marcellus text-lg text-choco">{r.name}</h2>
      {r.notes && (
        <p className="mt-1.5 font-inter text-sm leading-relaxed text-[#6F5A50]">{r.notes}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
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
            className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-white px-3 py-1.5 text-xs font-medium text-choco transition hover:bg-cream-deep"
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
      <header className="mb-8">
        <div className="label-eyebrow">Studio · Bibliothèque</div>
        <h1 className="mt-2 font-marcellus text-3xl tracking-tight text-choco">Inspiration</h1>
        <p className="mt-2 max-w-2xl font-inter text-sm leading-relaxed text-[#6F5A50]">
          Bibliotheque de references dont le Studio (Metis + Dedale) s'inspire pour produire les
          maquettes : sites GND (composants reutilisables) et references externes haut de gamme.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="surface-ceramic flex flex-col items-center rounded-3xl p-12 text-center">
          <span className="mb-4 inline-flex items-center justify-center rounded-2xl bg-brand-pale p-3 text-brand-dark shadow-soft">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <p className="font-inter text-sm text-[#6F5A50]">
            Aucune reference pour l'instant.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
              Sites GND ({gnd.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gnd.map((r) => (
                <RefCard key={r.id} r={r} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
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
