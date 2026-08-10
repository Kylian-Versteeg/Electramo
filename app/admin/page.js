import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../lib/supabaseServer';
import AdminUpload from '../../components/AdminUpload';

export default async function AdminPage() {
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
        <div className="title">Electramo<span>portaal</span> — Beheer</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/admin/klanten" className="btn accent">Klanten beheren</a>
          <a href="/" className="btn">&larr; Terug naar voorraadlijst</a>
        </div>
      </header>
      <AdminUpload />
    </div>
  );
}
