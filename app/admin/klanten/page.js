import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { checkIsAdmin } from '../../../lib/isAdmin';
import KlantenBeheer from '../../../components/KlantenBeheer';

export const dynamic = 'force-dynamic';

export default async function KlantenPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await checkIsAdmin(supabase, user);

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
