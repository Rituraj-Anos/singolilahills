// Every page reads content through here. Supabase when configured, the bundled files otherwise,
// so the site still builds and runs before the client's database exists.
import { supabase } from './supabase.js';
import { PACKAGES } from './data/packages.js';
import { DESTINATIONS } from './data/destinations.js';
import { BLOGS } from './data/blogs.js';
import { REELS } from './data/reels.js';
import { DEFAULT_SETTINGS, FAQS } from './data/settings.js';
import { PLANNER_META } from './data/planner-meta.js';
import { EXPERIENCES } from './data/experiences.js';
import { TRIP_OPTIONS } from './data/trip-options.js';
import { withPins } from './data/route-pins.js';
import { DEFAULT_QUESTIONS } from './data/planner-questions.js';
import { SAMPLE_DEPARTURES, SAMPLE_POPUPS } from './data/samples.js';
import { isBookable, isPopupLive, todayIST } from './departures.mjs';

// How often a static page re-checks the database (seconds). Admin saves also refresh pages instantly.
export const REVALIDATE = 300;

const local = {
  packages: PACKAGES.map((p, i) => ({
    published: true,
    sort_order: i,
    months: [],
    suitable_for: [],
    interests: [],
    ...p,
    ...(PLANNER_META[p.slug] || {}),
    ...(TRIP_OPTIONS[p.slug] || {}),
    // without a database (local preview only) the example options are shown; the database seed keeps them hidden
    show_customiser: true,
    itinerary: withPins(p.slug, p.itinerary),
  })),
  experiences: EXPERIENCES.map((e, i) => ({ published: true, sort_order: i, ...e })),
  planner_questions: DEFAULT_QUESTIONS,
  departures: SAMPLE_DEPARTURES,
  popups: SAMPLE_POPUPS,
  destinations: DESTINATIONS.map((d, i) => ({ published: true, sort_order: i, ...d })),
  posts: BLOGS.map((b) => ({ published: true, published_at: b.date, ...b })),
  // the bundled reels point at placeholder Instagram URLs, so they stay unpublished until real ones are added
  reels: REELS.map((r, i) => ({ sort_order: i, reel_url: r.reelUrl, ...r, published: !/\/example\d*\/?$/.test(r.reelUrl) })),
  // Sample reviews in lib/data/reviews.js were never confirmed by the client, so none ship until he adds real ones.
  reviews: [],
  faqs: FAQS.map((f) => ({ published: true, ...f })),
};

const ORDER = {
  packages: ['sort_order', true],
  destinations: ['sort_order', true],
  posts: ['published_at', false],
  reels: ['sort_order', true],
  reviews: ['created_at', false],
  faqs: ['sort_order', true],
  experiences: ['sort_order', true],
  planner_questions: ['sort_order', true],
  departures: ['start_date', true],
  popups: ['sort_order', true],
};

// Tables added by a later migration. Until the owner runs that SQL the site keeps working: built-in content
// is used where it is real (experiences, today's planner questions), and nothing is shown where it would be
// made up (departures and pop-ups only ever come from the owner).
const NEWER = { experiences: 'local', planner_questions: 'local', departures: 'none', popups: 'none' };
const missingTable = (e) => e && (e.code === 'PGRST205' || e.code === '42P01' || /schema cache|does not exist/i.test(e.message || ''));

// Trips saved before route pins existed get the default pins. Once any day has a pin field
// (set or cleared by the owner), the trip's own pins are used as they are.
const fillPins = (p) => (p && Array.isArray(p.itinerary) && !p.itinerary.some((d) => d && 'pin' in d) ? { ...p, itinerary: withPins(p.slug, p.itinerary) } : p);
const shape = (table, row) => (table === 'packages' ? fillPins(row) : row);

async function list(table) {
  if (supabase) {
    const [col, asc] = ORDER[table];
    const { data, error } = await supabase.from(table).select('*').eq('published', true).order(col, { ascending: asc });
    if (error && NEWER[table] && missingTable(error)) return NEWER[table] === 'local' ? local[table].filter((r) => r.published !== false) : [];
    if (error) throw new Error(`[content] ${table}: ${error.message}`);
    return data.map((r) => shape(table, r));
  }
  return local[table].filter((r) => r.published !== false);
}

