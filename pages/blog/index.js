import { PostCard } from '../../components/Cards.jsx';
import { Seo } from '../../components/Layout.jsx';
import { getPosts, pageProps } from '../../lib/content.js';

export default function Journal({ settings, posts }) {
  return (
    <>
      <Seo settings={settings} title="Journal" description="Permits, seasons, routes and stays: practical notes from our team in Darjeeling." />
      <header className="page-head container">
        <h1>Notes from the road</h1>
        <p className="lead">Permits, seasons, road conditions and the stays we like, written by the people who run the trips.</p>
      </header>
      <section className="container" aria-label="All stories" style={{ paddingBottom: 'var(--sp-9)' }}>
        {posts.length ? (
          <div className="post-grid">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        ) : (
          <p className="empty">The first stories are on their way.</p>
        )}
      </section>
    </>
  );
}

export async function getStaticProps() {
  return pageProps({ posts: await getPosts() });
}
