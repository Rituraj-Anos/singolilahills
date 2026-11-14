import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../components/admin/AdminShell.jsx';
import { supabase } from '../../lib/supabase.js';
import { ENQUIRY_STATUSES } from '../../lib/admin/collections.js';
import { download, toCsv } from '../../lib/admin/api.js';
import { telLink, waLink } from '../../lib/format.js';
import { INTERESTS, LENGTHS, TRAVELLERS, monthLabel } from '../../lib/planner.mjs';

const COLS = [
  'created_at', 'name', 'phone', 'email', 'package_interest', 'destinations', 'travel_dates', 'trip_length', 'group_size',
  'travelling_with', 'budget_label', 'interests', 'matched_trips', 'notes', 'status', 'follow_up_on', 'admin_notes',
];

const labelOf = (set, id) => set.find((x) => x.id === id)?.label || id;
const today = () => new Date().toISOString().slice(0, 10);
const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const monthKey = (r) => (r.travel_month ? r.travel_month.slice(0, 7) : '');
const isOverdue = (r) => r.follow_up_on && r.follow_up_on <= today() && ['new', 'contacted'].includes(r.status);

// A readable summary of the planner answers, for the drawer and the CSV
function planRows(r) {
  return [
    ['Where', r.destinations?.join(', ')],
    ['When', [r.travel_dates, r.trip_length && labelOf(LENGTHS, r.trip_length)].filter(Boolean).join(', ')],
    ['Travelling as', r.travelling_with && labelOf(TRAVELLERS, r.travelling_with)],
    ['Group', r.group_size],
    ['Budget per person', r.budget_label],
    ['Interests', r.interests?.map((i) => labelOf(INTERESTS, i)).join(', ')],
    ['Trips suggested', r.matched_trips?.join(', ')],
  ].filter(([, v]) => v);
}

