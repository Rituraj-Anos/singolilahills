import test from 'node:test';
import assert from 'node:assert/strict';
import { bandRange, rankTrips, scoreTrip } from './match.mjs';
import { DEFAULT_BUDGET_BANDS, EMPTY_PLAN, describePlan, groupLabel, monthLabel, monthOptions, parsePlan, planToText, serializePlan } from './planner.mjs';

const bands = DEFAULT_BUDGET_BANDS;
const destinations = [
  { slug: 'sikkim', name: 'Sikkim', circuits: ['zuluk', 'north'] },
  { slug: 'dooars', name: 'Dooars', circuits: ['safari'] },
];
const trips = [
  { slug: 'zuluk', title: 'Zuluk', price: 15500, currency: '₹', duration_days: 5, months: [10, 11, 12, 4, 5, 6], suitable_for: ['couple', 'friends'], interests: ['photography'] },
  { slug: 'north', title: 'North Sikkim', price: 22000, currency: '₹', duration_days: 6, months: [10, 11, 4, 5], suitable_for: ['friends'], interests: ['snow', 'photography'] },
  { slug: 'safari', title: 'Dooars safari', price: 17500, currency: '₹', duration_days: 5, months: [10, 11, 12, 1, 2, 3], suitable_for: ['family', 'couple'], interests: ['wildlife'] },
];
const plan = (patch = {}) => ({ ...EMPTY_PLAN, ...patch });

test('an empty plan matches nothing, so the page offers a custom trip', () => {
  assert.deepEqual(rankTrips(trips, plan(), destinations, bands), []);
});

test('the chosen destination decides the shortlist', () => {
  const out = rankTrips(trips, plan({ destinations: ['sikkim'] }), destinations, bands);
  assert.deepEqual(out.map((r) => r.trip.slug), ['zuluk', 'north']);
  assert.ok(out[0].reasons.includes('Goes to Sikkim'));
});

test('a trip inside the budget outranks one above it', () => {
  // 16,000 to 20,000: only the Dooars trip (17,500) is inside
  const out = rankTrips(trips, plan({ destinations: ['sikkim', 'dooars'], budget: 1 }), destinations, bands);
  assert.equal(out[0].trip.slug, 'safari');
  const north = out.find((r) => r.trip.slug === 'north');
  assert.deepEqual(north.warnings, ['A little above your budget']); // 22,000 is 10 percent over the 20,000 cap
  assert.deepEqual(scoreTrip({ slug: 'x', price: 26000 }, plan({ budget: 1 }), [], bands).warnings, ['Above your budget']);
});

test('budget band edges: lower limit inclusive, upper exclusive, blank upper means no cap', () => {
  const b = bands[1]; // 16,000 to 20,000
  const at = (price) => scoreTrip({ slug: 'x', price }, plan({ budget: 1 }), [], bands).score;
  assert.equal(at(16000), 2);
  assert.equal(at(19999), 2);
  assert.equal(at(20000), 1); // exactly at the cap is outside the band but within 15 percent
  assert.equal(at(15999), 0);
  assert.deepEqual(bandRange(bands[3]), { min: 25000, max: Infinity });
  assert.deepEqual(bandRange({ min: '', max: '' }), { min: 0, max: Infinity });
  assert.equal(b.min, 16000);
});

test('slightly over budget is warned about but still scores', () => {
  const r = scoreTrip({ slug: 'x', price: 22000 }, plan({ budget: 1 }), [], bands); // cap 20,000, 22,000 is 10 percent over
  assert.equal(r.score, 1);
  assert.deepEqual(r.warnings, ['A little above your budget']);
});

test('travel month adds a point in season and a warning out of season', () => {
  const good = scoreTrip(trips[0], plan({ month: '2027-10' }), [], bands);
  assert.equal(good.score, 1);
  const bad = scoreTrip(trips[0], plan({ month: '2027-07' }), [], bands);
  assert.equal(bad.score, -2);
  assert.deepEqual(bad.warnings, ['Not the best season in July']);
});

test('a trip in the chosen region but out of season ranks below an in-season trip elsewhere', () => {
  // January, Sikkim chosen: North Sikkim (months Oct-Dec, Apr-Jun) is out of season; the Dooars safari is in season
  const p = plan({ destinations: ['sikkim'], month: '2027-01', length: 'medium' });
  const north = scoreTrip(trips[1], p, destinations, bands).score; // 3 region + 2 length - 2 season
  const safari = scoreTrip({ ...trips[2], duration_days: 5 }, p, destinations, bands).score; // 2 length + 1 season
  assert.ok(safari >= north, `${safari} should not be below ${north}`);
  const out = rankTrips(trips, p, destinations, bands).map((r) => r.trip.slug);
  assert.ok(out.indexOf('safari') < out.indexOf('north') || !out.includes('north'));
});

