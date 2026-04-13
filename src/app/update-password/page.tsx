import Link from 'next/link';
import UpdatePasswordForm from './UpdatePasswordForm';

export const dynamic = 'force-dynamic';

export default function UpdatePasswordPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute right-[-5%] top-[-10%] h-[40%] w-[40%] rounded-full bg-primary-fixed/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[40%] w-[40%] rounded-full bg-tertiary-fixed/10 blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="mb-2 font-headline text-3xl font-extrabold tracking-tighter text-on-surface">
            Nouveau mot de passe
          </h1>
          <div className="mx-auto h-1 w-12 rounded-full bg-primary" />
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-10 shadow-editorial">
          <p className="mb-6 text-center font-body text-sm text-on-surface-variant">
            Définis ton mot de passe pour accéder à ton espace de formation.
          </p>

          <UpdatePasswordForm />

          <div className="mt-10 border-t border-outline-variant/10 pt-6 text-center">
            <Link
              href="/login"
              className="text-xs font-semibold text-primary/80 underline underline-offset-4 transition-all hover:text-primary"
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
