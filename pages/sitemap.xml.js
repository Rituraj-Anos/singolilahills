import { getDestinations, getPackages, getPosts } from '../lib/content.js';

const STATIC = ['/', '/packages', '/destinations', '/blog', '/about', '/book-a-trip', '/share-your-trip', '/policies/privacy-policy', '/policies/terms-conditions'];

export async function getServerSideProps({ req, res }) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  const [packages, destinations, posts] = await Promise.all([getPackages(), getDestinations(), getPosts()]);
  const urls = [
    ...STATIC,
    ...packages.map((p) => `/packages/${p.slug}`),
    ...destinations.map((d) => `/destinations/${d.slug}`),
    ...posts.map((p) => `/blog/${p.slug}`),
  ];
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
      .map((u) => `<url><loc>${base}${u}</loc></url>`)
      .join('')}</urlset>`
  );
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