async function one(table, slug) {
  if (supabase) {
    const { data, error } = await supabase.from(table).select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (error) throw new Error(`[content] ${table}/${slug}: ${error.message}`);
    return shape(table, data);
  }
  return local[table].find((r) => r.slug === slug) || null;
}

export async function getSettings() {
  if (supabase) {
    const { data, error } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle();
    if (error) throw new Error(`[content] settings: ${error.message}`);
    return withEnv({ ...DEFAULT_SETTINGS, ...(data?.data || {}) });
  }
  return withEnv(DEFAULT_SETTINGS);
}

// The WhatsApp number set in the admin wins; until then the one in the environment file is used.
function withEnv(s) {
  return { ...s, whatsapp: s.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '' };
}

export const getPackages = () => list('packages');
export const getPackage = (slug) => one('packages', slug);
export const getDestinations = () => list('destinations');
export const getDestination = (slug) => one('destinations', slug);
export const getPosts = () => list('posts');
export const getPost = (slug) => one('posts', slug);
export const getReels = () => list('reels');
export const getReviews = () => list('reviews');
export const getFaqs = () => list('faqs');
export const getExperiences = () => list('experiences');
export const getPlannerQuestions = () => list('planner_questions');

// Departures a traveller can still book (dated today or later, not sold out or cancelled), soonest first,
// each with the trip it belongs to. Past dates drop off by themselves when the page refreshes.
export async function getDepartures({ tripSlug, packages } = {}) {
  const [rows, trips] = await Promise.all([list('departures'), packages ? Promise.resolve(packages) : getPackages()]);
  const today = todayIST();
  const bySlug = Object.fromEntries(trips.map((p) => [p.slug, p]));
  return rows
    .filter((d) => isBookable(d, today) && bySlug[d.trip_slug] && (!tripSlug || d.trip_slug === tripSlug))
    .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0))
    .map((d) => {
      const t = bySlug[d.trip_slug];
      return {
        ...d,
        price: d.price ?? t.price,
        trip: { slug: t.slug, title: t.title, hero_image: t.hero_image, destination: t.destination, duration_label: t.duration_label, currency: t.currency || '₹' },
      };
    });
}

const POPUP_FIELDS = ['id', 'title', 'text', 'image', 'badge', 'button_label', 'link_type', 'link_url', 'link_trip', 'link_departure', 'starts_on', 'ends_on', 'pages', 'page_paths', 'delay_seconds', 'frequency'];
export async function getPopups() {
  const today = todayIST();
  const live = (await list('popups')).filter((p) => isPopupLive(p, today));
  if (!live.length) return [];
  // the button goes to a trip, a departure (the planner with that date filled in), WhatsApp or any link
  const deps = live.some((p) => p.link_type === 'departure') ? await list('departures') : [];
  return live
    .map((p) => {
      const out = Object.fromEntries(POPUP_FIELDS.map((k) => [k, p[k] ?? null]));
      if (p.link_type === 'trip') out.href = p.link_trip ? `/packages/${p.link_trip}` : null;
      else if (p.link_type === 'departure') {
        const d = deps.find((x) => x.id === p.link_departure);
        out.href = d && isBookable(d, today) ? `/book-a-trip?trip=${encodeURIComponent(d.trip_slug)}&dep=${encodeURIComponent(d.id)}` : null;
        if (!out.href) return null; // the date it advertised is gone, so the pop-up goes too
      } else if (p.link_type === 'url') out.href = /^(https?:\/\/|\/)/.test(p.link_url || '') ? p.link_url : null;
      return out;
    })
    .filter(Boolean);
}

// Navigation, footer and pop-ups need settings plus a few lists on every page.
export async function getLayoutProps() {
  const [settings, destinations, popups] = await Promise.all([getSettings(), getDestinations(), getPopups()]);
  return { settings, nav: { destinations: destinations.map(({ slug, name }) => ({ slug, name })) }, popups };
}

// Next.js props must be JSON: drops undefined values that came from optional DB columns.
export const json = (v) => JSON.parse(JSON.stringify(v ?? null));

// Standard getStaticProps return for public pages: layout data + page data, refreshed every REVALIDATE seconds.
export async function pageProps(data = {}) {
  const layout = await getLayoutProps();
  return { props: json({ ...layout, ...data }), revalidate: REVALIDATE };
}
