import { clean, EMAIL_RE, notifyOwner, serviceClient } from '../../lib/server.js';
import { INTERESTS, LENGTHS, TRAVELLERS, groupLabel, monthLabel } from '../../lib/planner.mjs';

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
    console.error('[enquiry] SUPABASE_SERVICE_ROLE_KEY or URL missing; enquiry not stored');
    return res.status(503).json({ error: 'Online enquiries are not set up yet. Please message us on WhatsApp.' });
  }
  const { error } = await db.from('inquiries').insert(row);
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
      '',
      row.notes || '',
    ].join('\n')
  );
  return res.status(200).json({ ok: true });
}
// shortcut: no per-IP rate limit in code; add a firewall rate-limit rule on /api/* at deploy (see DEPLOY.md).
