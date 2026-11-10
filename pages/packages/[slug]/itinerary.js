import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Icon from '../../../components/Icon.jsx';
import { Seo } from '../../../components/Layout.jsx';
import { AltitudeStrip } from '../../../components/Sections.jsx';
import { getPackage, getPackages, pageProps } from '../../../lib/content.js';
import { money } from '../../../lib/format.js';

function Ticks({ items, cross }) {
  if (!items?.length) return null;
  return (
    <ul className={`tick-list${cross ? ' cross' : ''}`}>
      {items.map((t) => (
        <li key={t}>
          <Icon name={cross ? 'cross' : 'check'} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// A print-ready document: the browser's "Save as PDF" turns it into a file with all text and photos.
export default function Itinerary({ settings: s, pkg }) {
  const { query } = useRouter();

  // ?download=1 opens the print window once every photo has loaded
  useEffect(() => {
    if (query.download !== '1') return;
    let cancelled = false;
    const imgs = [...document.querySelectorAll('.itin-doc img')];
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => {
      if (!cancelled) setTimeout(() => window.print(), 300);
    });
    return () => {
      cancelled = true;
    };
  }, [query.download]);

  const facts = [
    ['Duration', pkg.duration_label],
    ['Difficulty', pkg.difficulty],
    ['Best season', pkg.best_season],
    ['Highest point', pkg.max_altitude],
    ['Pickup and drop', pkg.pickup_drop],
    ['Vehicle', pkg.vehicle],
  ].filter(([, v]) => v);
  const contact = [s.phone, s.whatsapp && `WhatsApp +${String(s.whatsapp).replace(/\D/g, '')}`, s.email].filter(Boolean);

  return (
    <>
      <Seo settings={s} title={`${pkg.title}: itinerary`} description={pkg.tagline} image={pkg.hero_image} noindex />
      <div className="container itin-bar no-print">
        <div className="inner">
          <div>
            <Link href={`/packages/${pkg.slug}`} className="text-link">
              Back to the trip
            </Link>
            <p>The print window opens when you press the button. Choose Save as PDF as the destination to get a file with all text and photos.</p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      </div>

      <div className="container">
        <article className="itin-doc">
          <header className="itin-head">
            <strong>{s.brand_name}</strong>
            <span>{contact.join('  ·  ')}</span>
          </header>

          <img className="itin-cover" src={pkg.hero_image} alt="" loading="eager" />
          <h1>{pkg.title}</h1>
          {pkg.tagline && <p className="tagline">{pkg.tagline}</p>}

          {facts.length > 0 && (
            <section className="itin-block">
              <dl className="key-facts">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="itin-block">
            <h2>Overview</h2>
            <p className="prose">{pkg.overview}</p>
            {pkg.highlights?.length > 0 && (
              <div style={{ marginTop: 'var(--sp-5)' }}>
                <Ticks items={pkg.highlights} />
              </div>
            )}
          </section>

          {pkg.itinerary?.length > 0 && (
            <section className="itin-block">
              <AltitudeStrip itinerary={pkg.itinerary} />
            </section>
          )}

          {pkg.itinerary?.length > 0 && (
            <section className="itin-block">
              <h2>Day by day</h2>
              {pkg.itinerary.map((d, i) => (
                <div key={d.day ?? i} className="itin-day">
                  <p className="d">Day {d.day ?? i + 1}</p>
                  <h3>{d.title}</h3>
                  <p>{d.description}</p>
                  <div className="chips" style={{ marginTop: 'var(--sp-3)' }}>
                    {d.altitude && <span className="chip chip-plain">{d.altitude}</span>}
                    {d.stay && <span className="chip chip-plain">Stay: {d.stay}</span>}
                    {d.meals && <span className="chip chip-plain">Meals: {d.meals}</span>}
                  </div>
                  {d.image && <img src={d.image} alt="" loading="eager" />}
                </div>
              ))}
            </section>
          )}

          {pkg.gallery?.length > 0 && (
            <section className="itin-block">
              <h2>On the route</h2>
              <div className="gallery">
                {pkg.gallery.map((src) => (
                  <img key={src} src={src} alt="" loading="eager" width="600" height="450" />
                ))}
              </div>
            </section>
          )}

          {(pkg.inclusions?.length > 0 || pkg.exclusions?.length > 0) && (
            <section className="itin-block two-col">
              <div>
                <h3>Included</h3>
                <Ticks items={pkg.inclusions} />
              </div>
              <div>
                <h3>Not included</h3>
                <Ticks items={pkg.exclusions} cross />
              </div>
            </section>
          )}

          {pkg.permits_info && (
            <section className="itin-block">
              <h2>Permits</h2>
              <p className="prose">{pkg.permits_info}</p>
            </section>
          )}

          {pkg.faqs?.length > 0 && (
            <section className="itin-block">
              <h2>Good to know</h2>
              <dl className="itin-faq">
                {pkg.faqs.map((f) => (
                  <div key={f.q}>
                    <dt>{f.q}</dt>
                    <dd>{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <footer className="itin-foot">
            <strong style={{ color: 'var(--c-ink)', fontSize: '1.25rem' }}>
              From {money(pkg.price, pkg.currency)} per person
            </strong>
            <span>Price and availability are confirmed in writing by our team before you pay anything.</span>
            {contact.length > 0 && <span>{contact.join('  ·  ')}</span>}
            {s.address && <span>{s.address}</span>}
          </footer>
        </article>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  const all = await getPackages();
  return { paths: all.map((p) => ({ params: { slug: p.slug } })), fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const pkg = await getPackage(params.slug);
  if (!pkg) return { notFound: true, revalidate: 60 };
  return pageProps({ pkg });
}
