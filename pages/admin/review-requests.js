import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../components/admin/AdminShell.jsx';
import { supabase } from '../../lib/supabase.js';
import { refreshPages } from '../../lib/admin/api.js';
import { telLink, waLink } from '../../lib/format.js';

const TABS = [
  { value: 'new', label: 'To review' },
  { value: 'approved', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

function Contact({ value }) {
  if (!value) return <span className="adm-hint">No contact given</span>;
  if (value.includes('@')) return <a href={`mailto:${value}`}>{value}</a>;
  const wa = waLink(value);
  const tel = telLink(value);
  return (
    <span className="adm-inline">
      <span>{value}</span>
      {tel && <a href={tel}>Call</a>}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      )}
    </span>
  );
}

function ReviewRequests() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('new');
  const [busy, setBusy] = useState(null);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('review_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => (error ? toast(error.message, true) : setRows(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = {};
    for (const r of rows || []) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);
  const shown = (rows || []).filter((r) => r.status === tab);
  const patch = (id, status) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));

  async function approve(r) {
    setBusy(r.id);
    const { error } = await supabase.rpc('approve_review_submission', { sub_id: r.id });
    setBusy(null);
    if (error) return toast(error.message, true);
    patch(r.id, 'approved');
    await refreshPages(['/']);
    toast('Published on the home page.');
  }
  async function reject(r) {
    setBusy(r.id);
    const { error } = await supabase.from('review_submissions').update({ status: 'rejected' }).eq('id', r.id);
    setBusy(null);
    if (error) return toast(error.message, true);
    patch(r.id, 'rejected');
  }
  async function remove(r) {
    if (!window.confirm(`Delete the review from ${r.author}? This cannot be undone.`)) return;
    const { error } = await supabase.from('review_submissions').delete().eq('id', r.id);
    if (error) return toast(error.message, true);
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  }

  return (
    <AdminShell title="Review requests">
      <p className="adm-note">
        Reviews written by travellers on the website wait here. Publish the real ones, reject the rest. To fix a typo after publishing, edit it under{' '}
        <Link href="/admin/reviews">Reviews</Link>.
      </p>
      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filter by status">
          {TABS.map((t) => (
            <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => setTab(t.value)}>
              {t.label} <span>{counts[t.value] || 0}</span>
            </button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <p>Loading</p>
      ) : shown.length ? (
        <div className="adm-stack-list">
          {shown.map((r) => (
            <article key={r.id} className="adm-card">
              <div className="adm-row-between">
                <h2>
                  {r.author}
                  {r.location ? `, ${r.location}` : ''}
                </h2>
                <span className="adm-pill s-new">{r.rating} of 5 stars</span>
              </div>
              <p className="adm-hint">
                {r.trip || 'No trip chosen'} · {new Date(r.created_at).toLocaleDateString('en-IN')}
              </p>
              <blockquote className="adm-quote">{r.comment}</blockquote>
              <p>
                <span className="adm-label">Private contact: </span>
                <Contact value={r.contact} />
              </p>
              <div className="adm-actions">
                {r.status === 'new' && (
                  <>
                    <button type="button" className="adm-btn" disabled={busy === r.id} onClick={() => approve(r)}>
                      Publish
                    </button>
                    <button type="button" className="adm-btn adm-btn-quiet" disabled={busy === r.id} onClick={() => reject(r)}>
                      Reject
                    </button>
                  </>
                )}
                <button type="button" className="adm-link danger" onClick={() => remove(r)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="adm-card adm-hint">Nothing here.</p>
      )}
      {toastNode}
    </AdminShell>
  );
}
ReviewRequests.admin = true;
export default ReviewRequests;
