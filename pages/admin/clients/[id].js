import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../../components/admin/AdminShell.jsx';
import { supabase } from '../../../lib/supabase.js';
import { dbMessage } from '../../../lib/admin/api.js';
import { telLink, waLink } from '../../../lib/format.js';
import { CLIENT_TAGS, INVOICE_STATUSES, PAYMENT_METHODS, balance, inr, toPaise } from '../../../lib/invoice.mjs';

const EMPTY = { name: '', phone: '', email: '', address: '', gstin: '', tags: [], preferences: '', notes: '', follow_up_on: '' };
const FIELDS = ['name', 'phone', 'email', 'address', 'gstin', 'tags', 'preferences', 'notes', 'follow_up_on'];
const labelOf = (list, v) => list.find((x) => x.value === v)?.label || v;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Merge({ client, onMerged, toast }) {
  const [all, setAll] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, phone, email, phone_key')
      .neq('id', client.id)
      .order('name')
      .limit(2000)
      .then(({ data }) => setAll(data || []));
  }, [client.id]);
  const term = q.trim().toLowerCase();
  const digits = term.replace(/\D/g, '');
  // likely duplicates first: same name or same email
  const suggested = (all || []).filter(
    (c) => c.name.trim().toLowerCase() === client.name.trim().toLowerCase() || (client.email && c.email && c.email.toLowerCase() === client.email.toLowerCase())
  );
  const list = term
    ? (all || []).filter((c) => c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term) || (digits.length >= 3 && (c.phone_key || '').includes(digits))).slice(0, 8)
    : suggested;
  async function merge(other) {
    if (!window.confirm(`Merge "${other.name}" into "${client.name}"? Their enquiries and invoices move here, tags and notes are combined, and "${other.name}" is removed. This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc('merge_clients', { p_keep: client.id, p_dup: other.id });
    setBusy(false);
    if (error) return toast(dbMessage(error), true);
    toast(`Merged ${other.name} into this client.`);
    onMerged();
  }
  return (
    <div className="adm-card">
      <h2 className="adm-h2">Merge a duplicate</h2>
      <p className="adm-hint">If the same person came in twice (a new phone number, a typo), merge the other record into this one.</p>
      <input className="adm-input" placeholder="Search by name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find the duplicate client" />
      {all === null ? (
        <p className="adm-hint">Loading</p>
      ) : list.length ? (
        <ul className="adm-list">
          {list.map((c) => (
            <li key={c.id}>
              <span>
                <strong>{c.name}</strong> {c.phone || c.email || ''}
              </span>
              <button type="button" className="adm-btn adm-btn-quiet" disabled={busy} onClick={() => merge(c)}>
                Merge into this client
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-hint">{term ? 'No other client matches.' : 'No likely duplicates found.'}</p>
      )}
    </div>
  );
}

function ClientPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === 'new';
  const [loaded, setValues] = useState(null);
  const values = isNew ? loaded || EMPTY : loaded;
  const [saved, setSaved] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [newTag, setNewTag] = useState('');
  const [reload, setReload] = useState(0);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase || !router.isReady || isNew) return;
    (async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
      if (error) return setProblem(dbMessage(error));
      if (!data) return setProblem('This client no longer exists. It may have been merged into another one.');
      setValues({ ...EMPTY, ...Object.fromEntries(FIELDS.map((k) => [k, data[k] ?? EMPTY[k]])) });
      setSaved(data);
      const [e, i] = await Promise.all([
        supabase.from('inquiries').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ]);
      setEnquiries(e.data || []);
      setInvoices(i.data || []);
      const ids = (i.data || []).map((x) => x.id);
      if (ids.length) {
        const { data: p } = await supabase.from('invoice_payments').select('*').in('invoice_id', ids).order('paid_on', { ascending: false });
        setPayments(p || []);
      } else setPayments([]);
    })();
  }, [router.isReady, id, isNew, reload]);

  const set = (k, v) => setValues((s) => ({ ...(s || EMPTY), [k]: v }));
  const owed = invoices.filter((x) => ['issued', 'partly_paid'].includes(x.status)).reduce((s, x) => s + balance(x), 0);
  const paid = payments.reduce((s, p) => s + toPaise(p.amount), 0);

  // one list of everything that happened with this person, newest first
  const timeline = useMemo(() => {
    const inv = Object.fromEntries(invoices.map((x) => [x.id, x]));
    return [
      ...enquiries.map((e) => ({ at: e.created_at, kind: 'Enquiry', text: e.package_interest || 'General enquiry', meta: [e.travel_dates, e.group_size, e.status].filter(Boolean).join(' · '), href: `/admin/enquiries?open=${e.id}` })),
      ...invoices.map((x) => ({
        at: x.issued_at || x.created_at,
        kind: x.status === 'draft' ? 'Draft invoice' : 'Invoice',
        text: `${x.number || 'Draft'}, ${inr(toPaise(x.total))}`,
        meta: labelOf(INVOICE_STATUSES, x.status),
        href: `/admin/invoices/${x.id}`,
      })),
      ...payments.map((p) => ({
        at: `${p.paid_on}T12:00:00`,
        kind: 'Payment',
        text: `${inr(toPaise(p.amount))} by ${labelOf(PAYMENT_METHODS, p.method)}`,
        meta: [inv[p.invoice_id]?.number, p.reference].filter(Boolean).join(' · '),
        href: `/admin/invoices/${p.invoice_id}`,
      })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [enquiries, invoices, payments]);

  async function save(e) {
    e.preventDefault();
    if (!values.name.trim()) return toast('Please add a name.', true);
    const row = Object.fromEntries(FIELDS.map((k) => [k, typeof values[k] === 'string' ? values[k].trim() || null : values[k]]));
    row.name = values.name.trim();
    row.tags = values.tags || [];
    setBusy(true);
    const q = isNew ? supabase.from('clients').insert(row) : supabase.from('clients').update(row).eq('id', id);
    const { data, error } = await q.select().single();
    setBusy(false);
    if (error) {
      if (error.code === '23505') return toast('Another client already has this phone number. Find them in Clients and merge the two instead.', true);
      return toast(dbMessage(error), true);
    }
    toast('Saved');
    setSaved(data);
    if (isNew) router.replace(`/admin/clients/${data.id}`);
  }

  async function remove() {
    if (invoices.length) return toast('This client has invoices, so they stay on record. Merge them into another client if they are a duplicate.', true);
    if (!window.confirm(`Delete ${saved.name}? Their enquiries stay in the inbox, no longer linked to a client.`)) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return toast(dbMessage(error), true);
    router.replace('/admin/clients');
  }

  const toggleTag = (t) => set('tags', values.tags.includes(t) ? values.tags.filter((x) => x !== t) : [...values.tags, t]);
  const tagChoices = [...new Set([...CLIENT_TAGS, ...(values?.tags || [])])];
  const wa = saved && waLink(saved.phone, `Hi ${saved.name.split(' ')[0]}, `);
  const tel = saved && telLink(saved.phone);

  return (
    <AdminShell
      title={isNew ? 'New client' : saved?.name || 'Client'}
      actions={
        <>
          <Link href="/admin/clients" className="adm-link">
            Back to clients
          </Link>
          {!isNew && saved && (
            <Link href={`/admin/invoices/new?client=${saved.id}`} className="adm-btn">
              New invoice
            </Link>
          )}
        </>
      }
    >
      {problem && <p className="adm-note adm-warn">{problem}</p>}
      {values && (
        <div className="adm-cols">
          <form onSubmit={save} noValidate className="adm-card adm-form-card">
            {!isNew && (
              <div className="adm-inline">
                {wa && (
                  <a className="adm-btn" href={wa} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                )}
                {tel && (
                  <a className="adm-btn adm-btn-quiet" href={tel}>
                    Call {saved.phone}
                  </a>
                )}
                {saved?.email && (
                  <a className="adm-btn adm-btn-quiet" href={`mailto:${saved.email}`}>
                    Email
                  </a>
                )}
              </div>
            )}
            <div className="adm-grid2">
              <div className="adm-field">
                <label className="adm-label" htmlFor="c-name">
                  Name<span aria-hidden="true"> *</span>
                </label>
                <input id="c-name" className="adm-input" value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="c-phone">
                  Phone
                </label>
                <input id="c-phone" className="adm-input" value={values.phone || ''} onChange={(e) => set('phone', e.target.value)} maxLength={30} />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="c-email">
                  Email
                </label>
                <input id="c-email" type="email" className="adm-input" value={values.email || ''} onChange={(e) => set('email', e.target.value)} maxLength={120} />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="c-follow">
                  Follow up on
                </label>
                <input id="c-follow" type="date" className="adm-input" value={values.follow_up_on || ''} onChange={(e) => set('follow_up_on', e.target.value)} />
              </div>
              <div className="adm-field adm-span2">
                <label className="adm-label" htmlFor="c-address">
                  Billing address
                </label>
                <textarea id="c-address" className="adm-input" value={values.address || ''} onChange={(e) => set('address', e.target.value)} maxLength={400} />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="c-gstin">
                  GSTIN
                </label>
                <p className="adm-hint">Only for business clients who want GST credit.</p>
                <input id="c-gstin" className="adm-input" value={values.gstin || ''} onChange={(e) => set('gstin', e.target.value.toUpperCase())} maxLength={20} />
              </div>
            </div>
            <div className="adm-field">
              <p className="adm-label">Tags</p>
              <div className="adm-checks">
                {tagChoices.map((t) => (
                  <label key={t} className="adm-check-pill">
                    <input type="checkbox" checked={values.tags.includes(t)} onChange={() => toggleTag(t)} />
                    {t}
                  </label>
                ))}
              </div>
              <div className="adm-inline">
                <input className="adm-input adm-small" placeholder="Another tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} maxLength={30} aria-label="Add your own tag" />
                <button
                  type="button"
                  className="adm-btn adm-btn-quiet"
                  onClick={() => {
                    const t = newTag.trim();
                    if (t && !values.tags.includes(t)) set('tags', [...values.tags, t]);
                    setNewTag('');
                  }}
                >
                  Add tag
                </button>
              </div>
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="c-pref">
                Preferences
              </label>
              <p className="adm-hint">Food, fitness, mobility, room type. Useful on the next trip.</p>
              <textarea id="c-pref" className="adm-input" value={values.preferences || ''} onChange={(e) => set('preferences', e.target.value)} maxLength={1000} />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="c-notes">
                Private notes
              </label>
              <textarea id="c-notes" className="adm-input" value={values.notes || ''} onChange={(e) => set('notes', e.target.value)} maxLength={4000} />
            </div>
            <div className="adm-row-between">
              <button className="adm-btn" type="submit" disabled={busy}>
                {busy ? 'Saving' : 'Save'}
              </button>
              {!isNew && (
                <button type="button" className="adm-link danger" onClick={remove}>
                  Delete client
                </button>
              )}
            </div>
          </form>

          {!isNew && saved && (
            <div className="adm-stack">
              <div className="adm-tiles adm-tiles-3">
                <div className="adm-card adm-tile">
                  <strong>{enquiries.length}</strong>
                  <span>Enquiries</span>
                </div>
                <div className="adm-card adm-tile">
                  <strong>{inr(paid)}</strong>
                  <span>Paid so far</span>
                </div>
                <div className="adm-card adm-tile">
                  <strong>{owed ? inr(owed) : '-'}</strong>
                  <span>Owes</span>
                </div>
              </div>
              <div className="adm-card">
                <h2 className="adm-h2">Timeline</h2>
                {timeline.length ? (
                  <ol className="adm-timeline">
                    {timeline.map((t, i) => (
                      <li key={i}>
                        <span className="adm-time">{day(t.at)}</span>
                        <span className="adm-kind">{t.kind}</span>
                        <Link href={t.href}>{t.text}</Link>
                        {t.meta && <span className="adm-hint">{t.meta}</span>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="adm-hint">Nothing yet.</p>
                )}
              </div>
              <Merge client={saved} onMerged={() => setReload((n) => n + 1)} toast={toast} />
            </div>
          )}
        </div>
      )}
      {toastNode}
    </AdminShell>
  );
}
ClientPage.admin = true;
export default ClientPage;
