import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, MissingSupabaseEnvError } from '@/lib/supabase-server';
import LoginButton from './LoginButton';
import LoginHero from './LoginHero';

export default async function LoginPage() {
  let missingEnv = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/formation');
    }
  } catch (err) {
    if (err instanceof MissingSupabaseEnvError) {
      missingEnv = true;
    } else {
      throw err;
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gnd-cream font-sans text-gnd-bronze">
      {/* ====================================================== */}
      {/* Background: warm gradient + decorative ornaments        */}
      {/* ====================================================== */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gnd-cream via-gnd-paper to-gnd-cream-dim" />
        {/* Soft warm blob top-right */}
        <div className="absolute right-[-10%] top-[-15%] h-[60%] w-[55%] rounded-full bg-gnd-amber/10 blur-[140px]" />
        {/* Cooler blob bottom-left */}
        <div className="absolute bottom-[-15%] left-[-10%] h-[60%] w-[55%] rounded-full bg-gnd-bronze/8 blur-[140px]" />
        {/* Decorative giant G */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-20 select-none font-display text-[36rem] font-black leading-none text-gnd-bronze/5"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
        >
          G
        </div>
      </div>

      {/* ====================================================== */}
      {/* Content                                                  */}
      {/* ====================================================== */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-screen-2xl grid-cols-1 lg:grid-cols-12">
        {/* Hero column — 7/12 on desktop, full on mobile */}
        <section className="flex items-center px-6 py-16 sm:px-10 md:px-16 lg:col-span-7 lg:px-20">
          <LoginHero />
        </section>

        {/* Login column — 5/12 on desktop, stacks on mobile */}
        <section className="flex items-center justify-center px-6 pb-16 sm:px-10 md:px-16 lg:col-span-5 lg:px-12">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-3xl border border-gnd-bronze/8 bg-white/70 p-10 shadow-warm-lg backdrop-blur-md">
              {/* Hairline accent top */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gnd-amber/40 to-transparent" />

              <div className="mb-8">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-gnd-amber">
                  Connexion
                </p>
                <h2 className="mt-3 font-display text-2xl font-medium leading-tight text-gnd-bronze">
                  Accès à ton espace.
                </h2>
              </div>

              {missingEnv ? (
                <div className="rounded-2xl border border-gnd-amber/30 bg-gnd-amber-pale/40 p-4 text-xs text-gnd-bronze">
                  <strong className="mb-1 block">
                    Configuration incomplète
                  </strong>
                  Les variables d&apos;environnement Supabase ne sont pas
                  encore définies sur Vercel. Ajoute{' '}
                  <code className="rounded bg-white/60 px-1 font-mono">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{' '}
                  et{' '}
                  <code className="rounded bg-white/60 px-1 font-mono">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>{' '}
                  dans Settings → Environment Variables, puis redeploy.
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="h-14 w-full animate-pulse rounded-full bg-gnd-bronze/5" />
                  }
                >
                  <LoginButton />
                </Suspense>
              )}

              <div className="mt-10 border-t border-gnd-bronze/8 pt-6">
                <p className="text-balance text-center text-xs leading-relaxed text-gnd-bronze-soft">
                  Accès réservé aux membres invités
                  <br />
                  de GND Consulting.
                </p>
                <a
                  href="mailto:contact@gndconsulting.fr"
                  className="mt-3 block text-center text-xs font-semibold text-gnd-amber underline decoration-gnd-amber/30 underline-offset-4 transition-colors hover:decoration-gnd-amber"
                >
                  Besoin d&apos;aide ?
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================== */}
      {/* Footer mark                                              */}
      {/* ====================================================== */}
      <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 lg:left-8 lg:translate-x-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gnd-bronze/40">
          GND · Mai 2026
        </span>
      </div>
    </main>
  );
}