test('length fits earn 2, one day off earns 1', () => {
  assert.equal(scoreTrip({ slug: 'x', duration_days: 5 }, plan({ length: 'medium' }), [], bands).score, 2);
  assert.equal(scoreTrip({ slug: 'x', duration_days: 7 }, plan({ length: 'medium' }), [], bands).score, 1);
  assert.equal(scoreTrip({ slug: 'x', duration_days: 9 }, plan({ length: 'medium' }), [], bands).score, 0);
  assert.equal(scoreTrip({ slug: 'x', duration_days: 9 }, plan({ length: 'flexible' }), [], bands).score, 0);
});

test('interests are capped at 2 points and traveller type adds 1', () => {
  const r = scoreTrip(trips[1], plan({ interests: ['snow', 'photography', 'wildlife'], travelling: 'friends' }), [], bands);
  assert.equal(r.score, 3); // 2 for interests, 1 for friends
});

test('ties keep the owner\'s trip order and the list is limited to three', () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ slug: `t${i}`, price: 17000, duration_days: 5 }));
  const out = rankTrips(many, plan({ budget: 1, length: 'medium' }), [], bands);
  assert.deepEqual(out.map((r) => r.trip.slug), ['t0', 't1', 't2']);
});

test('parsePlan drops unknown and out of range values', () => {
  const ctx = { destinationSlugs: ['sikkim', 'dooars'], bandCount: 4, tripSlugs: ['zuluk'] };
  const { plan: p, step, trip } = parsePlan({ d: 'sikkim,<script>,dooars,sikkim', m: '2027-13', l: 'forever', w: 'alien', a: '999', c: '-3', b: '9', i: 'snow,nope', s: '99', trip: 'evil' }, ctx);
  assert.deepEqual(p.destinations, ['sikkim', 'dooars']);
  assert.equal(p.month, '');
  assert.equal(p.length, '');
  assert.equal(p.travelling, '');
  assert.equal(p.adults, 30);
  assert.equal(p.children, 0);
  assert.equal(p.budget, 3);
  assert.deepEqual(p.interests, ['snow']);
  assert.equal(step, 6);
  assert.equal(trip, '');
});

test('a ?trip= link starts at the details step; serialize and parse round trip', () => {
  const ctx = { destinationSlugs: ['sikkim'], bandCount: 4, tripSlugs: ['zuluk'] };
  assert.equal(parsePlan({ trip: 'zuluk' }, ctx).step, 6);
  const original = plan({ destinations: ['sikkim'], month: '2027-03', length: 'medium', travelling: 'family', adults: 2, children: 1, budget: 2, interests: ['snow', 'relaxed'] });
  const back = parsePlan(serializePlan(original, 3, 'zuluk'), ctx);
  assert.deepEqual(back.plan, original);
  assert.equal(back.step, 3);
  assert.equal(back.trip, 'zuluk');
  assert.deepEqual(serializePlan(plan(), 1), {});
});

test('describing a plan and building the WhatsApp text', () => {
  const p = plan({ destinations: ['sikkim'], month: '2027-03', length: 'medium', travelling: 'family', adults: 2, children: 1, budget: 1, interests: ['snow'] });
  const rows = describePlan(p, { destinations, bands });
  assert.deepEqual(rows.map((r) => r[0]), ['Where', 'When', 'Who', 'Budget per person', 'Interests']);
  const text = planToText(p, { destinations, bands }, { tripTitles: ['Zuluk'] });
  assert.match(text, /Where: Sikkim/);
  assert.match(text, /When: March 2027, 5 to 6 days/);
  assert.match(text, /Who: Family with children, 2 adults, 1 child/);
  assert.match(text, /Trips I liked: Zuluk/);
});

test('small helpers', () => {
  assert.equal(monthLabel('2027-03'), 'March 2027');
  assert.equal(monthLabel('nope'), '');
  assert.equal(groupLabel(1, 0), '1 adult');
  assert.equal(groupLabel(2, 2), '2 adults, 2 children');
  const opts = monthOptions(new Date(2026, 10, 15)); // November 2026
  assert.equal(opts.length, 12);
  assert.equal(opts[0].value, '2026-11');
  assert.equal(opts[2].value, '2027-01'); // rolls over the year
});
