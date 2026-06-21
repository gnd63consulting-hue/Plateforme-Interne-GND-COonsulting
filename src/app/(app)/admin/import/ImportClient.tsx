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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-choco">Import de prospects (CSV)</h1>
      <p className="mt-2 text-sm text-muted-warm">
        Colle un tableau ou charge un fichier .csv. Les colonnes sont reconnues
        automatiquement (entreprise, telephone, email, ville, secteur...). Les
        doublons avec la base et dans le fichier sont ecartes. Les prospects
        importes arrivent non assignes dans le pool, a router ensuite.
      </p>

      {/* Etape 1 : source */}
      <section className="mt-6 rounded-xl border border-[rgba(74,36,26,0.10)] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-warm">
          1. Charger les donnees
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-choco px-4 py-2 text-sm font-medium text-white hover:bg-choco">
            Choisir un fichier .csv
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              className="hidden"
              onChange={onFile}
            />
          </label>
          {fileName && <span className="text-sm text-muted-warm">{fileName}</span>}
        </div>
        <div className="mt-3">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="...ou colle ici (1re ligne = en-tetes : Entreprise;Telephone;Email;Ville...)"
            rows={6}
            className="w-full rounded-lg border border-[rgba(74,36,26,0.10)] p-3 font-mono text-xs text-ink-warm focus:border-border-soft focus:outline-none"
          />
          <button
            type="button"
            onClick={() => doMap(raw)}
            disabled={!raw.trim()}
            className="mt-2 rounded-lg border border-border-soft px-3 py-1.5 text-sm font-medium text-ink-warm hover:bg-cream disabled:opacity-40"
          >
            Analyser le texte colle
          </button>
        </div>
      </section>

      {/* Etape 2 : mapping + apercu */}
      {map && (
        <section className="mt-5 rounded-xl border border-[rgba(74,36,26,0.10)] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-warm">
            2. Colonnes reconnues
          </h2>
          {rowCount === 0 ? (
            <p className="mt-3 text-sm text-rose-600">
              Aucune ligne de donnees detectee. Verifie que la 1re ligne contient
              les en-tetes et qu'il y a au moins une ligne en dessous.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {map.recognized.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
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
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  Colonne "Entreprise" introuvable. Renomme l'en-tete concerne
                  (ex. Entreprise, Societe, Nom) : c'est le seul champ obligatoire.
                </p>
              )}

              <p className="mt-3 text-sm text-[#6F5A50]">
                <strong>{rowCount}</strong> ligne{rowCount > 1 ? 's' : ''} de donnees detectee
                {rowCount > 1 ? 's' : ''}.
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-muted-warm">
                    <tr>
                      <th className="py-1 pr-4">Entreprise</th>
                      <th className="py-1 pr-4">Contact</th>
                      <th className="py-1 pr-4">Telephone</th>
                      <th className="py-1 pr-4">Email</th>
                      <th className="py-1 pr-4">Ville</th>
                      <th className="py-1 pr-4">Secteur</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-warm">
                    {map.rows.slice(0, 10).map((p, i) => (
                      <tr key={i} className="border-t border-[rgba(74,36,26,0.08)]">
                        <td className="py-1 pr-4">{p.company_name ?? '--'}</td>
                        <td className="py-1 pr-4">{p.contact_name ?? '--'}</td>
                        <td className="py-1 pr-4">{p.phone ?? '--'}</td>
                        <td className="py-1 pr-4">{p.email ?? '--'}</td>
                        <td className="py-1 pr-4">{p.city ?? '--'}</td>
                        <td className="py-1 pr-4">{p.sector ?? '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rowCount > 10 && (
                  <p className="mt-2 text-xs text-muted-warm">
                    ...et {rowCount - 10} autre{rowCount - 10 > 1 ? 's' : ''}.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={runAnalyze}
                disabled={!canProceed || pending}
                className="mt-4 rounded-lg bg-choco px-4 py-2 text-sm font-medium text-white hover:bg-choco disabled:opacity-40"
              >
                {pending ? 'Analyse...' : 'Verifier les doublons'}
              </button>
            </>
          )}
        </section>
      )}

      {/* Etape 3 : analyse + import */}
      {analysis && (
        <section className="mt-5 rounded-xl border border-[rgba(74,36,26,0.10)] bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-warm">
            3. Resultat de l'analyse
          </h2>
          {analysis.error ? (
            <p className="mt-3 text-sm text-rose-600">{analysis.error}</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="A importer" value={analysis.toInsert} tone="emerald" />
                <Stat label="Deja en base" value={analysis.duplicatesInDb} tone="amber" />
                <Stat label="Doublons fichier" value={analysis.duplicatesInFile} tone="slate" />
                <Stat label="Invalides" value={analysis.invalid} tone="rose" />
              </div>
              <p className="mt-3 text-xs text-muted-warm">
                Sur {analysis.total} lignes, {analysis.toInsert} nouveaux prospects
                seront crees (statut "A contacter", non assignes). Les doublons et
                lignes sans entreprise sont ignores.
              </p>
              <button
                type="button"
                onClick={runImport}
                disabled={analysis.toInsert === 0 || pending}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
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
          className={`mt-5 rounded-xl border p-5 ${
            result.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
          }`}
        >
          {result.ok ? (
            <p className="text-sm text-emerald-800">
              Import termine : <strong>{result.inserted}</strong> prospect
              {result.inserted > 1 ? 's' : ''} cree{result.inserted > 1 ? 's' : ''}
              {result.skipped > 0 ? ` ; ${result.skipped} ignore(s) (doublons/invalides).` : '.'}
            </p>
          ) : (
            <p className="text-sm text-rose-700">Echec : {result.error}</p>
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
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-cream text-[#6F5A50]',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`rounded-lg p-3 text-center ${tones[tone]}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
