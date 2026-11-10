import { DestCard } from '../../components/Cards.jsx';
import { Seo } from '../../components/Layout.jsx';
import { CtaWindow } from '../../components/Sections.jsx';
import { getDestinations, pageProps } from '../../lib/content.js';

export default function Destinations({ settings, destinations }) {
  return (
    <>
      <Seo settings={settings} title="Destinations" description="Sandakphu, Darjeeling, Sikkim and the Dooars: the places we plan trips to, with best seasons and altitudes." />
      <header className="page-head container">
        <h1>Places we know by heart</h1>
        <p className="lead">From the Singalila Ridge to the rhino grasslands of the Dooars, each region with its season, altitude and the trips that go there.</p>
      </header>
      <section className="container" aria-label="Destination list" style={{ paddingBottom: 'var(--sp-9)' }}>
        <ul className="dest-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {destinations.map((d, i) => (
            <li key={d.slug} data-reveal style={{ '--i': i % 3 }}>
              <DestCard dest={d} />
            </li>
          ))}
        </ul>
      </section>
      <CtaWindow settings={settings} />
    </>
  );
}

export async function getStaticProps() {
  return pageProps({ destinations: await getDestinations() });
}
