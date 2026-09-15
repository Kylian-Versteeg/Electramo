import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../../lib/supabaseServer';
import { checkIsAdmin } from '../../../../lib/isAdmin';
import KlantenBeheerTest from '../../../../components/KlantenBeheerTest';

export const dynamic = 'force-dynamic';

export default async function TestKlantenPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await checkIsAdmin(supabase, user);

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Electramo<span>portaal</span> — Klanten beheren (test)</div>
        <a href="/test" className="btn">&larr; Terug naar testomgeving</a>
      </header>
      <div className="test-banner">
        Je bevindt je in de testomgeving — wijzigingen hier staan pas op de hoofdpagina zodra ze zijn overgezet
      </div>
      <KlantenBeheerTest />
    </div>
  );
}
