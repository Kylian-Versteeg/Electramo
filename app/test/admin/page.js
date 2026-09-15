import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { checkIsAdmin } from '../../../lib/isAdmin';
import AdminUploadTest from '../../../components/AdminUploadTest';

export default async function TestAdminPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await checkIsAdmin(supabase, user);

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Electramo<span>portaal</span> — Upload (test)</div>
        <a href="/test" className="btn">&larr; Terug naar testomgeving</a>
      </header>
      <div className="test-banner">
        Je bevindt je in de testomgeving — wijzigingen hier staan pas op de hoofdpagina zodra ze zijn overgezet
      </div>
      <AdminUploadTest />
    </div>
  );
}
