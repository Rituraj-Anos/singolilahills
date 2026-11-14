import Link from 'next/link';
import { DeparturesByMonth } from '../components/Departures.jsx';
import { Seo } from '../components/Layout.jsx';
import { CtaWindow } from '../components/Sections.jsx';
import { getDepartures, pageProps } from '../lib/content.js';

export default function UpcomingTrips({ settings, departures }) {
  return (
    <>
      <Seo settings={settings} title="Upcoming trips" description="Fixed-date departures across Darjeeling, Sikkim, Sandakphu and the Dooars, with the price per person and seats left." />
      <header className="page-head container">
        <h1>Upcoming trips</h1>
        <p className="lead">Set dates you can join. Pick one and we hold your seat while we confirm the details with you.</p>
      </header>
      <section className="container" aria-label="Departures" style={{ paddingBottom: 'var(--sp-9)' }}>
        {departures.length ? (
          <DeparturesByMonth departures={departures} />
        ) : (
          <p className="empty">
            No fixed dates are open right now. Every trip also runs on the dates you choose: <Link href="/book-a-trip">plan yours</Link>.
          </p>
        )}
      </section>
      <CtaWindow settings={settings} title="None of these dates work?" text="Tell us when you can travel. Every trip also runs privately on your own dates." />
    </>
  );
}

export async function getStaticProps() {
  return pageProps({ departures: await getDepartures() });
}
