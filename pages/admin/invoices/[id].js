import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../../components/admin/AdminShell.jsx';
import InvoiceDoc from '../../../components/InvoiceDoc.jsx';
import { supabase } from '../../../lib/supabase.js';
import { dbMessage } from '../../../lib/admin/api.js';
import { waLink } from '../../../lib/format.js';
import { INVOICE_STATUSES, PAYMENT_METHODS, balance, cleanItems, inr, invoiceTotals, lineAmounts, storedTotals, toPaise } from '../../../lib/invoice.mjs';

const today = () => new Date().toISOString().slice(0, 10);
const labelOf = (list, v) => list.find((x) => x.value === v)?.label || v;
const day = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN') : '');
const blankLine = (taxRate) => ({ description: '', qty: 1, unit_price: '', tax_rate: taxRate ?? 0, discount: '' });

// Search the client list, or add a new client on the spot.
function ClientPicker({ value, onChange, toast }) {
  const [all, setAll] = useState(null);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', email: '' });
  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, phone, email, phone_key, address, gstin')
      .order('updated_at', { ascending: false })
      .limit(2000)
      .then(({ data }) => setAll(data || []));
  }, []);
  const chosen = all?.find((c) => c.id === value);
  const term = q.trim().toLowerCase();
  const digits = term.replace(/\D/g, '');
  const hits = term ? (all || []).filter((c) => c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term) || (digits.length >= 3 && (c.phone_key || '').includes(digits))).slice(0, 8) : [];

  async function add() {
    if (!draft.name.trim()) return toast('Add a name for the new client.', true);
    const row = { name: draft.name.trim(), phone: draft.phone.trim() || null, email: draft.email.trim() || null };
    const { data, error } = await supabase.from('clients').insert(row).select().single();
    if (error) return toast(error.code === '23505' ? 'A client with this phone number already exists. Search for them above.' : dbMessage(error), true);
    setAll((a) => [data, ...(a || [])]);
    onChange(data.id, data);
    setAdding(false);
    setDraft({ name: '', phone: '', email: '' });
  }

  if (chosen)
    return (
      <div className="adm-chosen">
        <span>
          <strong>{chosen.name}</strong> {[chosen.phone, chosen.email].filter(Boolean).join(' · ')}
          {!chosen.address && <span className="adm-hint"> No billing address yet: add it on the client page if the invoice needs one.</span>}
        </span>
        <span className="adm-inline">
          <Link href={`/admin/clients/${chosen.id}`} className="adm-link" target="_blank">
            Open client
          </Link>
          <button type="button" className="adm-link" onClick={() => onChange(null)}>
            Change
          </button>
        </span>
      </div>
    );
  return (
    <div className="adm-picker">
      <input className="adm-input" placeholder="Search a client by name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find the client" />
      {hits.length > 0 && (
        <ul className="adm-pin-results">
          {hits.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onChange(c.id, c)}>
                <strong>{c.name}</strong> {c.phone || c.email || ''}
              </button>
            </li>
          ))}
        </ul>
      )}
      {term && all && !hits.length && <p className="adm-hint">No client matches.</p>}
      {adding ? (
        <div className="adm-grid3">
          <input className="adm-input" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="New client name" />
          <input className="adm-input" placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} aria-label="New client phone" />
          <input className="adm-input" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} aria-label="New client email" />
          <span className="adm-inline">
            <button type="button" className="adm-btn" onClick={add}>
              Add client
            </button>
            <button type="button" className="adm-link" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </span>
        </div>
      ) : (
        <button type="button" className="adm-link" onClick={() => setAdding(true)}>
          Or add a new client
        </button>
      )}
    </div>
  );
}

