import Link from 'next/link';
import Icon from '../../components/Icon.jsx';
import Pic from '../../components/Pic.jsx';
import Slider from '../../components/Slider.jsx';
import { TripCard } from '../../components/Cards.jsx';
import { Seo } from '../../components/Layout.jsx';
import { CtaWindow } from '../../components/Sections.jsx';
import { getDestination, getDestinations, getPackages, pageProps } from '../../lib/content.js';

export default function Destination({ settings, dest, trips }) {
  const facts = [
    ['Best time', dest.best_time],
    ['Altitude', dest.altitude],
  ].filter(([, v]) => v);
  return (
    <>
      <Seo settings={settings} title={dest.name} description={dest.tagline} image={dest.hero_image} />
      <section className="hero trip-hero" aria-labelledby="dest-title">
        <div className="hero-panel">
          <div className="hero-media">
            <Pic src={dest.hero_image} sizes="100vw" alt="" fetchPriority="high" decoding="async" />
          </div>
          <span className="hero-veil" aria-hidden="true" />
          <div className="hero-row">
            <div className="hero-copy">
              <ol className="crumbs" data-load>
                <li>
                  <Link href="/destinations">Destinations</Link>
                </li>
                <li>{dest.name}</li>
              </ol>
              <h1 id="dest-title" data-load style={{ '--i': 1 }}>
                {dest.name}
              </h1>
              {dest.tagline && (
                <p className="hero-text" data-load style={{ '--i': 2 }}>
                  {dest.tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section container" aria-label="About this place">
        <div className="split">
          <div className="stack">
            <p className="prose">{dest.description}</p>
            {facts.length > 0 && (
              <dl className="key-facts" style={{ marginBottom: 0 }}>
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {dest.attractions?.length > 0 && (
            <div className="facts">
              <h2 style={{ fontSize: 'var(--fs-h3)', marginBottom: 'var(--sp-5)' }}>What you will see</h2>
              <ul className="tick-list">
                {dest.attractions.map((a) => (
                  <li key={a}>
                    <Icon name="check" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {trips.length > 0 && (
        <section className="section-tight container" aria-labelledby="dest-trips">
          <Slider label="Trips that go here" cols={3} head={<h2 id="dest-trips">Trips that go here</h2>}>
            {trips.map((p) => (
              <TripCard key={p.slug} pkg={p} />
            ))}
          </Slider>
        </section>
      )}
      <CtaWindow settings={settings} />
    </>
  );
}

export async function getStaticPaths() {
  const all = await getDestinations();
  return { paths: all.map((d) => ({ params: { slug: d.slug } })), fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const dest = await getDestination(params.slug);
  if (!dest) return { notFound: true, revalidate: 60 };
  const all = await getPackages();
  const trips = all.filter((p) => (dest.circuits || []).includes(p.slug));
  return pageProps({ dest, trips });
}
