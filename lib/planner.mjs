// Trip planner vocabulary and helpers. Pure JavaScript with no imports so it runs in the browser,
// in API routes and in plain Node tests.

export const TRAVELLERS = [
  { id: 'solo', label: 'Solo', suits: 'solo travellers' },
  { id: 'couple', label: 'Couple', suits: 'couples' },
  { id: 'family', label: 'Family with children', suits: 'families' },
  { id: 'friends', label: 'Friends', suits: 'groups of friends' },
  { id: 'seniors', label: 'Older travellers', suits: 'older travellers' },
];

export const INTERESTS = [
  { id: 'snow', label: 'Snow and high passes' },
  { id: 'trekking', label: 'Trekking' },
  { id: 'heritage', label: 'Tea and heritage' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'photography', label: 'Photography' },
  { id: 'relaxed', label: 'Slow and relaxed' },
];

export const LENGTHS = [
  { id: 'short', label: 'Up to 4 days', min: 1, max: 4 },
  { id: 'medium', label: '5 to 6 days', min: 5, max: 6 },
  { id: 'long', label: '7 days or more', min: 7, max: 99 },
  { id: 'flexible', label: 'Flexible', min: null, max: null },
];

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const DEFAULT_BUDGET_BANDS = [
  { label: 'Under ₹16,000', min: 0, max: 16000 },
  { label: '₹16,000 to ₹20,000', min: 16000, max: 20000 },
  { label: '₹20,000 to ₹25,000', min: 20000, max: 25000 },
  { label: 'Over ₹25,000', min: 25000, max: '' },
];

export const EMPTY_PLAN = { destinations: [], month: '', length: '', travelling: '', adults: 2, children: 0, budget: null, interests: [] };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const labelOf = (list, id) => list.find((x) => x.id === id)?.label;
const clampInt = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function monthLabel(ym) {
  if (!MONTH_RE.test(ym || '')) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

// The next 12 months starting this month, as { value: '2027-03', label: 'March 2027' }
export function monthOptions(now = new Date()) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: monthLabel(value) };
  });
}

export const monthNumber = (ym) => (MONTH_RE.test(ym || '') ? Number(ym.slice(5)) : null);

export function groupLabel(adults, children) {
  const a = `${adults} adult${adults === 1 ? '' : 's'}`;
  return children > 0 ? `${a}, ${children} child${children === 1 ? '' : 'ren'}` : a;
}

// Reads a plan from URL query values, accepting only values we know. Anything else is dropped.
export function parsePlan(q = {}, { destinationSlugs = [], bandCount = 0, tripSlugs = [] } = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v) || '';
  const many = (v) => one(v).split(',').filter(Boolean);
  const budget = one(q.b) === '' ? null : clampInt(q.b, 0, Math.max(0, bandCount - 1), null);
  const plan = {
    destinations: [...new Set(many(q.d).filter((s) => destinationSlugs.includes(s)))],
    month: MONTH_RE.test(one(q.m)) ? one(q.m) : '',
    length: LENGTHS.some((l) => l.id === one(q.l)) ? one(q.l) : '',
    travelling: TRAVELLERS.some((t) => t.id === one(q.w)) ? one(q.w) : '',
    adults: clampInt(q.a, 1, 30, EMPTY_PLAN.adults),
    children: clampInt(q.c, 0, 30, EMPTY_PLAN.children),
    budget: bandCount && budget != null ? budget : null,
    interests: [...new Set(many(q.i).filter((s) => INTERESTS.some((x) => x.id === s)))],
  };
  const trip = tripSlugs.includes(one(q.trip)) ? one(q.trip) : '';
  // arriving from a trip page (?trip=slug) skips straight to the details step
  const step = clampInt(q.s, 1, 6, trip ? 6 : 1);
  return { plan, step, trip };
}

// The inverse of parsePlan: only values that differ from the defaults go into the URL.
export function serializePlan(plan, step = 1, trip = '') {
  const q = {};
  if (step > 1) q.s = String(step);
  if (plan.destinations.length) q.d = plan.destinations.join(',');
  if (plan.month) q.m = plan.month;
  if (plan.length) q.l = plan.length;
  if (plan.travelling) q.w = plan.travelling;
  if (plan.adults !== EMPTY_PLAN.adults) q.a = String(plan.adults);
  if (plan.children !== EMPTY_PLAN.children) q.c = String(plan.children);
  if (plan.budget != null) q.b = String(plan.budget);
  if (plan.interests.length) q.i = plan.interests.join(',');
  if (trip) q.trip = trip;
  return q;
}

// [label, value, stepToEdit] rows shared by the on-screen summary and the WhatsApp message.
export function describePlan(plan, { destinations = [], bands = [] } = {}) {
  const rows = [];
  const names = destinations.filter((d) => plan.destinations.includes(d.slug)).map((d) => d.name);
  if (names.length) rows.push(['Where', names.join(', '), 1]);
  const when = [monthLabel(plan.month), plan.length && (plan.length === 'flexible' ? 'flexible length' : labelOf(LENGTHS, plan.length))].filter(Boolean);
  if (when.length) rows.push(['When', when.join(', '), 2]);
  const who = [labelOf(TRAVELLERS, plan.travelling), groupLabel(plan.adults, plan.children)].filter(Boolean);
  rows.push(['Who', who.join(', '), 3]);
  if (plan.budget != null && bands[plan.budget]) rows.push(['Budget per person', bands[plan.budget].label, 4]);
  if (plan.interests.length) rows.push(['Interests', plan.interests.map((i) => labelOf(INTERESTS, i)).filter(Boolean).join(', '), 5]);
  return rows;
}

export function planToText(plan, ctx, { brand = 'Singalila Hills', tripTitles = [] } = {}) {
  const lines = [`Hi ${brand}! I would like help planning a trip.`];
  for (const [label, value] of describePlan(plan, ctx)) lines.push(`- ${label}: ${value}`);
  if (tripTitles.length) lines.push(`- Trips I liked: ${tripTitles.join('; ')}`);
  return lines.join('\n');
}
