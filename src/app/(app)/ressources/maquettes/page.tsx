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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-marcellus text-3xl text-brand-dark">Maquettes</h1>
        <p className="mt-1 font-inter text-sm text-choco/70">
          Demos de sites generees pour les prospects. Montrez-les en rendez-vous ou envoyez le lien.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-border-soft bg-cream-deep/40 p-10 text-center font-inter text-choco/60">
          Aucune maquette pour l'instant.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <article
              key={m.id}
              className="flex flex-col rounded-3xl border border-border-soft bg-white p-5 shadow-soft"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${mockupStatusTone(m.status)}`}
                >
                  {mockupStatusLabel(m.status)}
                </span>
                {m.sector && <span className="text-xs text-choco/60">{m.sector}</span>}
              </div>
              <h2 className="font-marcellus text-lg text-brand-dark">
                {(m.prospect_id && nameById.get(m.prospect_id)) || m.title || m.slug}
              </h2>
              <p className="mt-1 truncate font-inter text-xs text-choco/50">{m.slug}</p>
              <div className="mt-auto pt-4">
                {m.preview_url ? (
                  <a
                    href={m.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark"
                  >
                    Voir la maquette ↗
                  </a>
                ) : (
                  <span className="font-inter text-xs text-choco/40">URL en attente</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
