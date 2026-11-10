import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en-IN">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.png" />
        <meta name="theme-color" content="#033D4A" />
        <link rel="preload" href="/fonts/P2duH7wVRqqnKRek7vOcXAA9g.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* marks JS as running before first paint, so scroll reveals never hide content for no-JS visitors */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
