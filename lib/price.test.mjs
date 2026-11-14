import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanSelection, estimate, optionId, tripOptions } from './price.mjs';

const trip = {
  title: 'Sandakphu',
  price: 18500,
  child_price: 12000,
  stay_levels: [
    { name: 'Standard', price: 0 },
    { name: 'Comfort', price: 3000 },
    { name: '', price: 5000 }, // no name: dropped
  ],
  addons: [
    { name: 'Extra night in Darjeeling', price: 2500, per: 'person', child_price: 1500 },
    { name: 'Private vehicle', price: 9000, per: 'group' },
    { name: 'Tiger Hill sunrise', price: 600, per: 'person' }, // no child price: children pay the same
    { name: 'Broken', price: 'abc', per: 'person' }, // not a price: dropped
  ],
};

test('base price only, adults', () => {
  const e = estimate(trip, { adults: 2 });
  assert.equal(e.total, 37000);
  assert.deepEqual(e.lines, [{ label: 'Trip, 2 adults', amount: 37000 }]);
});

test('children use the child price', () => {
  assert.equal(estimate(trip, { adults: 2, children: 1 }).total, 2 * 18500 + 12000);
});

test('children pay the adult price when no child price is set', () => {
  assert.equal(estimate({ ...trip, child_price: null }, { adults: 1, children: 2 }).total, 3 * 18500);
  assert.equal(estimate({ ...trip, child_price: '' }, { adults: 1, children: 1 }).total, 2 * 18500);
});

test('stay level is charged for every traveller; the free first level adds no line', () => {
  const comfort = estimate(trip, { adults: 2, children: 1, stay: 'comfort' });
  assert.equal(comfort.total, 2 * 18500 + 12000 + 3 * 3000);
  assert.equal(estimate(trip, { adults: 2, stay: 'standard' }).lines.length, 1);
});

test('per-person add-on uses its child price, per-group add-on is charged once', () => {
  const e = estimate(trip, { adults: 2, children: 1, addons: ['extra-night-in-darjeeling', 'private-vehicle'] });
  assert.equal(e.total, 2 * 18500 + 12000 + (2 * 2500 + 1500) + 9000);
});

test('per-person add-on without a child price charges children the same', () => {
  assert.equal(estimate(trip, { adults: 1, children: 1, addons: ['tiger-hill-sunrise'] }).total, 18500 + 12000 + 1200);
});

test('empty selection falls back to 2 adults and the first stay level', () => {
  const e = estimate(trip, {});
  assert.equal(e.selection.adults, 2);
  assert.equal(e.selection.stay, 'standard');
  assert.equal(e.total, 37000);
});

test('unknown options, bad counts and a forged total are ignored', () => {
  const sel = cleanSelection({ adults: '999', children: -4, stay: 'palace', addons: ['free-helicopter', 'private-vehicle'], total: 1 }, trip);
  assert.deepEqual(sel, { adults: 30, children: 0, stay: 'standard', addons: ['private-vehicle'] });
});

test('a trip with no options still estimates', () => {
  const e = estimate({ price: 15500 }, { adults: 3 });
  assert.equal(e.total, 46500);
  assert.equal(e.selection.stay, '');
});

test('options with no name, bad prices or repeated names are dropped', () => {
  const o = tripOptions({ ...trip, addons: [...trip.addons, { name: 'Private Vehicle', price: 1 }] });
  assert.deepEqual(o.stays.map((s) => s.id), ['standard', 'comfort']);
  assert.deepEqual(o.addons.map((a) => a.id), ['extra-night-in-darjeeling', 'private-vehicle', 'tiger-hill-sunrise']);
  assert.equal(optionId('  Tiger Hill  sunrise! '), 'tiger-hill-sunrise');
});

test('amounts are whole rupees', () => {
  const e = estimate({ price: 1000.6, addons: [{ name: 'Tea', price: 99.4, per: 'person' }] }, { adults: 3, addons: ['tea'] });
  assert.equal(e.total, 3 * 1001 + 3 * 99);
  assert.ok(e.lines.every((l) => Number.isInteger(l.amount)));
});
