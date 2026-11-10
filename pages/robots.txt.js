export async function getServerSideProps({ req, res }) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.write(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`);
  res.end();
  return { props: {} };
}

export default function Robots() {
  return null;
}
