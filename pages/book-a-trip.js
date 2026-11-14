import Planner from '../components/Planner.jsx';
import { Seo } from '../components/Layout.jsx';
import { getDepartures, getDestinations, getPackages, getPlannerQuestions, pageProps } from '../lib/content.js';
import { telLink, waLink } from '../lib/format.js';

export default function BookATrip({ settings: s, trips, destinations, questions, departures }) {
  const wa = waLink(s.whatsapp, `Hi ${s.brand_name}, I would like to plan a trip.`);
  const tel = telLink(s.phone);

  return (
    <>
      <Seo settings={s} title="Plan a trip" description="Tell us where, when and who. We suggest trips that fit, then reply with a day-by-day route and a price per person." />
      <header className="page-head container">
        <h1>{s.planner_title || 'Plan your trip in a minute.'}</h1>
        {s.planner_intro && <p className="lead">{s.planner_intro}</p>}
      </header>

      <section className="container" style={{ paddingBottom: 'var(--sp-9)' }}>
        <div className="form-shell">
          <div className="side">
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>Prefer to talk?</h2>
            <p className="muted" style={{ marginTop: 'var(--sp-3)' }}>
              {s.office_hours}. A real person answers.
            </p>
            <ul className="contact-list">
              {wa && (
                <li>
                  <small>WhatsApp</small>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    Message us
                  </a>
                </li>
              )}
              {tel && (
                <li>
                  <small>Phone</small>
                  <a href={tel}>{s.phone}</a>
                </li>
              )}
              {s.email && (
                <li>
                  <small>Email</small>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </li>
              )}
              {s.address && (
                <li>
                  <small>Office</small>
                  <span>{s.address}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="form-card">
            <Planner settings={s} trips={trips} destinations={destinations} questions={questions} departures={departures} />
          </div>
        </div>
      </section>
    </>
  );
}

export async function getStaticProps() {
  const [packages, dests, questions] = await Promise.all([getPackages(), getDestinations(), getPlannerQuestions()]);
  const departures = (await getDepartures({ packages })).map((d) => ({ id: d.id, trip_slug: d.trip_slug, trip_title: d.trip.title, start_date: d.start_date, end_date: d.end_date, price: d.price }));
  const trips = packages.map((p) => ({
    slug: p.slug,
    title: p.title,
    hero_image: p.hero_image,
    price: p.price,
    currency: p.currency,
    duration_days: p.duration_days,
    duration_label: p.duration_label,
    months: p.months || [],
    suitable_for: p.suitable_for || [],
    interests: p.interests || [],
  }));
  const destinations = dests.map((d) => ({ slug: d.slug, name: d.name, hero_image: d.hero_image, circuits: d.circuits || [] }));
  return pageProps({ trips, destinations, questions, departures });
}
