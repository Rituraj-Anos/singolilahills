import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Nav from './Nav.jsx';
import Footer from './Footer.jsx';
import Icon from './Icon.jsx';
import { waLink } from '../lib/format.js';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

// Reveal-on-scroll for [data-reveal] and the altitude strip. Content is visible without JS (see site.css).
function useReveal(key) {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]:not(.is-in), .altitude:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -10% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
}

export function Seo({ settings, title, description, image, type = 'website', jsonLd, noindex }) {
  const { asPath } = useRouter();
  const fullTitle = title ? `${title} — ${settings.brand_name}` : settings.seo_title;
  const desc = description || settings.seo_description;
  const img = image || settings.og_image;
  const url = SITE_URL ? `${SITE_URL}${asPath.split(/[?#]/)[0]}` : null;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta key="description" name="description" content={desc} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:site_name" property="og:site_name" content={settings.brand_name} />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta key="og:description" property="og:description" content={desc} />
      {img && <meta key="og:image" property="og:image" content={img} />}
      {url && <meta key="og:url" property="og:url" content={url} />}
      {url && <link key="canonical" rel="canonical" href={url} />}
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      {noindex && <meta name="robots" content="noindex" />}
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify output is safe here once "<" is escaped
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </Head>
  );
}

export default function Layout({ settings, nav, children }) {
  const { asPath } = useRouter();
  useReveal(asPath);
  const wa = waLink(settings.whatsapp, `Hi ${settings.brand_name}, I would like to plan a trip.`);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav brand={settings.brand_name} />
      <main id="main">{children}</main>
      <Footer settings={settings} destinations={nav?.destinations} />
      {wa && (
        <a className="wa-float" href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
          <Icon name="whatsapp" />
        </a>
      )}
    </>
  );
}
