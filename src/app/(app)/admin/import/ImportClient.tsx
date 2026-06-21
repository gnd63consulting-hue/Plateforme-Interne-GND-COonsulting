'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import { mapCsv, type CsvMapping, type ImportRowInput } from '@/lib/csv';
import {
  analyzeImport,
  commitImport,
  type ImportAnalysis,
  type ImportResult,
} from './actions';

const FIELD_LABELS: Record<keyof ImportRowInput, string> = {
  company_name: 'Entreprise',
  contact_name: 'Contact',
  phone: 'Telephone',
  email: 'Email',
  website: 'Site web',
  city: 'Ville',
  postal_code: 'Code postal',
  sector: 'Secteur',
  address: 'Adresse',
  ca_estime: 'CA estime',
  notes: 'Notes',
};

export default function ImportClient() {
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [map, setMap] = useState<CsvMapping | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  function doMap(text: string) {
    setAnalysis(null);
    setResult(null);
    setMap(mapCsv(text));
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setRaw(text);
    doMap(text);
  }

  const rowCount = map?.rows.length ?? 0;
  const hasCompany = map?.recognized.includes('company_name') ?? false;
  const canProceed = !!map && rowCount > 0 && hasCompany;

  function runAnalyze() {
    if (!map) return;
    setResult(null);
    start(async () => {
      setAnalysis(await analyzeImport(map.rows));
    });
  }

  function runImport() {
    if (!map) return;
    start(async () => {
      const r = await commitImport(map.rows);
      setResult(r);
      if (r.ok) setAnalysis(null);
    });
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8">
      <span
        aria-hidden
        className="watermark pointer-events-none absolute -top-4 right-0 text-[120px] leading-none"
      >
        Import
      </span>

      {/* En-tete editorial */}
      <header className="relative">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
          <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
            Pool prospects
          </span>
        </span>
        <h1 className="mt-2 font-marcellus text-3xl tracking-tight text-choco">
          Import de prospects (CSV)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6F5A50]">
          Colle un tableau ou charge un fichier .csv. Les colonnes sont reconnues
          automatiquement (entreprise, telephone, email, ville, secteur...). Les
          doublons avec la base et dans le fichier sont ecartes. Les prospects
          importes arrivent non assignes dans le pool, a router ensuite.
        </p>
      </header>

      {/* Etape 1 : source */}
      <section className="panel-accent mt-6 rounded-[14px] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              Etape 1
            </span>
            <h2 className="font-marcellus text-lg leading-tight text-choco">Charger les donnees</h2>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark orange-glow">
            Choisir un fichier .csv
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              className="hidden"
              onChange={onFile}
            />
          </label>
          {fileName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm text-ink-warm hairline">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              <span className="font-num">{fileName}</span>
            </span>
          )}
        </div>
        <div className="mt-3">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="...ou colle ici (1re ligne = en-tetes : Entreprise;Telephone;Email;Ville...)"
            rows={6}
            className="w-full rounded-2xl border border-border-soft bg-cream/60 p-3 font-mono text-xs text-ink-warm transition focus-visible:ring-2 focus-visible:ring-brand-ring focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={() => doMap(raw)}
            disabled={!raw.trim()}
            className="mt-3 rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-medium text-choco transition hover:bg-cream-deep disabled:opacity-40"
          >
            Analyser le texte colle
          </button>
        </div>
      </section>

      {/* Etape 2 : mapping + apercu */}
      {map && (
        <section className="panel mt-6 rounded-[14px] p-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              Etape 2 — Colonnes reconnues
            </span>
          </span>
          {rowCount === 0 ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-danger-bg px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt" aria-hidden>!</span>
              <p className="text-sm text-danger-fg">
                Aucune ligne de donnees detectee. Verifie que la 1re ligne contient
                les en-tetes et qu'il y a au moins une ligne en dessous.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {map.recognized.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-ok-bg px-3 py-1 text-xs font-medium text-ok-fg"
                  >
                    {FIELD_LABELS[f]}
                  </span>
                ))}
                {map.ignored.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-cream-deep px-3 py-1 text-xs text-muted-warm line-through"
                    title="Colonne ignoree (non reconnue)"
                  >
                    {h || '(vide)'}
                  </span>
                ))}
              </div>

              {!hasCompany && (
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-danger-bg px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt" aria-hidden>!</span>
                  <p className="text-sm text-danger-fg">
                    Colonne "Entreprise" introuvable. Renomme l'en-tete concerne
                    (ex. Entreprise, Societe, Nom) : c'est le seul champ obligatoire.
                  </p>
                </div>
              )}

              <p className="mt-3 text-sm text-[#6F5A50]">
                <strong className="font-num text-choco">{rowCount}</strong> ligne{rowCount > 1 ? 's' : ''} de donnees detectee
                {rowCount > 1 ? 's' : ''}.
              </p>

              <div className="mt-3 overflow-x-auto rounded-2xl hairline">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-cream/60 text-brand-burnt">
                    <tr>
                      <th className="px-4 py-2 font-grotesk font-semibold uppercase tracking-[0.1em]">Entreprise</th>
                      <th className="px-4 py-2 font-grotesk font-semibold uppercase tracking-[0.1em]">Contact</th>
                      <th className="px-4 py-2 font-grotesk font-semibold uppercase tracking-[0.1em]">Telephone</th>
                      <th className="px-4 py-2 font-grotesk font-semibold uppercase tracking-[0.1em]">Email</th>
                      <th className="px-4 py-2 font-grotesk font-semibold uppercase tracking-[0.1em]">Ville</th>
                      <th className="px-4 py-2 font-grotesk font-semibold uppercase tracking-[0.1em]">Secteur</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-warm">
                    {map.rows.slice(0, 10).map((p, i) => (
                      <tr key={i} className="divider-warm">
                        <td className="px-4 py-2.5 font-medium text-choco">{p.company_name ?? '--'}</td>
                        <td className="px-4 py-2.5">{p.contact_name ?? '--'}</td>
                        <td className="px-4 py-2.5 font-num tabular-nums">{p.phone ?? '--'}</td>
                        <td className="px-4 py-2.5">{p.email ?? '--'}</td>
                        <td className="px-4 py-2.5">{p.city ?? '--'}</td>
                        <td className="px-4 py-2.5">{p.sector ?? '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rowCount > 10 && (
                  <p className="px-4 py-2 text-xs text-muted-warm">
                    ...et <span className="font-num">{rowCount - 10}</span> autre{rowCount - 10 > 1 ? 's' : ''}.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={runAnalyze}
                disabled={!canProceed || pending}
                className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:opacity-40 orange-glow"
              >
                {pending ? 'Analyse...' : 'Verifier les doublons'}
              </button>
            </>
          )}
        </section>
      )}

      {/* Etape 3 : analyse + import */}
      {analysis && (
        <section className="panel mt-6 rounded-[14px] p-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-gradient-to-r from-brand to-transparent" />
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-burnt">
              Etape 3 — Resultat de l'analyse
            </span>
          </span>
          {analysis.error ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-danger-bg px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-pale text-brand-burnt" aria-hidden>!</span>
              <p className="text-sm text-danger-fg">{analysis.error}</p>
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="A importer" value={analysis.toInsert} tone="emerald" />
                <Stat label="Deja en base" value={analysis.duplicatesInDb} tone="amber" />
                <Stat label="Doublons fichier" value={analysis.duplicatesInFile} tone="slate" />
                <Stat label="Invalides" value={analysis.invalid} tone="rose" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#6F5A50]">
                Sur <span className="font-num text-choco">{analysis.total}</span> lignes, <span className="font-num text-choco">{analysis.toInsert}</span> nouveaux prospects
                seront crees (statut "A contacter", non assignes). Les doublons et
                lignes sans entreprise sont ignores.
              </p>
              <button
                type="button"
                onClick={runImport}
                disabled={analysis.toInsert === 0 || pending}
                className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-[#2A1810] transition hover:bg-brand-dark disabled:opacity-40 orange-glow"
              >
                {pending
                  ? 'Import...'
                  : `Importer ${analysis.toInsert} prospect${analysis.toInsert > 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </section>
      )}

      {/* Resultat final */}
      {result && (
        <section
          className={`mt-6 flex items-center gap-3 rounded-[14px] p-4 ${
            result.ok ? 'bg-ok-bg' : 'bg-danger-bg'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
              result.ok ? 'bg-ok-fg/10 text-ok-fg' : 'bg-brand-pale text-brand-burnt'
            }`}
            aria-hidden
          >
            {result.ok ? '✓' : '!'}
          </span>
          {result.ok ? (
            <p className="text-sm text-ok-fg">
              Import termine : <strong className="font-num">{result.inserted}</strong> prospect
              {result.inserted > 1 ? 's' : ''} cree{result.inserted > 1 ? 's' : ''}
              {result.skipped > 0 ? ` ; ${result.skipped} ignore(s) (doublons/invalides).` : '.'}
            </p>
          ) : (
            <p className="text-sm text-danger-fg">Echec : {result.error}</p>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'slate' | 'rose';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-ok-bg text-ok-fg',
    amber: 'bg-warn-bg text-warn-fg',
    slate: 'bg-cream text-[#6F5A50]',
    rose: 'bg-danger-bg text-danger-fg',
  };
  return (
    <div className={`rounded-2xl p-4 text-center hairline ${tones[tone]}`}>
      <div className="font-num text-2xl tabular-nums">{value}</div>
      <div className="mt-1 font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</div>
    </div>
  );
}
