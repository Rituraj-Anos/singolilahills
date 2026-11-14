import { clean, EMAIL_RE, notifyOwner, serviceClient } from '../../lib/server.js';
import { INTERESTS, LENGTHS, TRAVELLERS, groupLabel, monthLabel } from '../../lib/planner.mjs';
import { estimate, selectionText } from '../../lib/price.mjs';
import { money } from '../../lib/format.js';
import { answerText, cleanAnswer, customQuestions, withPlaces } from '../../lib/planner.mjs';
import { dateRange } from '../../lib/departures.mjs';
import { getDepartures, getDestinations, getPlannerQuestions } from '../../lib/content.js';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Keeps only unique, non-empty strings that pass `ok`, at most `max` of them.
const list = (v, max, ok = () => true) =>
  Array.isArray(v) ? [...new Set(v.map((x) => clean(x, 60)).filter((x) => x && ok(x)))].slice(0, max) : [];
const int = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const b = req.body || {};
  // honeypot: real visitors never see or fill this field
  if (b.company) return res.status(200).json({ ok: true });

  // planner answers are all optional; anything unrecognised is dropped, never trusted
  const month = MONTH_RE.test(b.travel_month || '') ? b.travel_month : null;
  const adults = int(b.adults, 1, 30, null);
  const children = int(b.children, 0, 30, 0);
  const row = {
    name: clean(b.name, 80),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120).toLowerCase() || null,
    package_interest: clean(b.trip, 160) || null,
    travel_dates: (month ? monthLabel(month) : clean(b.travel_dates, 60)) || null,
    group_size: (adults ? groupLabel(adults, children) : clean(b.group_size, 40)) || null,
    notes: clean(b.notes, 1500) || null,
    source: 'website',
    destinations: list(b.destinations, 8),
    travel_month: month ? `${month}-01` : null,
    trip_length: LENGTHS.some((l) => l.id === b.trip_length) ? b.trip_length : null,
    adults,
    children,
    travelling_with: TRAVELLERS.some((t) => t.id === b.travelling_with) ? b.travelling_with : null,
    budget_label: clean(b.budget_label, 60) || null,
    interests: list(b.interests, 8, (x) => INTERESTS.some((i) => i.id === x)),
    matched_trips: list(b.matched_trips, 8, (x) => SLUG_RE.test(x)),
  };
  const fields = {};
  if (row.name.length < 2) fields.name = 'Please tell us your name.';
  if (!/^\+?[\d\s()-]{7,20}$/.test(row.phone) || row.phone.replace(/\D/g, '').length < 7)
    fields.phone = 'Please enter a phone number we can reach, with country code if outside India.';
  if (row.email && !EMAIL_RE.test(row.email)) fields.email = 'That email address does not look right.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Please check the highlighted fields.', fields });

  const db = serviceClient();
  if (!db) {
    console.error('[enquiry] SUPABASE_SECRET_KEY or URL missing; enquiry not stored');
    return res.status(503).json({ error: 'Online enquiries are not set up yet. Please message us on WhatsApp.' });
  }

  // "Make it yours": the estimate is worked out again here from the saved trip prices.
  // The browser only says which options were picked; its numbers are never used.
  let priced = null;
  const tripSlug = SLUG_RE.test(b.trip_slug || '') ? b.trip_slug : null;
  if (tripSlug && b.selection && typeof b.selection === 'object') {
    const { data: trip } = await db.from('packages').select('*').eq('slug', tripSlug).eq('published', true).maybeSingle();
    if (trip?.show_customiser) {
      const est = estimate(trip, b.selection);
      priced = { trip, est };
      Object.assign(row, {
        trip_slug: tripSlug,
        package_interest: trip.title,
        adults: est.selection.adults,
        children: est.selection.children,
        group_size: groupLabel(est.selection.adults, est.selection.children),
        selection: { ...est.selection, lines: est.lines },
        estimate: est.total,
      });
    }
  }

  // A fixed date picked from a trip page: only a date that can still be booked is accepted.
  let picked = null;
  const depId = typeof b.departure_id === 'string' && /^[\w-]{1,64}$/.test(b.departure_id) ? b.departure_id : '';
  if (depId) {
    picked = (await getDepartures()).find((d) => d.id === depId) || null;
    if (picked) {
      Object.assign(row, {
        departure_id: picked.id,
        package_interest: picked.trip.title,
        travel_dates: dateRange(picked.start_date, picked.end_date),
        travel_month: `${picked.start_date.slice(0, 7)}-01`,
      });
    }
  }

  // The owner's own planner questions: each answer must fit its question (a known choice, a date, a number, short text).
  const answers = [];
  if (b.answers && typeof b.answers === 'object') {
    const [qs, dests] = await Promise.all([getPlannerQuestions(), getDestinations()]);
    for (const q of customQuestions(qs).map((x) => withPlaces(x, dests))) {
      const v = cleanAnswer(q, b.answers[q.key]);
      const text = v == null ? '' : answerText(q, v);
      if (text) answers.push({ key: q.key, question: q.title.slice(0, 160), answer: text.slice(0, 500) });
    }
  }
  if (answers.length) row.planner_answers = answers;

  let { error } = await db.from('inquiries').insert(row);
  // the database may not have the newer columns yet (migrations 07 and 09): keep the enquiry, with those details as text
  const NEWER_COLS = ['trip_slug', 'selection', 'estimate', 'planner_answers', 'departure_id'];
  if (error && NEWER_COLS.some((c) => (error.message || '').includes(c))) {
    const rest = { ...row };
    NEWER_COLS.forEach((c) => delete rest[c]);
    const text = [
      priced && selectionText(priced.trip, priced.est, (n) => money(n, priced.trip.currency || '₹')),
      ...answers.map((a) => `${a.question}: ${a.answer}`),
    ]
      .filter(Boolean)
      .join('\n');
    ({ error } = await db.from('inquiries').insert({ ...rest, notes: [rest.notes, text].filter(Boolean).join('\n\n').slice(0, 1500) || null }));
  }
  if (error) {
    console.error('[enquiry] insert failed:', error.message);
    return res.status(500).json({ error: 'We could not save your enquiry. Please try again or message us on WhatsApp.' });
  }

  const label = (set, id) => set.find((x) => x.id === id)?.label;
  await notifyOwner(
    `New enquiry: ${row.name}${row.package_interest ? `, ${row.package_interest}` : ''}`,
    [
      `Name: ${row.name}`,
      `Phone: ${row.phone}`,
      `Email: ${row.email || '-'}`,
      `Trip: ${row.package_interest || '-'}`,
      `Where: ${row.destinations.join(', ') || '-'}`,
      `When: ${row.travel_dates || '-'}${row.trip_length ? `, ${label(LENGTHS, row.trip_length)}` : ''}`,
      `Who: ${[label(TRAVELLERS, row.travelling_with), row.group_size].filter(Boolean).join(', ') || '-'}`,
      `Budget per person: ${row.budget_label || '-'}`,
      `Interests: ${row.interests.map((i) => label(INTERESTS, i)).join(', ') || '-'}`,
      priced ? `\n${selectionText(priced.trip, priced.est, (n) => money(n, priced.trip.currency || '₹'))}` : '',
      picked ? `Date picked: ${dateRange(picked.start_date, picked.end_date)}, ${money(picked.price, picked.trip.currency)} per person` : '',
      ...answers.map((a) => `${a.question}: ${a.answer}`),
      '',
      row.notes || '',
    ].join('\n')
  );
  return res.status(200).json({ ok: true });
}
// shortcut: no per-IP rate limit in code; add a firewall rate-limit rule on /api/* at deploy (see DEPLOY.md).
