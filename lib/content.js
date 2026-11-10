// Every page reads content through here. Supabase when configured, the bundled files otherwise,
// so the site still builds and runs before the client's database exists.
import { supabase } from './supabase.js';
import { PACKAGES } from './data/packages.js';
import { DESTINATIONS } from './data/destinations.js';
import { BLOGS } from './data/blogs.js';
import { REELS } from './data/reels.js';
import { DEFAULT_SETTINGS, FAQS } from './data/settings.js';

// How often a static page re-checks the database (seconds). Admin saves also refresh pages instantly.
export const REVALIDATE = 300;

const local = {
  packages: PACKAGES.map((p, i) => ({ published: true, sort_order: i, ...p })),
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
};

async function list(table) {
  if (supabase) {
    const [col, asc] = ORDER[table];
    const { data, error } = await supabase.from(table).select('*').eq('published', true).order(col, { ascending: asc });
    if (error) throw new Error(`[content] ${table}: ${error.message}`);
    return data;
  }
  return local[table].filter((r) => r.published !== false);
}

async function one(table, slug) {
  if (supabase) {
    const { data, error } = await supabase.from(table).select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (error) throw new Error(`[content] ${table}/${slug}: ${error.message}`);
    return data;
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

// Navigation and footer need settings plus a few lists on every page.
export async function getLayoutProps() {
  const [settings, destinations] = await Promise.all([getSettings(), getDestinations()]);
  return { settings, nav: { destinations: destinations.map(({ slug, name }) => ({ slug, name })) } };
}

// Next.js props must be JSON: drops undefined values that came from optional DB columns.
export const json = (v) => JSON.parse(JSON.stringify(v ?? null));

// Standard getStaticProps return for public pages: layout data + page data, refreshed every REVALIDATE seconds.
export async function pageProps(data = {}) {
  const layout = await getLayoutProps();
  return { props: json({ ...layout, ...data }), revalidate: REVALIDATE };
}
