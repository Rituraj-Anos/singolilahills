import assert from 'node:assert/strict';
import test from 'node:test';
import { amountInWords, balance, cleanItems, financialYear, invoiceTotals, isOverdue, lineAmounts, storedTotals } from './invoice.mjs';

test('tax exclusive: tax is added on top', () => {
  const l = lineAmounts({ qty: 2, unit_price: 18500, tax_rate: 5 }, 'exclusive');
  assert.equal(l.taxable, 3700000);
  assert.equal(l.tax, 185000);
  assert.equal(l.total, 3885000);
});

test('tax inclusive: tax is taken out of the price', () => {
  const l = lineAmounts({ qty: 1, unit_price: 10500, tax_rate: 5 }, 'inclusive');
  assert.equal(l.total, 1050000);
  assert.equal(l.taxable, 1000000);
  assert.equal(l.tax, 50000);
});

test('discount comes off before tax and never below zero', () => {
  assert.equal(lineAmounts({ qty: 1, unit_price: 1000, discount: 100, tax_rate: 10 }).total, 99000);
  assert.equal(lineAmounts({ qty: 1, unit_price: 1000, discount: 5000 }).total, 0);
});

test('totals group tax by rate and add up exactly', () => {
  const t = invoiceTotals(
    [
      { description: 'Trip', qty: 2, unit_price: 18500, tax_rate: 5 },
      { description: 'Hotel', qty: 3, unit_price: 3333.33, tax_rate: 12 },
      { description: 'Permit fee', qty: 1, unit_price: 200, tax_rate: 0 },
    ],
    'exclusive'
  );
  assert.deepEqual(t.taxes.map((x) => x.rate), [5, 12]);
  assert.equal(t.subtotal, 3700000 + 999999 + 20000);
  assert.equal(t.tax_total, 185000 + 120000);
  assert.equal(t.total, t.subtotal + t.tax_total);
  assert.deepEqual(storedTotals(t.lines, 'exclusive'), { subtotal: 47199.99, tax_total: 3050, total: 50249.99 });
});

test('inclusive totals equal the sum of the prices entered', () => {
  const items = [
    { description: 'A', qty: 1, unit_price: 999.99, tax_rate: 18 },
    { description: 'B', qty: 3, unit_price: 333.33, tax_rate: 5 },
  ];
  assert.equal(invoiceTotals(items, 'inclusive').total, 99999 + 99999);
});

test('fractional quantities round once per line', () => {
  assert.equal(lineAmounts({ qty: 1.5, unit_price: 333.33 }).total, 50000);
});

test('empty or junk lines are dropped before saving', () => {
  assert.deepEqual(cleanItems([{ description: '  ' }, { description: 'Trip', qty: '2', unit_price: '18500.556', tax_rate: '500' }, { description: 'Zero', qty: 0 }]), [
    { description: 'Trip', qty: 2, unit_price: 18500.56, tax_rate: 100, discount: 0 },
  ]);
});

test('balance, overdue and the Indian financial year', () => {
  assert.equal(balance({ total: 1000, paid_total: 250.5 }), 74950);
  assert.equal(isOverdue({ status: 'partly_paid', due_date: '2026-10-01', total: 10, paid_total: 0 }, '2026-11-01'), true);
  assert.equal(isOverdue({ status: 'paid', due_date: '2026-10-01', total: 10, paid_total: 10 }, '2026-11-01'), false);
  assert.equal(isOverdue({ status: 'issued', due_date: '2026-11-01', total: 10, paid_total: 0 }, '2026-11-01'), false);
  assert.equal(financialYear('2026-11-01'), '2026-27');
  assert.equal(financialYear('2027-03-31'), '2026-27');
  assert.equal(financialYear('2027-04-01'), '2027-28');
});

test('amount in words uses lakh and crore', () => {
  assert.equal(amountInWords(1850000), 'Rupees Eighteen Thousand Five Hundred Only');
  assert.equal(amountInWords(12345678950), 'Rupees Twelve Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine and Fifty Paise Only');
  assert.equal(amountInWords(0), 'Rupees Zero Only');
});
