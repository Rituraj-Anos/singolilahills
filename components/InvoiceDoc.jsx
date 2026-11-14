import { PAYMENT_METHODS, amountInWords, inr, invoiceTotals, toPaise } from '../lib/invoice.mjs';

const day = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const lines = (s) => String(s || '').split('\n').filter((l) => l.trim());
const rate = (r) => `${Number(r).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

function Party({ p, title }) {
  if (!p) return null;
  return (
    <div className="inv-party">
      {title && <h2>{title}</h2>}
      <strong>{p.legal_name || p.name}</strong>
      {lines(p.address).map((l) => (
        <span key={l}>{l}</span>
      ))}
      {p.gstin && <span>GSTIN {p.gstin}</span>}
      {[p.phone, p.email].filter(Boolean).length > 0 && <span>{[p.phone, p.email].filter(Boolean).join(' · ')}</span>}
    </div>
  );
}

/*
  The invoice as the client sees it, used on the public link, in print, and as the live preview in the admin.
  All amounts come from invoiceTotals(items), so the preview, the saved totals and the printout always agree.
*/
export default function InvoiceDoc({ inv, client, business, draft = false }) {
  const t = invoiceTotals(inv.items, inv.tax_mode);
  const b = business || {};
  const paid = toPaise(inv.paid_total);
  const due = t.total - paid;
  const hasDiscount = t.lines.some((l) => l.discount > 0);
  const hasTax = t.lines.some((l) => l.rate > 0);
  const title = b.gstin ? 'Tax invoice' : 'Invoice';
  return (
    <article className={`inv-doc${inv.status === 'void' ? ' is-void' : ''}${draft ? ' is-draft' : ''}`}>
      {(inv.status === 'void' || draft) && (
        <p className="inv-stamp" aria-hidden="true">
          {inv.status === 'void' ? 'Void' : 'Draft'}
        </p>
      )}
      <header className="inv-top">
        <div className="inv-from">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {b.logo && <img className="inv-logo" src={b.logo} alt="" />}
          <Party p={b} />
        </div>
        <div className="inv-title">
          <h1>{title}</h1>
          <dl>
            <div>
              <dt>Number</dt>
              <dd>{inv.number || 'Given when issued'}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{day(inv.issue_date) || 'Given when issued'}</dd>
            </div>
            {inv.due_date && (
              <div>
                <dt>Due by</dt>
                <dd>{day(inv.due_date)}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {inv.status === 'void' && (
        <p className="inv-void-note">
          This invoice was cancelled on {day(inv.voided_at)}
          {inv.void_reason ? `: ${inv.void_reason}` : '.'} Nothing is due on it.
        </p>
      )}

      <section className="inv-to">
        <Party p={client} title="Bill to" />
      </section>

      <table className="inv-lines">
        <thead>
          <tr>
            <th className="n">#</th>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            {hasDiscount && <th className="num">Discount</th>}
            {hasTax && <th className="num">Taxable</th>}
            {hasTax && <th className="num">Tax</th>}
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {t.lines.length ? (
            t.lines.map((l, i) => (
              <tr key={i}>
                <td className="n">{i + 1}</td>
                <td>{l.description}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{inr(l.unit, { symbol: false })}</td>
                {hasDiscount && <td className="num">{l.discount ? inr(l.discount, { symbol: false }) : '-'}</td>}
                {hasTax && <td className="num">{inr(l.taxable, { symbol: false })}</td>}
                {hasTax && <td className="num">{l.rate ? `${inr(l.tax, { symbol: false })} (${rate(l.rate)})` : '-'}</td>}
                <td className="num">{inr(l.total, { symbol: false })}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="inv-empty">
                No lines yet
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="inv-sum">
        <div className="inv-words">
          <p>{amountInWords(t.total)}</p>
          {inv.tax_mode === 'inclusive' && hasTax && <p className="inv-small">Prices include tax.</p>}
        </div>
        <dl className="inv-totals">
          <div>
            <dt>Taxable value</dt>
            <dd>{inr(t.subtotal)}</dd>
          </div>
          {t.taxes.map((x) => (
            <div key={x.rate}>
              <dt>GST at {rate(x.rate)}</dt>
              <dd>{inr(x.tax)}</dd>
            </div>
          ))}
          <div className="inv-grand">
            <dt>Total</dt>
            <dd>{inr(t.total)}</dd>
          </div>
          {paid > 0 && (
            <>
              <div>
                <dt>Paid</dt>
                <dd>{inr(paid)}</dd>
              </div>
              <div className="inv-grand">
                <dt>Balance due</dt>
                <dd>{inr(Math.max(0, due))}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      <footer className="inv-foot">
        {inv.payment_details && (
          <div>
            <h2>How to pay</h2>
            {lines(inv.payment_details).map((l) => (
              <p key={l}>{l}</p>
            ))}
            {inv.number && <p className="inv-small">Please mention {inv.number} with your payment.</p>}
          </div>
        )}
        {inv.notes && (
          <div>
            <h2>Notes</h2>
            {lines(inv.notes).map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        )}
        {inv.terms && (
          <div className="inv-terms">
            <h2>Terms</h2>
            {lines(inv.terms).map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        )}
        <div className="inv-sign">
          <span>For {b.legal_name || 'the business'}</span>
          <strong>{b.signatory || ''}</strong>
          <span className="inv-small">Authorised signatory</span>
        </div>
      </footer>
    </article>
  );
}

// A receipt for one payment against an invoice.
export function ReceiptDoc({ inv, payment, payments, client, business }) {
  const b = business || {};
  const total = toPaise(inv.total);
  const upTo = payments.filter((p) => p.paid_on < payment.paid_on || (p.paid_on === payment.paid_on && p.created_at <= payment.created_at));
  const paidSoFar = upTo.reduce((s, p) => s + toPaise(p.amount), 0);
  const method = PAYMENT_METHODS.find((m) => m.value === payment.method)?.label || payment.method;
  return (
    <article className="inv-doc inv-receipt">
      <header className="inv-top">
        <div className="inv-from">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {b.logo && <img className="inv-logo" src={b.logo} alt="" />}
          <Party p={b} />
        </div>
        <div className="inv-title">
          <h1>Payment receipt</h1>
          <dl>
            <div>
              <dt>Date paid</dt>
              <dd>{day(payment.paid_on)}</dd>
            </div>
            <div>
              <dt>For invoice</dt>
              <dd>{inv.number}</dd>
            </div>
          </dl>
        </div>
      </header>
      <section className="inv-to">
        <Party p={client} title="Received from" />
      </section>
      <dl className="inv-totals inv-receipt-box">
        <div className="inv-grand">
          <dt>Amount received</dt>
          <dd>{inr(toPaise(payment.amount))}</dd>
        </div>
        <div>
          <dt>Paid by</dt>
          <dd>{method}</dd>
        </div>
        {payment.reference && (
          <div>
            <dt>Reference</dt>
            <dd>{payment.reference}</dd>
          </div>
        )}
        <div>
          <dt>Invoice total</dt>
          <dd>{inr(total)}</dd>
        </div>
        <div>
          <dt>Paid so far</dt>
          <dd>{inr(paidSoFar)}</dd>
        </div>
        <div>
          <dt>Still to pay</dt>
          <dd>{inr(Math.max(0, total - paidSoFar))}</dd>
        </div>
      </dl>
      <p className="inv-words">{amountInWords(toPaise(payment.amount))}</p>
      <footer className="inv-foot">
        <div className="inv-sign">
          <span>For {b.legal_name || 'the business'}</span>
          <strong>{b.signatory || ''}</strong>
          <span className="inv-small">Authorised signatory</span>
        </div>
      </footer>
    </article>
  );
}
