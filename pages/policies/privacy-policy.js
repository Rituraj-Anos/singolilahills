import { Seo } from '../../components/Layout.jsx';
import { pageProps } from '../../lib/content.js';
import { markdown } from '../../lib/format.js';

export function LegalPage({ settings, title, text }) {
  return (
    <>
      <Seo settings={settings} title={title} />
      <header className="page-head container">
        <h1>{title}</h1>
      </header>
      <section className="container" style={{ paddingBottom: 'var(--sp-9)' }}>
        <div className="prose" dangerouslySetInnerHTML={{ __html: markdown(text) }} />
      </section>
    </>
  );
}

export default function Privacy({ settings }) {
  return <LegalPage settings={settings} title="Privacy policy" text={settings.privacy_text} />;
}

export const getStaticProps = () => pageProps();
