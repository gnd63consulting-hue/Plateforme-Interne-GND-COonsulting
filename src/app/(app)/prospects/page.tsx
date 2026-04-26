import { createClient } from '@/lib/supabase-server';
import ProspectTable from '@/components/ProspectTable';
import { PROSPECT_SELECT_COLUMNS, type Prospect } from '@/lib/prospects';

export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: prospects } = await supabase
    .from('prospects')
    .select(PROSPECT_SELECT_COLUMNS)
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold text-gnd-primary">Mes prospects</h1>
        <p className="mt-1 text-gnd-muted">
          Ton carnet de bord personnel. Crée, édite, fais évoluer tes prospects au fil des contacts.
        </p>
      </section>

      <ProspectTable
        initialProspects={(prospects ?? []) as Prospect[]}
        currentUserId={user.id}
      />
    </div>
  );
}
