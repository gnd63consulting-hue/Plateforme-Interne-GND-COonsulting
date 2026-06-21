import { createClient } from '@/lib/supabase-server';
import {
  MOCKUP_SELECT_COLUMNS,
  type MockupRow,
  mockupStatusLabel,
  mockupStatusTone,
} from '@/lib/site-mockup';

export const dynamic = 'force-dynamic';

/**
 * Galerie des maquettes de site generees par le Studio (Dedale). Bibliotheque
 * pour les commerciaux : une demo a montrer/envoyer pour chaque prospect.
 */
export default async function MaquettesPage() {
  const supabase = await createClient();

  const { data: mockups } = await supabase
    .from('site_mockups')
    .select(MOCKUP_SELECT_COLUMNS)
    .order('updated_at', { ascending: false });

  const list = (mockups ?? []) as MockupRow[];
  const ids = Array.from(
    new Set(list.map((m) => m.prospect_id).filter((x): x is string => Boolean(x)))
  );

  const { data: prospects } = ids.length
    ? await supabase.from('prospects').select('id, company_name').in('id', ids)
    : { data: [] as { id: string; company_name: string | null }[] };

  const nameById = new Map((prospects ?? []).map((p) => [p.id, p.company_name]));

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-8">
      <div
        aria-hidden
        className="watermark pointer-events-none absolute -top-4 right-0 select-none font-marcellus text-[110px] leading-none text-cream/[0.08]"
      >
        Maquettes
      </div>

      <header className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              Studio Dedale
            </span>
          </span>
          <h1 className="mt-2 font-marcellus text-3xl tracking-tight text-choco">Maquettes</h1>
          <p className="mt-1.5 max-w-xl font-inter text-sm text-[#6F5A50]">
            Demos de sites generees pour les prospects. Montrez-les en rendez-vous ou envoyez le lien.
          </p>
        </div>
        <span className="inline-flex items-baseline gap-1.5 rounded-full border-l border-[rgba(74,36,26,0.07)] pl-3">
          <span className="font-num tabular-nums text-2xl font-semibold text-choco">{list.length}</span>
          <span className="font-grotesk text-[10px] uppercase tracking-[0.12em] text-muted-warm">
            maquettes
          </span>
        </span>
      </header>

      {list.length === 0 ? (
        <div className="panel flex items-center gap-4 rounded-[14px] p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M3 9h18M8 18v2M16 18v2M6 20h12" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-marcellus text-base text-choco">Aucune maquette pour l'instant.</p>
            <p className="font-inter text-xs text-[#6F5A50]">
              Les demos generees par le Studio apparaitront ici, pretes a partager.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <article key={m.id} className="panel card-hover flex flex-col rounded-[14px] p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${mockupStatusTone(m.status)}`}
                >
                  {mockupStatusLabel(m.status)}
                </span>
                {m.sector && (
                  <span className="rounded-full bg-cream-deep px-2.5 py-0.5 text-xs text-[#6F5A50]">
                    {m.sector}
                  </span>
                )}
              </div>
              <div className="mb-3 flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <rect x="3" y="4" width="18" height="14" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                </span>
                <h2 className="font-marcellus text-base leading-tight text-choco">
                  {(m.prospect_id && nameById.get(m.prospect_id)) || m.title || m.slug}
                </h2>
              </div>
              <p className="divider-warm truncate border-t-0 pt-3 font-num tabular-nums text-xs text-[#6F5A50]">
                {m.slug}
              </p>
              <div className="mt-auto pt-4">
                {m.preview_url ? (
                  <a
                    href={m.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-[#2A1810] shadow-[0_8px_20px_-8px_rgba(243,146,83,0.6)] transition hover:bg-brand-dark"
                  >
                    Voir la maquette ↗
                  </a>
                ) : (
                  <span className="inline-flex w-full items-center justify-center rounded-full border border-border-soft bg-cream/60 px-4 py-2.5 font-inter text-xs text-[#6F5A50]">
                    URL en attente
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
