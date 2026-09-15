import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../lib/supabaseServer';
import { checkIsAdmin } from '../../lib/isAdmin';
import AdminUpload from '../../components/AdminUpload';

export default async function AdminPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await checkIsAdmin(supabase, user);

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Electramo<span>portaal</span> — Upload</div>
        <a href="/" className="btn">&larr; Terug naar hoofdmenu</a>
      </header>
      <AdminUpload />
    </div>
  );
}
