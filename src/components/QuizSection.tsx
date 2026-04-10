'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

type QuizSectionProps = {
  moduleSlug: string;
  tallyUrl: string;
  alreadyCompleted: boolean;
};

export default function QuizSection({
  moduleSlug,
  tallyUrl,
  alreadyCompleted,
}: QuizSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyCompleted);

  async function handleValidate() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Session expirée, reconnecte-toi.');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await supabase.from('progressions').upsert(
      {
        user_id: user.id,
        module_slug: moduleSlug,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,module_slug' }
    );

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    router.push('/formation');
    router.refresh();
  }

  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-gnd-primary">Quiz de validation</h2>
      <p className="mt-2 text-sm text-gnd-muted">
        Passe le quiz sur Tally puis reviens ici pour valider ce module. Ça prend environ 5 minutes.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={tallyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent"
        >
          📝 Passer le quiz
        </a>

        <button
          onClick={handleValidate}
          disabled={loading || done}
          className="btn-primary"
        >
          {done ? '✅ Module validé' : loading ? 'Validation…' : "✅ J'ai terminé mon quiz"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {done && !error && (
        <p className="mt-3 text-sm text-emerald-600">
          Bien joué. Retour à la liste des modules…
        </p>
      )}
    </section>
  );
}
