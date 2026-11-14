import Link from 'next/link';
import ArrowButton from '../components/ArrowButton.jsx';
import Icon from '../components/Icon.jsx';
import Pic from '../components/Pic.jsx';
import DestCarousel from '../components/DestCarousel.jsx';
import { PostCard, ReviewCard } from '../components/Cards.jsx';
import { CtaWindow, ExperienceRow, FaqList, Statement, Ticker, TravelStyles, TripFinder } from '../components/Sections.jsx';
import { Seo } from '../components/Layout.jsx';
import { getDepartures, getDestinations, getExperiences, getFaqs, getPackages, getPosts, getReviews, pageProps } from '../lib/content.js';
import { DepartureCard } from '../components/Departures.jsx';
import { money } from '../lib/format.js';

const INCLUDED_ICONS = ['guide', 'stay', 'car', 'permit'];

export default function Home({ settings: s, packages, destinations, experiences, departures = [], posts, reviews, faqs }) {
  const featured = packages.find((p) => p.featured) || packages[0];
  const half = Math.ceil(reviews.length / 2);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: s.brand_name,
    description: s.seo_description,
    image: s.og_image,
    address: { '@type': 'PostalAddress', addressLocality: s.address, addressCountry: 'IN' },
    ...(s.phone && { telephone: s.phone }),
    ...(s.email && { email: s.email }),
  };

  return (
    <>
      <Seo settings={s} jsonLd={jsonLd} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-panel">
          <div className="hero-media">
            <Pic src={s.hero_image} sizes="100vw" alt="" fetchPriority="high" decoding="async" />
          </div>
          <span className="hero-veil" aria-hidden="true" />
          <div className="hero-row">
            <div className="hero-copy">
              {s.hero_badge && (
                <p className="hero-badge" data-load style={{ '--i': 0 }}>
                  {s.hero_badge}
                </p>
              )}
              <h1 id="hero-title" data-load style={{ '--i': 1 }}>
                {s.hero_title}
              </h1>
              <p className="hero-text" data-load style={{ '--i': 2 }}>
                {s.hero_text}
              </p>
              <div className="hero-actions" data-load style={{ '--i': 3 }}>
                <ArrowButton href="/book-a-trip">Plan a trip</ArrowButton>
                <Link href="/packages" className="btn-ghost">
                  Explore trips
                </Link>
              </div>
            </div>
            {featured && (
              <Link href={`/packages/${featured.slug}`} className="hero-feature" data-load style={{ '--i': 4 }}>
                <img src={featured.hero_image} alt="" decoding="async" width="76" height="76" />
                <span>
                  <small>Featured trip</small>
                  <strong>{featured.title}</strong>
                  <small>
                    {featured.duration_label}, from {money(featured.price, featured.currency)}
                  </small>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <Statement text={s.statement} />

      <section className="section-tight" aria-labelledby="intro-title">
        <div className="container intro-grid">
          <div className="intro-copy" data-reveal>
            <h2 id="intro-title">{s.intro_title}</h2>
            <p className="lead">{s.intro_text}</p>
            <ArrowButton href="/about" variant="dark">
              Our story
            </ArrowButton>
          </div>
          <div className="intro-photo" data-reveal style={{ '--i': 1 }}>
            <Pic src={s.intro_image} sizes="(max-width: 860px) 92vw, 45vw" alt="" loading="lazy" decoding="async" />
          </div>
          <div className="facts" data-reveal style={{ '--i': 2 }}>
            <dl>
              {(s.facts || []).map((f) => (
                <div className="fact-row" key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            {s.intro_note && <p className="facts-note">{s.intro_note}</p>}
          </div>
        </div>
      </section>

      {destinations.length > 0 && (
        <section className="section" aria-labelledby="dest-title">
          <DestCarousel
            items={destinations}
            title="Where we travel"
            titleId="dest-title"
            actions={
              <Link href="/destinations" className="btn-ghost">
                All destinations
              </Link>
            }
          />
        </section>
      )}

      {departures.length > 0 && (
        <section className="section-tight container" aria-labelledby="dep-title">
          <div className="section-head">
            <h2 id="dep-title">Upcoming departures</h2>
            <Link href="/upcoming-trips" className="btn-ghost">
              All dates
            </Link>
          </div>
          <div className="dep-grid">
            {departures.map((d) => (
              <DepartureCard key={d.id} d={d} />
            ))}
          </div>
        </section>
      )}

      {experiences.length > 0 && (
        <section className="section-tight container" aria-labelledby="exp-title">
          <ExperienceRow experiences={experiences} />
        </section>
      )}

      <section className="section-tight" aria-labelledby="trips-title">
        <div className="container">
          <div className="section-head">
            <h2 id="trips-title">Pick your route</h2>
            <p>Filter by region or travel style. Every price covers transport, stays, permits and most meals on the route.</p>
          </div>
          <TripFinder packages={packages} limit={6} swipe />
        </div>
      </section>

      <TravelStyles packages={packages} />

      <section className="section" aria-labelledby="how-title">
        <div className="container steps-grid">
          <div className="steps-photo" data-reveal>
            <Pic src={s.steps_image} sizes="(max-width: 860px) 92vw, 40vw" alt="" loading="lazy" decoding="async" />
          </div>
          <div data-reveal style={{ '--i': 1 }}>
            <h2 id="how-title" style={{ fontSize: 'var(--fs-h2)' }}>
              How planning works
            </h2>
            <ol className="steps-list">
              {(s.steps || []).map((st, i) => (
                <li key={st.title}>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{st.title}</h3>
                    <p>{st.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/about" className="btn-ghost">
              About our team
            </Link>
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="section-tight reviews" aria-labelledby="reviews-title">
          <div className="container section-head">
            <h2 id="reviews-title">From travellers who went with us</h2>
            <Link href="/share-your-trip" className="btn-ghost">
              Share your trip
            </Link>
          </div>
          <Ticker items={reviews.slice(0, half)} duration={70} label="Reviews" render={(r) => <ReviewCard review={r} />} />
          {reviews.length > 3 && (
            <Ticker items={reviews.slice(half)} duration={80} reverse label="More reviews" render={(r) => <ReviewCard review={r} />} />
          )}
        </section>
      )}

      <section className="section" aria-labelledby="included-title">
        <div className="container">
          <div className="section-head">
            <h2 id="included-title">What every price covers</h2>
          </div>
          <div className="included-grid">
            <div className="included-photo" data-reveal>
              <Pic src={s.included_image} sizes="(max-width: 860px) 92vw, 45vw" alt="" loading="lazy" decoding="async" />
            </div>
            <div className="included-cells">
              {(s.included || []).map((it, i) => (
                <div className="included-cell" key={it.title} data-reveal style={{ '--i': i }}>
                  <span className="icon-chip">
                    <Icon name={INCLUDED_ICONS[i % INCLUDED_ICONS.length]} />
                  </span>
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="section-tight" aria-labelledby="journal-title">
          <div className="container">
            <div className="section-head">
              <h2 id="journal-title">From the journal</h2>
              <Link href="/blog" className="btn-ghost">
                All stories
              </Link>
            </div>
            <div className="post-grid is-compact">
              {posts.slice(0, 3).map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <FaqList faqs={faqs} />
      <CtaWindow settings={s} />
    </>
  );
}

export async function getStaticProps() {
  const [packages, destinations, experiences, posts, reviews, faqs] = await Promise.all([
    getPackages(),
    getDestinations(),
    getExperiences(),
    getPosts(),
    getReviews(),
    getFaqs(),
  ]);
  // destination cards show how many things there are to do at each place
  const counted = destinations.map((d) => ({ ...d, things: experiences.filter((e) => e.destination === d.slug).length }));
  const departures = (await getDepartures({ packages })).slice(0, 6);
  return pageProps({ packages, destinations: counted, experiences, departures, posts, reviews, faqs });
}
