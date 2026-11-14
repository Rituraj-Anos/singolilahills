import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../../../components/admin/AdminShell.jsx';
import { supabase } from '../../../lib/supabase.js';
import { dbMessage, download, toCsv } from '../../../lib/admin/api.js';
import { INVOICE_STATUSES, PAYMENT_METHODS, balance, inr, isOverdue, toPaise } from '../../../lib/invoice.mjs';

const today = () => new Date().toISOString().slice(0, 10);
const labelOf = (list, v) => list.find((x) => x.value === v)?.label || v;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

function Invoices() {
  const [rows, setRows] = useState(null);
  const [payments, setPayments] = useState([]);
  const [problem, setProblem] = useState('');
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from('invoices').select('*, clients(name, phone)').order('created_at', { ascending: false }).limit(3000),
      supabase.from('invoice_payments').select('*').order('paid_on', { ascending: false }).limit(10000),
    ]).then(([i, p]) => {
      if (i.error) return setProblem(dbMessage(i.error));
      setRows(i.data);
      setPayments(p.data || []);
    });
  }, []);

  const month = today().slice(0, 7);
  const tiles = useMemo(() => {
    const open = (rows || []).filter((r) => ['issued', 'partly_paid'].includes(r.status));
    const overdue = open.filter((r) => isOverdue(r));
    return {
      received: payments.filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + toPaise(p.amount), 0),
      outstanding: open.reduce((s, r) => s + balance(r), 0),
      overdue: overdue.reduce((s, r) => s + balance(r), 0),
      overdueCount: overdue.length,
    };
  }, [rows, payments, month]);

  const TABS = [
    ['open', 'To be paid', (r) => ['issued', 'partly_paid'].includes(r.status)],
    ['overdue', 'Overdue', (r) => isOverdue(r)],
    ['draft', 'Drafts', (r) => r.status === 'draft'],
    ['paid', 'Paid', (r) => r.status === 'paid'],
    ['void', 'Void', (r) => r.status === 'void'],
    ['all', 'All', () => true],
  ];
  const test = Object.fromEntries(TABS.map(([v, , f]) => [v, f]));
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows || []).filter((r) => test[tab](r) && (!term || [r.number, r.clients?.name, r.clients?.phone].some((v) => (v || '').toLowerCase().includes(term))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, q]);

  const exportInvoices = () =>
    download(
      `invoices-${today()}.csv`,
      toCsv(
        shown.map((r) => ({ ...r, client: r.client_snapshot?.name || r.clients?.name || '', gstin: r.client_snapshot?.gstin || '', status: labelOf(INVOICE_STATUSES, r.status), balance: (balance(r) / 100).toFixed(2) })),
        ['number', 'issue_date', 'due_date', 'client', 'gstin', 'status', 'subtotal', 'tax_total', 'total', 'paid_total', 'balance', 'void_reason']
      )
    );
  const exportPayments = () => {
    const inv = Object.fromEntries((rows || []).map((r) => [r.id, r]));
    download(
      `payments-${today()}.csv`,
      toCsv(
        payments.map((p) => ({ ...p, invoice: inv[p.invoice_id]?.number || '', client: inv[p.invoice_id]?.client_snapshot?.name || '', method: labelOf(PAYMENT_METHODS, p.method) })),
        ['paid_on', 'amount', 'method', 'reference', 'invoice', 'client', 'note']
      )
    );
  };

  return (
    <AdminShell
      title="Invoices"
      actions={
        <>
          <button className="adm-btn adm-btn-quiet" type="button" onClick={exportInvoices} disabled={!shown.length}>
            Export invoices
          </button>
          <button className="adm-btn adm-btn-quiet" type="button" onClick={exportPayments} disabled={!payments.length}>
            Export payments
          </button>
          <Link href="/admin/invoices/new" className="adm-btn">
            New invoice
          </Link>
        </>
      }
    >
      {problem && <p className="adm-note adm-warn">{problem}</p>}
      <div className="adm-tiles adm-tiles-3">
        <div className="adm-card adm-tile">
          <strong>{inr(tiles.received)}</strong>
          <span>Received this month</span>
        </div>
        <div className="adm-card adm-tile">
          <strong>{inr(tiles.outstanding)}</strong>
          <span>Still to be paid</span>
        </div>
        <div className={`adm-card adm-tile${tiles.overdueCount ? ' is-warn' : ''}`}>
          <strong>{inr(tiles.overdue)}</strong>
          <span>
            Overdue{tiles.overdueCount ? `, ${tiles.overdueCount} invoice${tiles.overdueCount === 1 ? '' : 's'}` : ''}
          </span>
        </div>
      </div>
      <div className="adm-toolbar">
        <div className="adm-tabs" role="tablist" aria-label="Filter invoices">
          {TABS.map(([v, l, f]) => (
            <button key={v} role="tab" type="button" aria-selected={tab === v} onClick={() => setTab(v)}>
              {l} <span className={v === 'overdue' && tiles.overdueCount ? 'adm-follow' : undefined}>{(rows || []).filter(f).length}</span>
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="search">
          Search invoices
        </label>
        <input id="search" className="adm-input adm-search" placeholder="Search number or client" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="adm-card adm-flush">
        {rows === null ? (
          <p className="adm-pad">{problem ? 'Not available yet.' : 'Loading'}</p>
        ) : shown.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Client</th>
                <th>Issued</th>
                <th>Due</th>
                <th className="num">Total</th>
                <th className="num">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/invoices/${r.id}`}>{r.number || 'Draft'}</Link>
                  </td>
                  <td>{r.client_snapshot?.name || r.clients?.name || '-'}</td>
                  <td>{day(r.issue_date)}</td>
                  <td>
                    <span className={isOverdue(r) ? 'adm-follow' : undefined}>{day(r.due_date)}</span>
                  </td>
                  <td className="num">{inr(toPaise(r.total))}</td>
                  <td className="num">{['issued', 'partly_paid'].includes(r.status) ? inr(balance(r)) : '-'}</td>
                  <td>
                    <span className={`adm-pill i-${r.status}`}>{labelOf(INVOICE_STATUSES, r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-pad adm-hint">{rows.length ? 'Nothing in this list.' : 'No invoices yet. Start one from a client, an enquiry, or the New invoice button.'}</p>
        )}
      </div>
    </AdminShell>
  );
}
Invoices.admin = true;
export default Invoices;
// shortcut: loads up to 3,000 invoices and 10,000 payments at once; add server-side paging and date filters past that.
