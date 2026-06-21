import { PhoneCall, Megaphone, ShieldQuestion } from 'lucide-react';
import type { CallPitch } from '@/lib/prospect-intel';

/**
 * Carte "Pitch d'appel" — script tel pret-a-dire ecrit par Nyx (agent redacteur)
 * dans prospect_intel (intel_type='signal', source='nyx.call_pitch'). Phone-first :
 * le commercial lit le hook oral d'un coup d'oeil avant de decrocher.
 *
 * Composant SERVEUR (aucune interactivite). Rend null si aucun pitch -> la fiche
 * reste identique pour les prospects sans script. Cloisonnement : ne lit que le
 * pitch (aucune donnee financiere).
 */
export default function PitchAppelCard({ pitch }: { pitch: CallPitch | null }) {
  if (!pitch) return null;
  const { hookOral, raisonAppel, angle, objection } = pitch;
  if (!hookOral && !raisonAppel && !angle && !objection) return null;

  return (
    <section className="mb-5 rounded-3xl border border-border-soft bg-white p-5 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PhoneCall className="h-4 w-4 text-brand-dark" aria-hidden />
        <h2 className="font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-dark">
          Pitch d&apos;appel
        </h2>
        <span className="ml-auto text-[11px] text-muted-warm">A dire au telephone</span>
      </div>

      {hookOral && (
        <div className="panel-accent rounded-2xl p-3.5">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-warm">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" aria-hidden />
            <span className="font-medium text-choco">{hookOral}</span>
          </p>
        </div>
      )}

      {(raisonAppel || angle) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {raisonAppel && (
            <div>
              <p className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-warm/80">
                Raison de l&apos;appel
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-warm">{raisonAppel}</p>
            </div>
          )}
          {angle && (
            <div>
              <p className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-warm/80">
                Angle
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-warm">{angle}</p>
            </div>
          )}
        </div>
      )}

      {objection && (
        <div className="mt-3 rounded-2xl border border-border-soft bg-cream-deep/50 p-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-[#6F5A50]">
            <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-brand-burnt" aria-hidden />
            <span>
              <span className="font-semibold text-choco">Si on vous dit &laquo;&nbsp;ça me suffit&nbsp;&raquo; : </span>
              {objection}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
