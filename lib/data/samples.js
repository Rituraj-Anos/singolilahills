// Sample departures and a sample pop-up for running the site WITHOUT a database (local preview only).
// They are never used when Supabase is connected: there, only what the owner adds in the admin is shown.
const inDays = (n) => {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
};

export const SAMPLE_DEPARTURES = [
  { id: 'sample-dep-1', trip_slug: 'north-sikkim-gurudongmar-yumthang', start_date: inDays(21), end_date: inDays(26), price: null, seats_total: 12, seats_left: 5, status: 'filling', note: 'Pickup from NJP or Bagdogra' },
  { id: 'sample-dep-2', trip_slug: 'sandakphu-vintage-land-rover', start_date: inDays(28), end_date: inDays(33), price: 17500, seats_total: 10, seats_left: 8, status: 'open', note: 'Sample date for the local preview' },
  { id: 'sample-dep-3', trip_slug: 'north-sikkim-gurudongmar-yumthang', start_date: inDays(49), end_date: inDays(54), price: null, seats_total: 12, seats_left: 12, status: 'open', note: '' },
  { id: 'sample-dep-4', trip_slug: 'dooars-wildlife-rhino-safari', start_date: inDays(35), end_date: inDays(39), price: null, seats_total: 8, seats_left: 0, status: 'sold_out', note: '' },
].map((d, i) => ({ published: true, sort_order: i, ...d }));

export const SAMPLE_POPUPS = [
  {
    id: 'sample-popup',
    title: 'New: North Sikkim in spring',
    badge: 'New dates',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    text: 'Gurudongmar Lake and the Yumthang rhododendrons, six days from Gangtok. Small group, pickup from NJP.',
    button_label: 'See the dates',
    link_type: 'url',
    link_url: '/upcoming-trips',
    starts_on: null,
    ends_on: null,
    pages: 'all',
    page_paths: [],
    delay_seconds: 2,
    frequency: 'every',
    published: true,
    sort_order: 0,
  },
];
