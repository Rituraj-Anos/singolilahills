import { LegalPage } from './privacy-policy.js';
import { pageProps } from '../../lib/content.js';

export default function Terms({ settings }) {
  return <LegalPage settings={settings} title="Terms and conditions" text={settings.terms_text} />;
}

export const getStaticProps = () => pageProps();
