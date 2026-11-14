import Head from 'next/head';
import InvoiceDoc, { ReceiptDoc } from '../../components/InvoiceDoc.jsx';
import { serviceClient } from '../../lib/server.js';
import { json } from '../../lib/content.js';

// The client's copy of an invoice or receipt. Read on the server by its long random token; invoices are
// never readable from the browser. Drafts are never shown. The browser's "Save as PDF" turns it into a file.
export default function InvoiceLink({ inv, payments, receipt }) {
  const name = receipt ? `Receipt for ${inv.number}` : inv.number;
  const from = inv.business_snapshot?.legal_name || '';
  return (
    <>
      <Head>
        <title>{`${name}${from ? ` · ${from}` : ''}`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      <div className="inv-page">
        <div className="inv-bar no-print">
          <p>{receipt ? 'Your payment receipt.' : 'Your invoice.'} To keep a copy, press the button and choose Save as PDF.</p>
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
        {receipt ? (
          <ReceiptDoc inv={inv} payment={receipt} payments={payments} client={inv.client_snapshot} business={inv.business_snapshot} />
        ) : (
          <InvoiceDoc inv={inv} client={inv.client_snapshot} business={inv.business_snapshot} />
        )}
      </div>
    </>
  );
}

const TOKEN_RE = /^[a-f0-9]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function getServerSideProps({ params, query, res }) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const token = String(params.token || '');
  const db = serviceClient();
  if (!TOKEN_RE.test(token) || !db) return { notFound: true };
  const { data: inv } = await db
    .from('invoices')
    .select('id, number, status, issue_date, due_date, tax_mode, items, notes, terms, payment_details, client_snapshot, business_snapshot, total, paid_total, voided_at, void_reason')
    .eq('token', token)
    .neq('status', 'draft')
    .maybeSingle();
  if (!inv) return { notFound: true };
  const { data: payments } = await db.from('invoice_payments').select('id, amount, paid_on, method, reference, created_at').eq('invoice_id', inv.id).order('paid_on').order('created_at');
  const rid = typeof query.receipt === 'string' && UUID_RE.test(query.receipt) ? query.receipt : null;
  const receipt = rid ? (payments || []).find((p) => p.id === rid) || null : null;
  if (rid && !receipt) return { notFound: true };
  const publicInv = { ...inv };
  delete publicInv.id; // the internal id stays on the server
  return { props: json({ inv: publicInv, payments: payments || [], receipt }) };
}
