import Link from 'next/link';
import ArrowButton from '../components/ArrowButton.jsx';
import { Seo } from '../components/Layout.jsx';
import { pageProps } from '../lib/content.js';

export default function NotFound({ settings }) {
  return (
    <>
      <Seo settings={settings} title="Page not found" noindex />
      <section className="lost">
        <div>
          <h1>This trail ends here.</h1>
          <p className="lead" style={{ marginInline: 'auto' }}>
            The page may have moved or the link is old. The trips are still where you left them.
          </p>
          <div className="actions">
            <ArrowButton href="/packages">See all trips</ArrowButton>
            <Link href="/" className="btn-ghost">
              Home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export const getStaticProps = () => pageProps();
