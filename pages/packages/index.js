import { useRouter } from 'next/router';
import { Seo } from '../../components/Layout.jsx';
import { CtaWindow, TripFinder } from '../../components/Sections.jsx';
import { getPackages, pageProps } from '../../lib/content.js';

export default function Trips({ settings, packages }) {
  const { query } = useRouter();
  const style = typeof query.style === 'string' ? query.style : '';
  const region = typeof query.region === 'string' ? query.region : '';
  return (
    <>
      <Seo
        settings={settings}
        title="All trips"
        description="Every Shingolia Hills trip across Darjeeling, Sikkim, Sandakphu and the Dooars, with days, style and price per person."
      />
      <header className="page-head container">
        <h1>Trips across the Eastern Himalaya</h1>
        <p className="lead">
          {packages.length} routes, each with a local team, permits arranged and one price per person. Filter by region or style.
        </p>
      </header>
      <section className="container" aria-label="Trip list" style={{ paddingBottom: 'var(--sp-9)' }}>
        <TripFinder
          key={`${style}|${region}`}
          packages={packages}
          headingLevel={2}
          initialStyle={style}
          initialRegion={region}
        />
      </section>
      <CtaWindow settings={settings} title="Not sure which one fits?" text="Tell us your dates and who is travelling. We will suggest a route and send a price." />
    </>
  );
}

export async function getStaticProps() {
  return pageProps({ packages: await getPackages() });
}
