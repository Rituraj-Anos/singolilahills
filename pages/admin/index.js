import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell.jsx';
import { supabase } from '../../lib/supabase.js';
import { COLLECTIONS } from '../../lib/admin/collections.js';

const count = async (table, filter) => {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: n } = await q;
  return n ?? 0;
};

function Overview() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    (async () => {
      const [newLeads, trips, posts, subs] = await Promise.all([
        count('inquiries', (q) => q.eq('status', 'new')),
        count('packages', (q) => q.eq('published', true)),
        count('posts', (q) => q.eq('published', true)),
        count('subscribers'),
      ]);
      setStats({ newLeads, trips, posts, subs });
      const { data } = await supabase.from('inquiries').select('id,name,package_interest,travel_dates,status,created_at').order('created_at', { ascending: false }).limit(6);
      setRecent(data || []);
    })();
  }, []);

  const tiles = stats && [
    { label: 'New enquiries waiting', value: stats.newLeads, href: '/admin/enquiries' },
    { label: 'Trips on the website', value: stats.trips, href: '/admin/packages' },
    { label: 'Journal stories', value: stats.posts, href: '/admin/posts' },
    { label: 'Newsletter subscribers', value: stats.subs, href: '/admin/subscribers' },
  ];

  return (
    <AdminShell title="Overview">
      <div className="adm-tiles">
        {(tiles || Array.from({ length: 4 }, () => null)).map((t, i) => (
          <Link key={i} href={t?.href || '#'} className="adm-card adm-tile">
            <span className="adm-tile-label">{t?.label || 'Loading'}</span>
            <strong>{t ? t.value : ' '}</strong>
          </Link>
        ))}
      </div>
      <section className="adm-card">
        <div className="adm-row-between">
          <h2>Latest enquiries</h2>
          <Link href="/admin/enquiries" className="adm-link">
            See all
          </Link>
        </div>
        {recent.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Trip</th>
                <th>When</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/enquiries?open=${r.id}`}>{r.name}</Link>
                  </td>
                  <td>{r.package_interest || '-'}</td>
                  <td>{r.travel_dates || '-'}</td>
                  <td>
                    <span className={`adm-pill s-${r.status}`}>{r.status}</span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-hint">No enquiries yet. They appear here as soon as someone sends the form on the website.</p>
        )}
      </section>
      <section className="adm-card">
        <h2>Edit the website</h2>
        <ul className="adm-quick">
          {Object.entries(COLLECTIONS).map(([k, c]) => (
            <li key={k}>
              <Link href={`/admin/${k}`}>{c.label}</Link>
            </li>
          ))}
          <li>
            <Link href="/admin/settings">Home page, contact details and legal pages</Link>
          </li>
        </ul>
      </section>
    </AdminShell>
  );
}
Overview.admin = true;
export default Overview;