function Drawer({ item, repeats, onClose, onSaved, toast }) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.admin_notes || '');
  const [followUp, setFollowUp] = useState(item.follow_up_on || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    setBusy(true);
    const { data, error } = await supabase
      .from('inquiries')
      .update({ status, admin_notes: notes, follow_up_on: followUp || null })
      .eq('id', item.id)
      .select()
      .single();
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
  const plan = planRows(item);
  return (
    <aside className="adm-drawer" aria-labelledby="drawer-title">
      <div className="adm-row-between">
        <h2 id="drawer-title">{item.name}</h2>
        <button type="button" className="adm-link" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="adm-hint">Received {new Date(item.created_at).toLocaleString('en-IN')}</p>
      {repeats.length > 0 && (
        <p className="adm-note" role="note">
          This phone number has enquired {repeats.length} other time{repeats.length === 1 ? '' : 's'} in the last 30 days (
          {repeats.map((r) => new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })).join(', ')}). It may be the same traveller.
        </p>
      )}
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
        <dt>Phone</dt>
        <dd>{item.phone}</dd>
        <dt>Email</dt>
        <dd>{item.email || '-'}</dd>
        {plan.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
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
        <label className="adm-label" htmlFor="follow_up">
          Follow up on
        </label>
        <p className="adm-hint">It shows under the Follow up tab on that day.</p>
        <input id="follow_up" type="date" className="adm-input adm-short" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
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
  const [month, setMonth] = useState('');
  const [budget, setBudget] = useState('');
  const [openId, setOpenId] = useState(null);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => (error ? toast(error.message, true) : setRows(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (typeof router.query.open === 'string') {
      setOpenId(router.query.open);
      setTab('all');
    }
  }, [router.query.open]);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0, follow: 0 };
    for (const r of rows || []) {
      c[r.status] = (c[r.status] || 0) + 1;
      if (isOverdue(r)) c.follow += 1;
    }
    return c;
  }, [rows]);
  const months = useMemo(() => [...new Set((rows || []).map(monthKey).filter(Boolean))].sort(), [rows]);
  const budgets = useMemo(() => [...new Set((rows || []).map((r) => r.budget_label).filter(Boolean))], [rows]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows || []).filter(
      (r) =>
        (tab === 'all' || (tab === 'follow' ? isOverdue(r) : r.status === tab)) &&
        (!month || monthKey(r) === month) &&
        (!budget || r.budget_label === budget) &&
        (!term || [r.name, r.phone, r.email, r.package_interest, ...(r.destinations || [])].some((v) => (v || '').toLowerCase().includes(term)))
    );
  }, [rows, tab, q, month, budget]);
  const open = rows?.find((r) => r.id === openId);
  const repeats = useMemo(() => {
    if (!open) return [];
    const cutoff = new Date(open.created_at).getTime() - 30 * 86400000;
    return (rows || []).filter((r) => r.id !== open.id && digits(r.phone) === digits(open.phone) && new Date(r.created_at).getTime() >= cutoff);
  }, [rows, open]);
  const onSaved = useCallback((row, deletedId) => {
    setRows((rs) => (deletedId ? rs.filter((r) => r.id !== deletedId) : rs.map((r) => (r.id === row.id ? row : r))));
    if (deletedId) setOpenId((cur) => (cur === deletedId ? null : cur));
  }, []);
  async function removeRow(r) {
    if (!window.confirm(`Delete the enquiry from ${r.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('inquiries').delete().eq('id', r.id);
    if (error) return toast(error.message, true);
    onSaved(null, r.id);
    toast('Deleted');
  }

  const exportCsv = () => {
    const flat = shown.map((r) => ({
      ...r,
      destinations: (r.destinations || []).join('; '),
      interests: (r.interests || []).map((i) => labelOf(INTERESTS, i)).join('; '),
      matched_trips: (r.matched_trips || []).join('; '),
      trip_length: r.trip_length ? labelOf(LENGTHS, r.trip_length) : '',
      travelling_with: r.travelling_with ? labelOf(TRAVELLERS, r.travelling_with) : '',
    }));
    download(`enquiries-${today()}.csv`, toCsv(flat, COLS));
  };

  return (
    <AdminShell
      title="Enquiries"
      actions={
        <button className="adm-btn adm-btn-quiet" type="button" onClick={exportCsv} disabled={!shown.length}>
          Export CSV
        </button>
      }
    >
      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filter by status">
          {[{ value: 'all', label: 'All' }, ...ENQUIRY_STATUSES, { value: 'follow', label: 'Follow up' }].map((s) => (
            <button key={s.value} role="tab" type="button" aria-selected={tab === s.value} onClick={() => setTab(s.value)}>
              {s.label} <span className={s.value === 'follow' && counts.follow ? 'adm-follow' : undefined}>{counts[s.value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="adm-inline">
          <label className="sr-only" htmlFor="f-month">
            Filter by travel month
          </label>
          <select id="f-month" className="adm-input adm-short" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Any month</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-budget">
            Filter by budget
          </label>
          <select id="f-budget" className="adm-input adm-short" value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">Any budget</option>
            {budgets.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="search">
            Search enquiries
          </label>
          <input id="search" className="adm-input adm-search" placeholder="Search name, phone or trip" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
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
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
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
                    <td>{r.budget_label || '-'}</td>
                    <td>
                      <span className={`adm-pill s-${r.status}`}>{r.status}</span>
                      {isOverdue(r) && <span className="adm-follow"> follow up</span>}
                    </td>
                    <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="adm-row-actions">
                      <button type="button" className="adm-link danger" onClick={() => removeRow(r)} aria-label={`Delete the enquiry from ${r.name}`}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="adm-pad adm-hint">{rows.length ? 'Nothing matches this filter.' : 'No enquiries yet.'}</p>
          )}
        </div>
        {/* keyed so switching enquiries starts the form fresh */}
        {open && <Drawer key={open.id} item={open} repeats={repeats} onClose={() => setOpenId(null)} onSaved={onSaved} toast={toast} />}
      </div>
      {toastNode}
    </AdminShell>
  );
}
Enquiries.admin = true;
export default Enquiries;
// shortcut: loads the latest 1000 enquiries in one request; add server-side paging past a few thousand.
