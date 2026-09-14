import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import KlantenBeheerTest from '../../../../components/KlantenBeheerTest';

export const dynamic = 'force-dynamic';

export default async function KlantenTestPage() {
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
        <div className="title">Electramo<span>portaal</span> — Klanten beheren (test)</div>
        <a href="/" className="btn">&larr; Terug naar hoofdmenu</a>
      </header>
      <div className="test-banner">
        Je bevindt je in de testomgeving — wijzigingen hier staan pas op de hoofdpagina zodra ze zijn overgezet
      </div>
      <KlantenBeheerTest />
    </div>
  );
}
