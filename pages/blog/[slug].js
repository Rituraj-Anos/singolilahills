import Link from 'next/link';
import { PostCard } from '../../components/Cards.jsx';
import { Seo } from '../../components/Layout.jsx';
import { CtaWindow } from '../../components/Sections.jsx';
import { getPost, getPosts, pageProps } from '../../lib/content.js';
import { dateLabel, markdown } from '../../lib/format.js';

export default function Post({ settings, post, more }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.image,
    datePublished: post.published_at,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: settings.brand_name },
  };
  return (
    <>
      <Seo settings={settings} title={post.title} description={post.summary} image={post.image} type="article" jsonLd={jsonLd} />
      <article>
        <header className="page-head container">
          <ol className="crumbs">
            <li>
              <Link href="/blog">Journal</Link>
            </li>
            {post.category && <li>{post.category}</li>}
          </ol>
          <h1>{post.title}</h1>
          <p className="lead">
            By {post.author}, {dateLabel(post.published_at)}
            {post.read_time ? `, ${post.read_time}` : ''}
          </p>
        </header>
        {post.image && (
          <div className="container">
            <div className="split-photo" style={{ aspectRatio: '21 / 9' }}>
              <img src={post.image} alt="" decoding="async" />
            </div>
          </div>
        )}
        {/* markdown() escapes all input before adding its own tags */}
        <div className="container section-tight">
          <div className="prose" style={{ marginInline: 'auto' }} dangerouslySetInnerHTML={{ __html: markdown(post.content) }} />
        </div>
      </article>
      {more.length > 0 && (
        <section className="section-tight container" aria-labelledby="more-title">
          <div className="section-head">
            <h2 id="more-title">Keep reading</h2>
          </div>
          <div className="post-grid">
            {more.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
      <CtaWindow settings={settings} />
    </>
  );
}

export async function getStaticPaths() {
  const all = await getPosts();
  return { paths: all.map((p) => ({ params: { slug: p.slug } })), fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  const post = await getPost(params.slug);
  if (!post) return { notFound: true, revalidate: 60 };
  const more = (await getPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);
  return pageProps({ post, more });
}
