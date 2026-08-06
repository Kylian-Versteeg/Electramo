import { createServerSupabase } from '../lib/supabaseServer';
import VoorraadApp from '../components/VoorraadApp';

export const dynamic = 'force-dynamic'; // altijd verse data, geen caching

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('code', { ascending: true });

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!user && adminEmails.includes((user.email || '').toLowerCase());

  return (
    <VoorraadApp
      initialProducts={products || []}
      loadError={error ? error.message : null}
      userEmail={user?.email || ''}
      isAdmin={isAdmin}
    />
  );
}