function Lines({ items, mode, onChange, catalog, taxRate }) {
  const set = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const move = (i, d) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="adm-lines">
      <table className="adm-table adm-lines-table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Price (₹)</th>
            <th className="num">Tax %</th>
            <th className="num">Discount (₹)</th>
            <th className="num">Amount</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const a = lineAmounts(it, mode);
            return (
              <tr key={i}>
                <td>
                  <input className="adm-input" value={it.description} onChange={(e) => set(i, 'description', e.target.value)} maxLength={300} aria-label={`Line ${i + 1} description`} placeholder="What it is for" />
                </td>
                <td className="num">
                  <input className="adm-input adm-num" type="number" min="0" step="0.5" value={it.qty} onChange={(e) => set(i, 'qty', e.target.value)} aria-label={`Line ${i + 1} quantity`} />
                </td>
                <td className="num">
                  <input className="adm-input adm-num" type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => set(i, 'unit_price', e.target.value)} aria-label={`Line ${i + 1} price`} />
                </td>
                <td className="num">
                  <input className="adm-input adm-num adm-num-s" type="number" min="0" max="100" step="0.01" value={it.tax_rate} onChange={(e) => set(i, 'tax_rate', e.target.value)} aria-label={`Line ${i + 1} tax percent`} />
                </td>
                <td className="num">
                  <input className="adm-input adm-num" type="number" min="0" step="0.01" value={it.discount} onChange={(e) => set(i, 'discount', e.target.value)} aria-label={`Line ${i + 1} discount`} />
                </td>
                <td className="num">{inr(a.total)}</td>
                <td className="adm-row-actions">
                  <button type="button" className="adm-link" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move line ${i + 1} up`}>
                    Up
                  </button>
                  <button type="button" className="adm-link danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove line ${i + 1}`}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="adm-inline">
        <button type="button" className="adm-btn adm-btn-quiet" onClick={() => onChange([...items, blankLine(taxRate)])}>
          Add line
        </button>
        {catalog.length > 0 && (
          <>
            <label className="sr-only" htmlFor="cat">
              Add a saved item
            </label>
            <select
              id="cat"
              className="adm-input adm-short"
              value=""
              onChange={(e) => {
                const c = catalog.find((x) => x.id === e.target.value);
                if (c) onChange([...items.filter((x) => x.description || x.unit_price), { description: c.description ? `${c.name}, ${c.description}` : c.name, qty: 1, unit_price: c.unit_price, tax_rate: c.tax_rate, discount: '' }]);
              }}
            >
              <option value="">Add a saved item</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({inr(toPaise(c.unit_price))})
                </option>
              ))}
            </select>
          </>
        )}
        <Link href="/admin/invoice_items" className="adm-link" target="_blank">
          Manage saved items
        </Link>
      </div>
    </div>
  );
}

