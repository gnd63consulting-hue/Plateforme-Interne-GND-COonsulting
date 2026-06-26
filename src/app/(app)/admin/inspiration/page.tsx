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
    <article className="panel card-hover flex flex-col overflow-hidden p-0">
      {r.preview_url && (
        <a
          href={r.preview_url}
          target="_blank"
          rel="noopener noreferrer"
          title="Voir l'aperçu en grand"
          className="group relative block aspect-[16/10] overflow-hidden bg-cream-deep"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.preview_url}
            alt={`Aperçu ${r.name}`}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-2 right-2 rounded-full bg-choco/80 px-2 py-0.5 text-[10px] font-semibold text-cream opacity-0 transition group-hover:opacity-100">
            Aperçu ↗
          </span>
        </a>
      )}
      <div className="flex flex-1 flex-col p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-pale p-2 text-brand-burnt shadow-soft">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-marcellus text-lg leading-tight text-choco">{r.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${kindTone(r.kind)}`}>
              {kindLabel(r.kind)}
            </span>
            {r.sector && (
              <span className="font-grotesk text-[10px] uppercase tracking-wide text-muted-warm">
                {r.sector}
              </span>
            )}
          </div>
        </div>
      </div>
      {r.notes && (
        <p className="mt-2.5 line-clamp-3 font-inter text-[13px] leading-relaxed text-[#6F5A50]">{r.notes}</p>
      )}
      {r.tags && r.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {r.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-md bg-cream-deep px-2 py-0.5 font-grotesk text-[10px] font-medium uppercase tracking-wide text-brand-burnt"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-3">
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
  // Références externes = refs externes + templates (Envato). Pas de section
  // séparée : tout vit dans la même section "Références externes".
  const ext = rows.filter((r) => r.kind === 'external_ref' || r.kind === 'template');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Studio · Bibliothèque
          </span>
        </span>
        <h1 className="mt-3 font-marcellus text-3xl tracking-tight text-choco">Inspiration</h1>
        <p className="mt-2 max-w-2xl font-inter text-sm leading-relaxed text-[#6F5A50]">
          Bibliotheque de references dont le Studio (Metis + Dedale) s'inspire pour produire les
          maquettes : sites GND (composants reutilisables) et references externes haut de gamme.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="panel flex items-center gap-3 p-4">
          <span className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-pale p-2.5 text-brand-burnt shadow-soft">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
            <h2 className="mb-4 flex items-center gap-2 font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
              Sites GND <span className="font-num tabular-nums text-muted-warm">({gnd.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gnd.map((r) => (
                <RefCard key={r.id} r={r} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-4 flex items-center gap-2 font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-burnt">
              References externes <span className="font-num tabular-nums text-muted-warm">({ext.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
