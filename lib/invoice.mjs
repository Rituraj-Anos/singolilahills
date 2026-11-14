// Invoice arithmetic, shared by the admin builder, the saved totals and the printable invoice,
// so the three can never disagree. All sums are done in paise (integers) and rounded once per line.
// Pure JavaScript with no imports, so it also runs in plain Node tests.

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'partly_paid', label: 'Part paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];
export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];
export const CLIENT_TAGS = ['Repeat traveller', 'VIP', 'Agent', 'Corporate', 'Family'];

const finite = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
export const toPaise = (rupees) => Math.round(finite(rupees) * 100);
export const toRupees = (paise) => Math.round(paise) / 100;

// One line: quantity x unit price, less a discount, then tax added on top (exclusive) or taken out (inclusive).
export function lineAmounts(line = {}, mode = 'exclusive') {
  const qty = Math.max(0, Math.round(finite(line.qty, 1) * 100) / 100);
  const unit = Math.max(0, toPaise(line.unit_price));
  const rate = Math.min(100, Math.max(0, finite(line.tax_rate)));
  const gross = Math.round(qty * unit);
  const discount = Math.min(gross, Math.max(0, toPaise(line.discount)));
  const amount = gross - discount;
  if (mode === 'inclusive') {
    const taxable = Math.round((amount * 100) / (100 + rate));
    return { qty, unit, rate, gross, discount, taxable, tax: amount - taxable, total: amount };
  }
  const tax = Math.round((amount * rate) / 100);
  return { qty, unit, rate, gross, discount, taxable: amount, tax, total: amount + tax };
}

// Totals for a list of lines, with tax grouped by rate (how GST summaries are usually shown).
export function invoiceTotals(items = [], mode = 'exclusive') {
  const lines = (Array.isArray(items) ? items : []).map((it) => ({ ...it, ...lineAmounts(it, mode) }));
  const byRate = new Map();
  for (const l of lines) {
    if (!l.tax && !l.rate) continue;
    const r = byRate.get(l.rate) || { rate: l.rate, taxable: 0, tax: 0 };
    r.taxable += l.taxable;
    r.tax += l.tax;
    byRate.set(l.rate, r);
  }
  const subtotal = lines.reduce((s, l) => s + l.taxable, 0);
  const tax_total = lines.reduce((s, l) => s + l.tax, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  return { lines, taxes: [...byRate.values()].sort((a, b) => a.rate - b.rate), subtotal, tax_total, discount, total: subtotal + tax_total };
}

// The columns stored on the invoice row (rupees), for lists and reports.
export function storedTotals(items, mode) {
  const t = invoiceTotals(items, mode);
  return { subtotal: toRupees(t.subtotal), tax_total: toRupees(t.tax_total), total: toRupees(t.total) };
}

// Keeps only usable lines, trimmed to sane sizes, before saving.
export function cleanItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((it) => ({
      description: String(it?.description || '').trim().slice(0, 300),
      qty: Math.max(0, Math.round(finite(it?.qty, 1) * 100) / 100),
      unit_price: Math.max(0, Math.round(finite(it?.unit_price) * 100) / 100),
      tax_rate: Math.min(100, Math.max(0, finite(it?.tax_rate))),
      discount: Math.max(0, Math.round(finite(it?.discount) * 100) / 100),
    }))
    .filter((it) => it.description && it.qty > 0);
}

export function inr(paise, { symbol = true } = {}) {
  const s = (Math.round(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `₹${s}` : s;
}

export const balance = (inv) => toPaise(inv?.total) - toPaise(inv?.paid_total);

export function isOverdue(inv, today = new Date().toISOString().slice(0, 10)) {
  return ['issued', 'partly_paid'].includes(inv?.status) && Boolean(inv?.due_date) && inv.due_date < today && balance(inv) > 0;
}

// Indian financial year label for a date: 2026-11-01 -> "2026-27", 2027-02-10 -> "2026-27"
export function financialYear(iso) {
  const [y, m] = String(iso).split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// "Rupees Eighteen Thousand Five Hundred Only", Indian grouping (lakh, crore), as printed on Indian invoices.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function under1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? ` ${ONES[r % 10]}` : ''}`;
  return [h && `${ONES[h]} Hundred`, rest].filter(Boolean).join(' ');
}
function words(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${words(crore)} Crore`);
  if (lakh) parts.push(`${under1000(lakh)} Lakh`);
  if (thousand) parts.push(`${under1000(thousand)} Thousand`);
  if (rest) parts.push(under1000(rest));
  return parts.join(' ');
}
export function amountInWords(paise) {
  const p = Math.max(0, Math.round(paise));
  const r = Math.floor(p / 100);
  const ps = p % 100;
  return `Rupees ${words(r)}${ps ? ` and ${words(ps)} Paise` : ''} Only`;
}