function Payments({ inv, payments, onChange, toast }) {
  const due = balance(inv);
  const [form, setForm] = useState({ amount: '', paid_on: today(), method: 'upi', reference: '', note: '' });
  const [busy, setBusy] = useState(false);
  const open = ['issued', 'partly_paid'].includes(inv.status);
  const link = (p) => `/invoice/${inv.token}?receipt=${p.id}`;

  async function record(e) {
    e.preventDefault();
    const amount = Math.round(Number(form.amount) * 100) / 100;
    if (!(amount > 0)) return toast('Enter the amount received.', true);
    if (toPaise(amount) > due) return toast(`That is more than the balance of ${inr(due)}.`, true);
    setBusy(true);
    const { error } = await supabase.from('invoice_payments').insert({ invoice_id: inv.id, amount, paid_on: form.paid_on || today(), method: form.method, reference: form.reference.trim() || null, note: form.note.trim() || null });
    setBusy(false);
    if (error) return toast(dbMessage(error), true);
    setForm({ amount: '', paid_on: today(), method: 'upi', reference: '', note: '' });
    toast('Payment recorded');
    onChange();
  }
  async function remove(p) {
    if (!window.confirm(`Delete the ${inr(toPaise(p.amount))} payment of ${day(p.paid_on)}? Only do this to correct a mistake; the balance goes back up.`)) return;
    const { error } = await supabase.from('invoice_payments').delete().eq('id', p.id);
    if (error) return toast(dbMessage(error), true);
    onChange();
  }

  return (
    <div className="adm-card">
      <h2 className="adm-h2">Payments</h2>
      {payments.length ? (
        <ul className="adm-list">
          {payments.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{inr(toPaise(p.amount))}</strong> {day(p.paid_on)}, {labelOf(PAYMENT_METHODS, p.method)}
                {p.reference && <span className="adm-hint"> · {p.reference}</span>}
              </span>
              <span className="adm-inline">
                <a className="adm-link" href={link(p)} target="_blank" rel="noopener noreferrer">
                  Receipt
                </a>
                <button type="button" className="adm-link danger" onClick={() => remove(p)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-hint">No payments yet.</p>
      )}
      {open && (
        <form onSubmit={record} className="adm-pay-form" noValidate>
          <p className="adm-label">Record a payment</p>
          <div className="adm-grid3">
            <input className="adm-input" type="number" min="0" step="0.01" placeholder={`Amount, up to ${inr(due, { symbol: false })}`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-label="Amount received" />
            <input className="adm-input" type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} aria-label="Date received" />
            <select className="adm-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} aria-label="Paid by">
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input className="adm-input" placeholder="UPI or bank reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} maxLength={120} aria-label="Reference" />
            <input className="adm-input" placeholder="Note (private)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} aria-label="Note" />
            <span className="adm-inline">
              <button type="button" className="adm-link" onClick={() => setForm({ ...form, amount: (due / 100).toFixed(2) })}>
                Full balance
              </button>
              <button className="adm-btn" type="submit" disabled={busy}>
                {busy ? 'Saving' : 'Record'}
              </button>
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

function InvoicePage() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === 'new';
  const [inv, setInv] = useState(null);
  const [client, setClient] = useState(null);
  const [business, setBusiness] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [payments, setPayments] = useState([]);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState('');
  const [dirty, setDirty] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [reload, setReload] = useState(0);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase || !router.isReady) return;
    (async () => {
      const [b, c] = await Promise.all([
        supabase.from('business_profile').select('data').eq('id', 1).maybeSingle(),
        supabase.from('invoice_catalog').select('*').eq('published', true).order('sort_order'),
      ]);
      if (b.error) return setProblem(dbMessage(b.error));
      const biz = b.data?.data || {};
      setBusiness(biz);
      setCatalog(c.data || []);
      const rate = biz.default_tax_rate === '' || biz.default_tax_rate == null ? 0 : Number(biz.default_tax_rate);

      if (!isNew) {
        const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
        if (error || !data) return setProblem(error ? dbMessage(error) : 'This invoice does not exist.');
        setInv(data);
        if (data.client_id) {
          const { data: cl } = await supabase.from('clients').select('*').eq('id', data.client_id).maybeSingle();
          setClient(cl);
        }
        const { data: p } = await supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('paid_on').order('created_at');
        setPayments(p || []);
        return;
      }

      // a new draft, optionally started from a client or an enquiry
      const start = { status: 'draft', client_id: null, inquiry_id: null, issue_date: '', due_date: '', tax_mode: biz.tax_mode || 'exclusive', items: [blankLine(rate)], notes: '', terms: '', payment_details: '' };
      const qc = typeof router.query.client === 'string' ? router.query.client : '';
      const qi = typeof router.query.inquiry === 'string' ? router.query.inquiry : '';
      const qf = typeof router.query.from === 'string' ? router.query.from : '';
      if (qf) {
        const { data: src } = await supabase.from('invoices').select('*').eq('id', qf).maybeSingle();
        if (src) Object.assign(start, { client_id: src.client_id, inquiry_id: src.inquiry_id, tax_mode: src.tax_mode, items: src.items, notes: src.notes || '' });
      }
      if (qi) {
        const { data: e } = await supabase.from('inquiries').select('*').eq('id', qi).maybeSingle();
        if (e) {
          start.client_id = e.client_id;
          start.inquiry_id = e.id;
          const sel = e.selection;
          if (sel?.lines?.length) {
            // the "Make it yours" estimate, line by line, as the traveller saw it
            start.items = sel.lines.map((l) => ({ description: l.label, qty: 1, unit_price: l.amount, tax_rate: rate, discount: '' }));
          } else if (e.package_interest) {
            let price = '';
            if (e.trip_slug) {
              const { data: t } = await supabase.from('packages').select('price').eq('slug', e.trip_slug).maybeSingle();
              price = t?.price ?? '';
            }
            start.items = [{ description: `${e.package_interest}${e.travel_dates ? `, ${e.travel_dates}` : ''}, per person`, qty: e.adults || 1, unit_price: price, tax_rate: rate, discount: '' }];
          }
        }
      }
      if (qc) start.client_id = qc;
      if (start.client_id) {
        const { data: cl } = await supabase.from('clients').select('*').eq('id', start.client_id).maybeSingle();
        setClient(cl);
      }
      setInv(start);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id, reload]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const draft = inv?.status === 'draft';
  const totals = useMemo(() => (inv ? invoiceTotals(cleanItems(inv.items), inv.tax_mode) : null), [inv]);
  const set = (k, v) => {
    setInv((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };

  async function saveDraft(silent) {
    const items = cleanItems(inv.items);
    const row = {
      client_id: inv.client_id || null,
      inquiry_id: inv.inquiry_id || null,
      issue_date: inv.issue_date || null,
      due_date: inv.due_date || null,
      tax_mode: inv.tax_mode,
      items,
      notes: inv.notes?.trim() || null,
      terms: inv.terms?.trim() || null,
      payment_details: inv.payment_details?.trim() || null,
      ...storedTotals(items, inv.tax_mode),
    };
    if (row.due_date && row.issue_date && row.due_date < row.issue_date) {
      toast('The due date is before the invoice date.', true);
      return null;
    }
    const q = inv.id ? supabase.from('invoices').update(row).eq('id', inv.id) : supabase.from('invoices').insert(row);
    const { data, error } = await q.select().single();
    if (error) {
      toast(dbMessage(error), true);
      return null;
    }
    setDirty(false);
    if (!silent) toast('Draft saved');
    if (!inv.id) router.replace(`/admin/invoices/${data.id}`, undefined, { shallow: true });
    setInv({ ...data, items: data.items.length ? data.items : [blankLine(business.default_tax_rate)] });
    return data;
  }

  async function issue() {
    if (!inv.client_id) return toast('Choose who the invoice is for first.', true);
    if (!totals.lines.length || totals.total <= 0) return toast('Add at least one line with an amount.', true);
    if (!business.legal_name) return toast('Add your business name in Invoice settings first. It is printed on every invoice.', true);
    if (!window.confirm(`Issue this invoice for ${inr(totals.total)}? It gets the next invoice number and can't be edited afterwards (you can void it and issue a new one).`)) return;
    setBusy('issue');
    const saved = await saveDraft(true);
    if (!saved) return setBusy('');
    const { error } = await supabase.rpc('issue_invoice', { p_id: saved.id });
    setBusy('');
    if (error) return toast(dbMessage(error), true);
    toast('Issued. Share the link with your client.');
    setReload((n) => n + 1);
  }

  async function removeDraft() {
    if (!inv.id) return router.replace('/admin/invoices');
    if (!window.confirm('Delete this draft? It has no number yet, so nothing is lost from the books.')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', inv.id);
    if (error) return toast(dbMessage(error), true);
    setDirty(false);
    router.replace('/admin/invoices');
  }

  async function voidIt() {
    if (!voidReason.trim()) return toast('Write a short reason, for example "Trip dates changed, reissued".', true);
    if (!window.confirm(`Void ${inv.number}? It stays on record, marked as cancelled, and its number is never reused.`)) return;
    const { error } = await supabase.from('invoices').update({ status: 'void', void_reason: voidReason.trim() }).eq('id', inv.id);
    if (error) return toast(dbMessage(error), true);
    toast('Voided');
    setReload((n) => n + 1);
  }

  const link = inv?.token && typeof window !== 'undefined' ? `${window.location.origin}/invoice/${inv.token}` : '';
  const shown = inv && { ...inv, items: cleanItems(inv.items) };
  const docClient = draft ? client : inv?.client_snapshot;
  const docBusiness = draft ? business : inv?.business_snapshot;
  const docInv = draft ? { ...shown, payment_details: inv.payment_details || business.payment_details, terms: inv.terms || business.terms } : shown;
  const wa = client && link && waLink(client.phone, `Hi ${client.name.split(' ')[0]}, here is your invoice ${inv.number} for ${inr(toPaise(inv.total))}: ${link}`);

  return (
    <AdminShell
      title={inv ? (draft ? (inv.id ? 'Draft invoice' : 'New invoice') : inv.number) : 'Invoice'}
      actions={
        <>
          <Link href="/admin/invoices" className="adm-link">
            Back to invoices
          </Link>
          {inv && !draft && (
            <Link href={`/admin/invoices/new?from=${inv.id}`} className="adm-btn adm-btn-quiet">
              Copy into a new draft
            </Link>
          )}
        </>
      }
    >
      {problem && <p className="adm-note adm-warn">{problem}</p>}
      {inv && (
        <div className="adm-inv">
          <div className="adm-stack">
            {draft ? (
              <>
                <div className="adm-card">
                  <h2 className="adm-h2">Bill to</h2>
                  <ClientPicker
                    value={inv.client_id}
                    toast={toast}
                    onChange={(cid, c) => {
                      set('client_id', cid);
                      setClient(c || null);
                    }}
                  />
                </div>
                <div className="adm-card">
                  <div className="adm-grid3">
                    <div className="adm-field">
                      <label className="adm-label" htmlFor="i-date">
                        Invoice date
                      </label>
                      <input id="i-date" type="date" className="adm-input" value={inv.issue_date || ''} onChange={(e) => set('issue_date', e.target.value)} />
                      <p className="adm-hint">Leave empty to use the day you issue it.</p>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label" htmlFor="i-due">
                        Due by
                      </label>
                      <input id="i-due" type="date" className="adm-input" value={inv.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
                      <p className="adm-hint">Empty: {business.due_days ?? 7} days after the invoice date.</p>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label" htmlFor="i-mode">
                        Prices are
                      </label>
                      <select id="i-mode" className="adm-input" value={inv.tax_mode} onChange={(e) => set('tax_mode', e.target.value)}>
                        <option value="exclusive">Before tax</option>
                        <option value="inclusive">Including tax</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="adm-card">
                  <h2 className="adm-h2">Lines</h2>
                  <Lines items={inv.items} mode={inv.tax_mode} onChange={(v) => set('items', v)} catalog={catalog} taxRate={business.default_tax_rate} />
                  <dl className="adm-sum">
                    <div>
                      <dt>Taxable value</dt>
                      <dd>{inr(totals.subtotal)}</dd>
                    </div>
                    <div>
                      <dt>Tax</dt>
                      <dd>{inr(totals.tax_total)}</dd>
                    </div>
                    <div className="is-total">
                      <dt>Total</dt>
                      <dd>{inr(totals.total)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="adm-card">
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="i-notes">
                      Note on the invoice
                    </label>
                    <textarea id="i-notes" className="adm-input" value={inv.notes || ''} onChange={(e) => set('notes', e.target.value)} maxLength={2000} placeholder="For example: Sandakphu Land Rover trip, 14 to 19 March, 2 adults." />
                  </div>
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="i-pay">
                      How to pay
                    </label>
                    <textarea id="i-pay" className="adm-input" value={inv.payment_details || ''} onChange={(e) => set('payment_details', e.target.value)} maxLength={1000} placeholder={business.payment_details || 'Set your bank and UPI details in Invoice settings'} />
                    <p className="adm-hint">Leave empty to use the details from Invoice settings.</p>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="i-terms">
                      Terms
                    </label>
                    <textarea id="i-terms" className="adm-input" value={inv.terms || ''} onChange={(e) => set('terms', e.target.value)} maxLength={4000} placeholder={business.terms || ''} />
                    <p className="adm-hint">Leave empty to use the terms from Invoice settings.</p>
                  </div>
                </div>
                <div className="adm-savebar">
                  <span className="adm-hint">{dirty ? 'You have unsaved changes.' : inv.id ? 'Draft saved. Drafts have no number and can be changed or deleted.' : 'Not saved yet.'}</span>
                  <button type="button" className="adm-link danger" onClick={removeDraft}>
                    Delete draft
                  </button>
                  <button type="button" className="adm-btn adm-btn-quiet" onClick={() => saveDraft(false)} disabled={Boolean(busy)}>
                    Save draft
                  </button>
                  <button type="button" className="adm-btn" onClick={issue} disabled={Boolean(busy)}>
                    {busy === 'issue' ? 'Issuing' : 'Issue invoice'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="adm-card">
                  <div className="adm-row-between">
                    <span className={`adm-pill i-${inv.status}`}>{labelOf(INVOICE_STATUSES, inv.status)}</span>
                    <span className="adm-hint">Issued {day(inv.issue_date)}{inv.due_date ? `, due ${day(inv.due_date)}` : ''}</span>
                  </div>
                  <div className="adm-tiles adm-tiles-3">
                    <div className="adm-card adm-tile">
                      <strong>{inr(toPaise(inv.total))}</strong>
                      <span>Total</span>
                    </div>
                    <div className="adm-card adm-tile">
                      <strong>{inr(toPaise(inv.paid_total))}</strong>
                      <span>Paid</span>
                    </div>
                    <div className="adm-card adm-tile">
                      <strong>{inv.status === 'void' ? '-' : inr(balance(inv))}</strong>
                      <span>Balance</span>
                    </div>
                  </div>
                  <p className="adm-label">Share with the client</p>
                  <div className="adm-inline">
                    <input className="adm-input" readOnly value={link} aria-label="Invoice link" onFocus={(e) => e.target.select()} />
                    <button type="button" className="adm-btn adm-btn-quiet" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('Link copied'))}>
                      Copy link
                    </button>
                    {wa && (
                      <a className="adm-btn" href={wa} target="_blank" rel="noopener noreferrer">
                        Send on WhatsApp
                      </a>
                    )}
                    <a className="adm-btn adm-btn-quiet" href={`/invoice/${inv.token}`} target="_blank" rel="noopener noreferrer">
                      Open or download PDF
                    </a>
                  </div>
                  <p className="adm-hint">Anyone with the link can see this invoice, so share it only with the client.</p>
                </div>
                {inv.status !== 'void' && <Payments inv={inv} payments={payments} toast={toast} onChange={() => setReload((n) => n + 1)} />}
                {inv.status !== 'void' && (
                  <div className="adm-card">
                    <h2 className="adm-h2">Cancel this invoice</h2>
                    <p className="adm-hint">An issued invoice can&rsquo;t be changed or deleted. Void it to cancel it, then copy it into a new draft if something needs fixing.</p>
                    <div className="adm-inline">
                      <input className="adm-input" placeholder="Reason, shown on the invoice" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} maxLength={300} aria-label="Reason for voiding" />
                      <button type="button" className="adm-btn adm-btn-danger" onClick={voidIt}>
                        Void invoice
                      </button>
                    </div>
                  </div>
                )}
                {inv.status === 'void' && payments.length > 0 && <Payments inv={inv} payments={payments} toast={toast} onChange={() => setReload((n) => n + 1)} />}
              </>
            )}
          </div>
          <div className="adm-inv-preview">
            <p className="adm-label">{draft ? 'Preview' : 'As the client sees it'}</p>
            <InvoiceDoc inv={docInv} client={docClient} business={docBusiness} draft={draft} />
          </div>
        </div>
      )}
      {toastNode}
    </AdminShell>
  );
}
InvoicePage.admin = true;
export default InvoicePage;
