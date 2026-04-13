import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-background">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 px-8 py-8 md:flex-row md:px-12">
        <div className="text-center md:text-left">
          <span className="font-headline font-bold text-on-surface">
            GND Consulting
          </span>
          <p className="mt-1 text-sm tracking-wide text-on-surface-variant">
            © {new Date().getFullYear()} GND Consulting. Espace formation.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-sm">
          <Link
            href="/ressources"
            className="text-on-surface-variant transition-colors hover:text-primary"
          >
            Ressources
          </Link>
          <a
            href="mailto:contact@gndconsulting.fr"
            className="text-on-surface-variant transition-colors hover:text-primary"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
