import { redirect } from 'next/navigation';

/**
 * Legacy /dashboard → /formation.
 * /formation est désormais le hub principal (hero + bento grid des modules).
 */
export default function DashboardPage() {
  redirect('/formation');
}
