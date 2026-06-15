'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, CornerDownLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { labelForStatus, toneForStatus } from '@/lib/prospects';

/**
 * GlobalSearch — recherche globale fonctionnelle de la topbar (Sprint 12).
 *
 * Remplace l'ancien input decoratif. Cherche dans les prospects via le client
 * Supabase ANON : la RLS owner garantit que chaque commercial ne voit que SES
 * prospects (created_by/assigned_to). Aucune donnee d'un autre commercial ne
 * peut remonter.
 *
 * UX : palette facon command-k. Cmd+K / Ctrl+K focus l'input, ↑/↓ naviguent,
 * Entree ouvre la fiche, Echap ferme. Query debouncee a 200ms, max 8 resultats.
 */

type Hit = {
  id: string;
  company_name: string;
  contact_name: string | null;
  city: string | null;
  status: string;
  phone: string | null;
  email: string | null;
};

const HIT_COLUMNS = 'id, company_name, contact_name, city, status, phone, email';

/** Retire les caracteres qui cassent la syntaxe PostgREST .or()/ilike. */
function sanitize(term: string): string {
  return term.replace(/[,()%*]/g, ' ').trim();
}

export default function GlobalSearch() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);

  // Raccourci global Cmd+K / Ctrl+K -> focus + ouverture.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fermeture au clic exterieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  // Recherche debouncee.
  useEffect(() => {
    const q = sanitize(term);
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const pattern = `%${q}%`;
      const { data } = await supabase
        .from('prospects')
        .select(HIT_COLUMNS)
        .or(
          [
            `company_name.ilike.${pattern}`,
            `contact_name.ilike.${pattern}`,
            `city.ilike.${pattern}`,
            `email.ilike.${pattern}`,
            `phone.ilike.${pattern}`,
          ].join(',')
        )
        .limit(8);
      setHits((data ?? []) as unknown as Hit[]);
      setActive(0);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [term, supabase]);

  const go = useCallback(
    (id: string) => {
      setOpen(false);
      setTerm('');
      setHits([]);
      router.push(`/prospects/${id}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) go(hit.id);
    }
  }

  const showPanel = open && sanitize(term).length >= 2;

  return (
    <div ref={boxRef} className="relative hidden max-w-xl flex-1 sm:block">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Rechercher un prospect, une entreprise, un contact…"
        aria-label="Rechercher"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        autoComplete="off"
        className="h-10 w-full rounded-full bg-cream-deep pl-10 pr-16 text-sm text-ink-warm placeholder:text-muted-warm/70 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-ring"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border-soft bg-surface-soft px-1.5 py-0.5 font-inter text-[10px] font-semibold text-muted-warm"
      >
        ⌘K
      </kbd>

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border-soft/70 bg-surface-soft shadow-soft-lg"
        >
          {loading && hits.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-warm">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Recherche…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-warm">
              Aucun prospect trouve.
            </div>
          ) : (
            <ul
              className="max-h-80 overflow-y-auto py-1"
              data-lenis-prevent
            >
              {hits.map((h, i) => (
                <li key={h.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(h.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === active ? 'bg-cream' : 'hover:bg-cream'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-marcellus text-sm text-choco">
                        {h.company_name}
                      </p>
                      <p className="truncate text-xs text-muted-warm">
                        {[h.contact_name, h.city].filter(Boolean).join(' · ') ||
                          h.email ||
                          h.phone ||
                          '—'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneForStatus(
                        h.status
                      )}`}
                    >
                      {labelForStatus(h.status)}
                    </span>
                  </button>
                </li>
              ))}
              <li className="flex items-center justify-end gap-1.5 border-t border-border-soft/60 px-4 py-1.5 text-[10px] text-muted-warm">
                <CornerDownLeft className="h-3 w-3" aria-hidden /> ouvrir · ↑↓
                naviguer · Échap fermer
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
