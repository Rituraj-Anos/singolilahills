import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../components/admin/AdminShell.jsx';
import { supabase } from '../../lib/supabase.js';
import { ENQUIRY_STATUSES } from '../../lib/admin/collections.js';
import { download, toCsv } from '../../lib/admin/api.js';
import { telLink, waLink } from '../../lib/format.js';

const COLS = ['created_at', 'name', 'phone', 'email', 'package_interest', 'travel_dates', 'group_size', 'notes', 'status', 'admin_notes'];

function Drawer({ item, onClose, onSaved, toast }) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.admin_notes || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true);
    const { data, error } = await supabase.from('inquiries').update({ status, admin_notes: notes }).eq('id', item.id).select().single();
    setBusy(false);
    if (error) return toast(error.message, true);
    onSaved(data);
    toast('Saved');
  }
  async function remove() {
    if (!window.confirm(`Delete the enquiry from ${item.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('inquiries').delete().eq('id', item.id);
    if (error) return toast(error.message, true);
    onSaved(null, item.id);
    toast('Deleted');
  }
  const wa = waLink(item.phone, `Hi ${item.name}, thank you for your enquiry about ${item.package_interest || 'a trip'}.`);
  const tel = telLink(item.phone);
  return (
    <aside className="adm-drawer" aria-labelledby="drawer-title">
      <div className="adm-row-between">
        <h2 id="drawer-title">{item.name}</h2>
        <button type="button" className="adm-link" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="adm-hint">Received {new Date(item.created_at).toLocaleString('en-IN')}</p>
      <div className="adm-inline">
        {wa && (
          <a className="adm-btn" href={wa} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
        {tel && (
          <a className="adm-btn adm-btn-quiet" href={tel}>
            Call {item.phone}
          </a>
        )}
        {item.email && (
          <a className="adm-btn adm-btn-quiet" href={`mailto:${item.email}`}>
            Email
          </a>
        )}
      </div>
      <dl className="adm-dl">
        <dt>Trip</dt>
        <dd>{item.package_interest || '-'}</dd>
        <dt>When</dt>
        <dd>{item.travel_dates || '-'}</dd>
        <dt>Travellers</dt>
        <dd>{item.group_size || '-'}</dd>
        <dt>Phone</dt>
        <dd>{item.phone}</dd>
        <dt>Email</dt>
        <dd>{item.email || '-'}</dd>
      </dl>
      {item.notes && (
        <>
          <p className="adm-label">Their message</p>
          <blockquote className="adm-quote">{item.notes}</blockquote>
        </>
      )}
      <div className="adm-field">
        <label className="adm-label" htmlFor="status">
          Status
        </label>
        <select id="status" className="adm-input adm-short" value={status} onChange={(e) => setStatus(e.target.value)}>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="adm-field">
        <label className="adm-label" htmlFor="admin_notes">
          Private notes
        </label>
        <p className="adm-hint">Only your team sees these.</p>
        <textarea id="admin_notes" className="adm-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="adm-row-between">
        <button className="adm-btn" type="button" onClick={save} disabled={busy}>
          {busy ? 'Saving' : 'Save'}
        </button>
        <button className="adm-link danger" type="button" onClick={remove}>
          Delete enquiry
        </button>
      </div>
    </aside>
  );
}

function Enquiries() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('new');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => (error ? toast(error.message, true) : setRows(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    if (typeof router.query.open === 'string') {
      setOpenId(router.query.open);
      setTab('all');
    }
  }, [router.query.open]);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0 };
    for (const r of rows || []) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows || []).filter(
      (r) => (tab === 'all' || r.status === tab) && (!term || [r.name, r.phone, r.email, r.package_interest].some((v) => (v || '').toLowerCase().includes(term)))
    );
  }, [rows, tab, q]);
  const open = rows?.find((r) => r.id === openId);
  const onSaved = useCallback((row, deletedId) => {
    setRows((rs) => (deletedId ? rs.filter((r) => r.id !== deletedId) : rs.map((r) => (r.id === row.id ? row : r))));
    if (deletedId) setOpenId(null);
  }, []);

  return (
    <AdminShell
      title="Enquiries"
      actions={
        <button className="adm-btn adm-btn-quiet" type="button" onClick={() => download(`enquiries-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(shown, COLS))} disabled={!shown.length}>
          Export CSV
        </button>
      }
    >
      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filter by status">
          {[{ value: 'all', label: 'All' }, ...ENQUIRY_STATUSES].map((s) => (
            <button key={s.value} role="tab" type="button" aria-selected={tab === s.value} onClick={() => setTab(s.value)}>
              {s.label} <span>{counts[s.value] || 0}</span>
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="search">
          Search enquiries
        </label>
        <input id="search" className="adm-input adm-search" placeholder="Search name, phone or trip" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={`adm-split${open ? ' has-drawer' : ''}`}>
        <div className="adm-card adm-flush">
          {rows === null ? (
            <p className="adm-pad">Loading</p>
          ) : shown.length ? (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Trip</th>
                  <th>When</th>
                  <th>Group</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={r.id === openId ? 'is-open' : ''}>
                    <td>
                      <button type="button" className="adm-rowlink" onClick={() => setOpenId(r.id)}>
                        {r.name}
                      </button>
                    </td>
                    <td>{r.phone}</td>
                    <td>{r.package_interest || '-'}</td>
                    <td>{r.travel_dates || '-'}</td>
                    <td>{r.group_size || '-'}</td>
                    <td>
                      <span className={`adm-pill s-${r.status}`}>{r.status}</span>
                    </td>
                    <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="adm-pad adm-hint">{rows.length ? 'Nothing matches this filter.' : 'No enquiries yet.'}</p>
          )}
        </div>
        {/* keyed so switching enquiries starts the form fresh */}
        {open && <Drawer key={open.id} item={open} onClose={() => setOpenId(null)} onSaved={onSaved} toast={toast} />}
      </div>
      {toastNode}
    </AdminShell>
  );
}
Enquiries.admin = true;
export default Enquiries;
// shortcut: loads the latest 1000 enquiries in one request; add server-side paging past a few thousand.
