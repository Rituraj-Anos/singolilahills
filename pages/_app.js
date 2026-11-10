import '../styles/site.css';
import '../styles/admin.css';
import Head from 'next/head';
import Layout from '../components/Layout.jsx';

export default function App({ Component, pageProps }) {
  const page = (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
  // Admin screens bring their own shell; public pages get nav, footer and WhatsApp button.
  if (Component.admin || !pageProps.settings) return page;
  return (
    <Layout settings={pageProps.settings} nav={pageProps.nav}>
      {page}
    </Layout>
  );
}
