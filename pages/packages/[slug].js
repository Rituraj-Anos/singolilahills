import Link from 'next/link';
import ArrowButton from '../../components/ArrowButton.jsx';
import Icon from '../../components/Icon.jsx';
import Pic from '../../components/Pic.jsx';
import Slider from '../../components/Slider.jsx';
import { ReelCard, TripCard } from '../../components/Cards.jsx';
import { Seo } from '../../components/Layout.jsx';
import { AltitudeStrip, CtaWindow, FaqList } from '../../components/Sections.jsx';
import { getPackage, getPackages, getReels, pageProps } from '../../lib/content.js';
import { money, waLink } from '../../lib/format.js';

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

export default function Trip({ settings: s, pkg, related, reels }) {
  const wa = waLink(s.whatsapp, pkg.whatsapp_text || `Hi ${s.brand_name}, I am interested in ${pkg.title}. Please share availability.`);
  const facts = [
    ['Duration', pkg.duration_label],
    ['Difficulty', pkg.difficulty],
    ['Best season', pkg.best_season],
    ['Highest point', pkg.max_altitude],
    ['Pickup and drop', pkg.pickup_drop],
    ['Vehicle', pkg.vehicle],
  ].filter(([, v]) => v);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: pkg.title,
    description: pkg.tagline || pkg.overview,
    image: pkg.hero_image,
    touristType: pkg.category,
    itinerary: {
      '@type': 'ItemList',
      itemListElement: (pkg.itinerary || []).map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.title })),
    },
    offers: { '@type': 'Offer', price: pkg.price, priceCurrency: 'INR' },
    provider: { '@type': 'TravelAgency', name: s.brand_name },
  };

  return (
    <>
      <Seo settings={s} title={pkg.title} description={pkg.tagline} image={pkg.hero_image} jsonLd={jsonLd} />
      <section className="hero trip-hero" aria-labelledby="trip-title">
        <div className="hero-panel">
          <div className="hero-media">
            <Pic src={pkg.hero_image} sizes="100vw" alt="" fetchPriority="high" decoding="async" />
          </div>
          <span className="hero-veil" aria-hidden="true" />
          <div className="hero-row">
            <div className="hero-copy">
              <ol className="crumbs" data-load>
                <li>
                  <Link href="/packages">Trips</Link>
                </li>
                <li>{pkg.destination}</li>
              </ol>
              <h1 id="trip-title" data-load style={{ '--i': 1 }}>
                {pkg.title}
              </h1>
              {pkg.tagline && (
                <p className="hero-text" data-load style={{ '--i': 2 }}>
                  {pkg.tagline}
                </p>
              )}
              <div className="hero-actions chips" data-load style={{ '--i': 3 }}>
                <span className="chip">{pkg.duration_label}</span>
                {pkg.category && <span className="chip">{pkg.category}</span>}
                {pkg.badge && <span className="chip">{pkg.badge}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container section">
        <div className="trip-layout">
          <div>
            {facts.length > 0 && (
              <dl className="key-facts">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            <section className="trip-block" aria-labelledby="overview-title">
              <h2 id="overview-title">Overview</h2>
              <p className="prose">{pkg.overview}</p>
              {pkg.highlights?.length > 0 && (
                <div style={{ marginTop: 'var(--sp-6)' }}>
                  <Ticks items={pkg.highlights} />
                </div>
              )}
            </section>

            {pkg.itinerary?.length > 0 && (
              <div className="trip-block">
                <AltitudeStrip itinerary={pkg.itinerary} />
              </div>
            )}

            {pkg.itinerary?.length > 0 && (
              <section className="trip-block" aria-labelledby="itinerary-title">
                <h2 id="itinerary-title">Day by day</h2>
                <div className="days">
                  {pkg.itinerary.map((d, i) => (
                    <details key={d.day ?? i} className="day" open={i === 0}>
                      <summary>
                        <span className="d">Day {d.day ?? i + 1}</span>
                        <span className="t">{d.title}</span>
                        <span className="faq-toggle" aria-hidden="true" />
                      </summary>
                      <div className="body">
                        {d.image && <Pic className="day-photo" src={d.image} sizes="(max-width: 960px) 92vw, 600px" alt="" loading="lazy" decoding="async" width="800" height="450" />}
                        <p>{d.description}</p>
                        <div className="meta">
                          {d.altitude && <span className="chip chip-plain">{d.altitude}</span>}
                          {d.stay && <span className="chip chip-plain">Stay: {d.stay}</span>}
                          {d.meals && <span className="chip chip-plain">Meals: {d.meals}</span>}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {(pkg.inclusions?.length > 0 || pkg.exclusions?.length > 0) && (
              <section className="trip-block two-col" aria-label="What the price covers">
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
              <section className="trip-block" aria-labelledby="permits-title">
                <h2 id="permits-title">Permits</h2>
                <p className="prose">{pkg.permits_info}</p>
              </section>
            )}

            {pkg.gallery?.length > 0 && (
              <section className="trip-block" aria-labelledby="gallery-title">
                <h2 id="gallery-title">On the route</h2>
                <div className="gallery">
                  {pkg.gallery.map((src) => (
                    <Pic key={src} src={src} sizes="(max-width: 640px) 46vw, 300px" alt="" loading="lazy" decoding="async" width="600" height="450" />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="book-card" aria-label="Price and booking">
            <p className="from">From</p>
            <p className="amount">{money(pkg.price, pkg.currency)}</p>
            <p className="per">per person, {pkg.duration_label}</p>
            <div className="actions">
              <ArrowButton href={`/book-a-trip?trip=${encodeURIComponent(pkg.slug)}`}>Enquire about this trip</ArrowButton>
              <Link href={`/packages/${pkg.slug}/itinerary?download=1`} className="btn-ghost">
                Download itinerary (PDF)
              </Link>
              {wa && (
                <a className="btn-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" />
                  Ask on WhatsApp
                </a>
              )}
            </div>
            <ul>
              <li>Price confirmed in writing before you pay anything.</li>
              {pkg.pickup_drop && <li>Starts and ends at {pkg.pickup_drop}.</li>}
            </ul>
          </aside>
        </div>
      </div>

      {pkg.faqs?.length > 0 && <FaqList faqs={pkg.faqs} title="Questions about this trip" />}

      {reels.length > 0 && (
        <section className="section-tight container" aria-labelledby="reels-title">
          <div className="section-head">
            <h2 id="reels-title">Watch it first</h2>
          </div>
          <div className="reel-grid">
            {reels.map((r) => (
              <ReelCard key={r.id} reel={r} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section container" aria-labelledby="related-title">
          <Slider label="You might also like" cols={3} head={<h2 id="related-title">You might also like</h2>}>
            {related.map((p) => (
              <TripCard key={p.slug} pkg={p} />
            ))}
          </Slider>
        </section>
      )}

      <CtaWindow settings={s} />
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
  const [all, reels] = await Promise.all([getPackages(), getReels()]);
  const related = all.filter((p) => p.slug !== pkg.slug && (p.region === pkg.region || p.featured)).slice(0, 3);
  const key = (pkg.destination || '').split(/[\s&,]/)[0].toLowerCase();
  const matching = reels.filter((r) => key && (r.destination || '').toLowerCase().includes(key)).slice(0, 4);
  return pageProps({ pkg, related, reels: matching });
}
