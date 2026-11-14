import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../../components/admin/AdminShell.jsx';
import { supabase } from '../../../lib/supabase.js';
import { dbMessage, download, toCsv } from '../../../lib/admin/api.js';
import { CLIENT_TAGS, balance, inr } from '../../../lib/invoice.mjs';

const today = () => new Date().toISOString().slice(0, 10);

function Clients() {
  const [clients, setClients] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [problem, setProblem] = useState('');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [tab, setTab] = useState('all');
  const [toastNode] = useToast();

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from('clients').select('*').order('updated_at', { ascending: false }).limit(2000),
      supabase.from('inquiries').select('id, client_id, created_at').not('client_id', 'is', null).limit(5000),
      supabase.from('invoices').select('id, client_id, status, total, paid_total').limit(5000),
    ]).then(([c, e, i]) => {
      if (c.error) return setProblem(dbMessage(c.error));
      setClients(c.data);
      setEnquiries(e.data || []);
      setInvoices(i.data || []);
    });
  }, []);

  // enquiry count, last contact and money owed for each client
  const stats = useMemo(() => {
    const s = {};
    for (const e of enquiries) {
      const x = (s[e.client_id] ||= { enquiries: 0, last: '', invoices: 0, due: 0 });
      x.enquiries += 1;
      if (e.created_at > x.last) x.last = e.created_at;
    }
    for (const inv of invoices) {
      if (!inv.client_id) continue;
      const x = (s[inv.client_id] ||= { enquiries: 0, last: '', invoices: 0, due: 0 });
      x.invoices += 1;
      if (['issued', 'partly_paid'].includes(inv.status)) x.due += balance(inv);
    }
    return s;
  }, [enquiries, invoices]);

  const tags = useMemo(() => [...new Set([...CLIENT_TAGS, ...(clients || []).flatMap((c) => c.tags || [])])], [clients]);
  const counts = useMemo(() => {
    const all = clients || [];
    return {
      all: all.length,
      follow: all.filter((c) => c.follow_up_on && c.follow_up_on <= today()).length,
      repeat: all.filter((c) => (stats[c.id]?.enquiries || 0) > 1).length,
      owes: all.filter((c) => (stats[c.id]?.due || 0) > 0).length,
    };
  }, [clients, stats]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    return (clients || []).filter((c) => {
      const st = stats[c.id] || {};
      if (tab === 'follow' && !(c.follow_up_on && c.follow_up_on <= today())) return false;
      if (tab === 'repeat' && !((st.enquiries || 0) > 1)) return false;
      if (tab === 'owes' && !((st.due || 0) > 0)) return false;
      if (tag && !(c.tags || []).includes(tag)) return false;
      if (!term) return true;
      return [c.name, c.email].some((v) => (v || '').toLowerCase().includes(term)) || (digits.length >= 3 && (c.phone_key || '').includes(digits));
    });
  }, [clients, stats, q, tag, tab]);

  const exportCsv = () =>
    download(
      `clients-${today()}.csv`,
      toCsv(
        shown.map((c) => ({ ...c, tags: (c.tags || []).join('; '), enquiries: stats[c.id]?.enquiries || 0, balance_due: ((stats[c.id]?.due || 0) / 100).toFixed(2) })),
        ['name', 'phone', 'email', 'address', 'gstin', 'tags', 'preferences', 'notes', 'follow_up_on', 'enquiries', 'balance_due', 'created_at']
      )
    );

  return (
    <AdminShell
      title="Clients"
      actions={
        <>
          <button className="adm-btn adm-btn-quiet" type="button" onClick={exportCsv} disabled={!shown.length}>
            Export CSV
          </button>
          <Link href="/admin/clients/new" className="adm-btn">
            Add client
          </Link>
        </>
      }
    >
      <p className="adm-note">Every enquiry is matched to a client by phone number (or email when there is no match), so someone who comes back is recognised automatically.</p>
      {problem && <p className="adm-note adm-warn">{problem}</p>}
      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filter clients">
          {[
            ['all', 'All'],
            ['follow', 'Follow up'],
            ['repeat', 'Came back'],
            ['owes', 'Owes money'],
          ].map(([v, l]) => (
            <button key={v} role="tab" type="button" aria-selected={tab === v} onClick={() => setTab(v)}>
              {l} <span className={v === 'follow' && counts.follow ? 'adm-follow' : undefined}>{counts[v] || 0}</span>
            </button>
          ))}
        </div>
        <div className="adm-inline">
          <label className="sr-only" htmlFor="f-tag">
            Filter by tag
          </label>
          <select id="f-tag" className="adm-input adm-short" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">Any tag</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="search">
            Search clients
          </label>
          <input id="search" className="adm-input adm-search" placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="adm-card adm-flush">
        {clients === null ? (
          <p className="adm-pad">{problem ? 'Not available yet.' : 'Loading'}</p>
        ) : shown.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Tags</th>
                <th>Enquiries</th>
                <th>Last enquiry</th>
                <th>Owes</th>
                <th>Follow up</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const st = stats[c.id] || {};
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clients/${c.id}`}>{c.name}</Link>
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td>{(c.tags || []).length ? c.tags.map((t) => <span key={t} className="adm-tag">{t}</span>) : '-'}</td>
                    <td>{st.enquiries || 0}</td>
                    <td>{st.last ? new Date(st.last).toLocaleDateString('en-IN') : '-'}</td>
                    <td>{st.due ? inr(st.due) : '-'}</td>
                    <td>
                      {c.follow_up_on ? (
                        <span className={c.follow_up_on <= today() ? 'adm-follow' : undefined}>{new Date(c.follow_up_on).toLocaleDateString('en-IN')}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="adm-pad adm-hint">{clients.length ? 'Nothing matches this filter.' : 'No clients yet. They appear here with the first enquiry, or add one yourself.'}</p>
        )}
      </div>
      {toastNode}
    </AdminShell>
  );
}
Clients.admin = true;
export default Clients;
// shortcut: loads up to 2,000 clients and 5,000 enquiries in one go; add server-side paging past that.
