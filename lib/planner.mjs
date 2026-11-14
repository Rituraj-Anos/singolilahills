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

// `answers` holds the owner's own questions (key -> string, or a list for multiple choice).
export const EMPTY_PLAN = { destinations: [], month: '', length: '', travelling: '', adults: 2, children: 0, budget: null, interests: [], answers: {} };

// The built-in questions that feed the trip matching, and the answer type each one always has.
export const MAPPED_TYPES = { destinations: 'destinations', month: 'single', length: 'single', travelling: 'single', group: 'number', budget: 'single', interests: 'multi' };
export const ANSWER_TYPES = [
  { value: 'single', label: 'One choice' },
  { value: 'multi', label: 'Several choices' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'destinations', label: 'Destination picker' },
];
const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// The value saved for a choice: the owner's own value, or one made from the label.
export const optionValue = (o) => slug(o?.value || o?.label);

// Published questions in order, the type fixed for the matching ones, and grouped into screens
// (a question marked `with_previous` shares the screen of the one before it).
export function plannerScreens(questions = []) {
  const qs = questions
    .filter((q) => q && q.published !== false && KEY_RE.test(q.key || ''))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((q) => ({ ...q, type: q.maps_to ? MAPPED_TYPES[q.maps_to] || q.type : q.type, options: Array.isArray(q.options) ? q.options : [] }));
  const screens = [];
  for (const q of qs) {
    if (q.with_previous && screens.length) screens[screens.length - 1].push(q);
    else screens.push([q]);
  }
  return screens;
}

// The owner's questions only (the ones that don't feed the matching).
export const customQuestions = (questions = []) => plannerScreens(questions).flat().filter((q) => !q.maps_to);

// Readable answer to one of the owner's questions, or '' when unanswered.
export function answerText(q, value) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
  const label = (v) => q.options.find((o) => optionValue(o) === v)?.label || '';
  if (q.type === 'single') return label(String(value));
  if (q.type === 'multi') return (Array.isArray(value) ? value : String(value).split(',')).map(label).filter(Boolean).join(', ');
  if (q.type === 'date') return DATE_RE.test(value) ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  return String(value).slice(0, 500);
}

// Keeps only answers that fit the question (a known choice, a real date, a number, short text).
export function cleanAnswer(q, raw) {
  if (raw == null) return null;
  const allowed = q.options.map(optionValue);
  if (q.type === 'single') return allowed.includes(String(raw)) ? String(raw) : null;
  if (q.type === 'multi') {
    const list = (Array.isArray(raw) ? raw : String(raw).split(',')).map(String).filter((v) => allowed.includes(v));
    return list.length ? [...new Set(list)] : null;
  }
  if (q.type === 'number') {
    const n = Number(raw);
    return raw !== '' && Number.isFinite(n) && n >= 0 && n <= 100000 ? String(n) : null;
  }
  if (q.type === 'date') return DATE_RE.test(String(raw)) && !Number.isNaN(Date.parse(raw)) ? String(raw) : null;
  if (q.type === 'text') {
    const s = String(raw).trim().slice(0, 500);
    return s || null;
  }
  return null;
}

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
// `custom` lists the owner's questions ({ key, type }); `screens` is how many question screens there are
// (the step after the last screen is the details form); `departureIds` are the dates that can be booked.
export function parsePlan(q = {}, { destinationSlugs = [], bandCount = 0, tripSlugs = [], custom = [], screens = 5, departureIds = [] } = {}) {
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
    answers: {},
  };
  for (const c of custom) {
    if (!KEY_RE.test(c.key || '')) continue;
    const raw = one(q[`q_${c.key}`]).slice(0, 500);
    if (raw) plan.answers[c.key] = c.type === 'multi' || c.type === 'destinations' ? raw.split(',').filter(Boolean) : raw;
  }
  const trip = tripSlugs.includes(one(q.trip)) ? one(q.trip) : '';
  const dep = departureIds.includes(one(q.dep)) ? one(q.dep) : '';
  // arriving from a trip page (?trip=slug) or a date (?dep=id) skips straight to the details step
  const details = screens + 1;
  const step = clampInt(q.s, 1, details, trip || dep ? details : 1);
  return { plan, step, trip, dep };
}

// The inverse of parsePlan: only values that differ from the defaults go into the URL.
export function serializePlan(plan, step = 1, trip = '', dep = '') {
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
  for (const [k, v] of Object.entries(plan.answers || {})) {
    const s = Array.isArray(v) ? v.join(',') : String(v ?? '');
    if (s && KEY_RE.test(k)) q[`q_${k}`] = s.slice(0, 500);
  }
  if (trip) q.trip = trip;
  if (dep) q.dep = dep;
  return q;
}

// [label, value, stepToEdit] rows shared by the on-screen summary and the WhatsApp message.
// `screenOf` maps a question key to its screen number; `questions` adds the owner's own questions.
export function describePlan(plan, { destinations = [], bands = [], screenOf = {}, questions = [] } = {}) {
  const at = (key, fallback) => screenOf[key] ?? fallback;
  const rows = [];
  const names = destinations.filter((d) => plan.destinations.includes(d.slug)).map((d) => d.name);
  if (names.length) rows.push(['Where', names.join(', '), at('destinations', 1)]);
  const when = [monthLabel(plan.month), plan.length && (plan.length === 'flexible' ? 'flexible length' : labelOf(LENGTHS, plan.length))].filter(Boolean);
  if (when.length) rows.push(['When', when.join(', '), at('month', 2)]);
  const who = [labelOf(TRAVELLERS, plan.travelling), groupLabel(plan.adults, plan.children)].filter(Boolean);
  rows.push(['Who', who.join(', '), at('travelling', 3)]);
  if (plan.budget != null && bands[plan.budget]) rows.push(['Budget per person', bands[plan.budget].label, at('budget', 4)]);
  if (plan.interests.length) rows.push(['Interests', plan.interests.map((i) => labelOf(INTERESTS, i)).filter(Boolean).join(', '), at('interests', 5)]);
  for (const q of questions) {
    const text = answerText(q, plan.answers?.[q.key]);
    if (text) rows.push([q.title, text, at(q.key, 1)]);
  }
  return rows;
}

// The owner's question as the planner uses it: a custom destination picker becomes a multiple choice of places.
export function withPlaces(q, destinations = []) {
  return q.type === 'destinations' ? { ...q, type: 'multi', options: destinations.map((d) => ({ value: d.slug, label: d.name, image: d.hero_image })) } : q;
}

export function planToText(plan, ctx, { brand = 'Singalila Hills', tripTitles = [] } = {}) {
  const lines = [`Hi ${brand}! I would like help planning a trip.`];
  for (const [label, value] of describePlan(plan, ctx)) lines.push(`- ${label}: ${value}`);
  if (tripTitles.length) lines.push(`- Trips I liked: ${tripTitles.join('; ')}`);
  return lines.join('\n');
}
