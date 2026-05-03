import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { InviteForm } from './InviteForm';
import { revokeInvitation } from './actions';

export default async function InvitationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'admin_limited'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .order('invited_at', { ascending: false })
    .limit(50);

  const pending = (invitations ?? []).filter((i) => !i.consumed_at);
  const consumed = (invitations ?? []).filter((i) => i.consumed_at);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Gestion des invitations</h1>
        <p className="text-sm text-gray-600 mt-1">
          Seules les personnes invitées peuvent se connecter à la plateforme.
          Les invitations expirent après 7 jours.
        </p>
      </header>

      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Inviter quelqu'un</h2>
        <InviteForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Invitations en attente ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune invitation en attente.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Rôle</th>
                <th className="py-2 px-3">Envoyée le</th>
                <th className="py-2 px-3">Expire le</th>
                <th className="py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((inv) => (
                <tr key={inv.id} className="border-b">
                  <td className="py-2 px-3">{inv.email}</td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                      {inv.role}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(inv.invited_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2 px-3">
                    <form action={revokeInvitation.bind(null, inv.id)}>
                      <button
                        type="submit"
                        className="text-red-600 hover:text-red-800 text-xs underline"
                      >
                        Révoquer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Invitations déjà consommées ({consumed.length})
        </h2>
        {consumed.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune.</p>
        ) : (
          <ul className="text-sm text-gray-600 space-y-1">
            {consumed.slice(0, 20).map((inv) => (
              <li key={inv.id}>
                <span className="font-mono">{inv.email}</span> — {inv.role} — consumée le{' '}
                {new Date(inv.consumed_at!).toLocaleDateString('fr-FR')}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
