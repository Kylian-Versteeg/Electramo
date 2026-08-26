import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../lib/supabaseServer';
import KlantenBeheer from '../../../components/KlantenBeheer';

export const dynamic = 'force-dynamic';

export default async function KlantenPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = !!user && adminEmails.includes((user.email || '').toLowerCase());

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Electramo<span>portaal</span> — Klanten beheren</div>
        <a href="/" className="btn">&larr; Terug naar hoofdmenu</a>
      </header>
      <KlantenBeheer />
    </div>
  );
}
