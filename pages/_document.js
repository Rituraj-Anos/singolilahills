import { Html, Head, Main, NextScript } from 'next/document';
import { THEME_SCRIPT } from '../lib/theme.js';

export default function Document() {
  return (
    <Html lang="en-IN">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.png" />
        <meta name="theme-color" content="#f5f4f0" />
        <link rel="preload" href="/fonts/P2duH7wVRqqnKRek7vOcXAA9g.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* before first paint: sets the saved or device theme (no flash), and marks JS as running so scroll reveals never hide content for no-JS visitors */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
