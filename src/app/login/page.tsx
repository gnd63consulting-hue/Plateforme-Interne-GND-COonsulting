import { redirect } from 'next/navigation';
import { createClient, MissingSupabaseEnvError } from '@/lib/supabase-server';
import LoginButton from './LoginButton';

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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Blobs décoratifs Academic Atelier */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute right-[-5%] top-[-10%] h-[40%] w-[40%] rounded-full bg-primary-fixed/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[40%] w-[40%] rounded-full bg-tertiary-fixed/10 blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-16 text-center">
          <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tighter text-on-surface">
            GND Formation
          </h1>
          <div className="mx-auto h-1 w-12 rounded-full bg-primary" />
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-10 shadow-editorial">
          <div className="mb-8 text-center">
            <p className="font-body text-base font-medium leading-relaxed text-on-surface-variant">
              Connecte-toi pour accéder à ton espace.
            </p>
          </div>

          {missingEnv ? (
            <div className="rounded-xl border border-tertiary-fixed/60 bg-tertiary-fixed/30 p-4 text-xs text-on-tertiary-fixed">
              <strong className="block mb-1">Configuration incomplète</strong>
              Les variables d&apos;environnement Supabase ne sont pas encore
              définies sur Vercel. Ajoute{' '}
              <code className="rounded bg-tertiary-fixed/50 px-1">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{' '}
              et{' '}
              <code className="rounded bg-tertiary-fixed/50 px-1">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{' '}
              dans Settings → Environment Variables, puis redeploy.
            </div>
          ) : (
            <LoginButton />
          )}

          <div className="mt-12 border-t border-outline-variant/10 pt-8 text-center">
            <p className="mb-4 font-body text-xs tracking-wide text-on-surface-variant">
              Accès réservé aux membres invités de GND Consulting.
            </p>
            <a
              href="mailto:contact@gndconsulting.fr"
              className="text-xs font-semibold text-primary/80 underline underline-offset-4 transition-all hover:text-primary"
            >
              Besoin d&apos;aide ?
            </a>
          </div>
        </div>

        <div className="mt-16 text-center opacity-40">
          <span className="material-symbols-outlined text-4xl text-outline">
            menu_book
          </span>
        </div>
      </div>

      {/* Texte décoratif Academic Atelier */}
      <div className="absolute bottom-12 left-12 hidden max-w-[240px] lg:block">
        <p className="select-none font-headline text-6xl font-extrabold leading-none text-on-background/10">
          LEARN
          <br />
          BETTER.
        </p>
      </div>
    </main>
  );
}
