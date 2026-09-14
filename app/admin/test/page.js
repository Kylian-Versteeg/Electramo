import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../../lib/supabaseServer';
import AdminUploadTest from '../../../components/AdminUploadTest';

export default async function AdminTestPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!user && adminEmails.includes((user.email || '').toLowerCase());

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="wrap">
      <header>
        <div className="title">Electramo<span>portaal</span> — Upload (test)</div>
        <a href="/" className="btn">&larr; Terug naar hoofdmenu</a>
      </header>
      <div className="test-banner">
        Je bevindt je in de testomgeving — wijzigingen hier staan pas op de hoofdpagina zodra ze zijn overgezet
      </div>
      <AdminUploadTest />
    </div>
  );
}
