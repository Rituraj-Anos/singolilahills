import { Seo } from '../components/Layout.jsx';
import Pic from '../components/Pic.jsx';
import { CtaWindow, FaqList } from '../components/Sections.jsx';
import { getFaqs, pageProps } from '../lib/content.js';
import { markdown } from '../lib/format.js';

export default function About({ settings: s, faqs }) {
  return (
    <>
      <Seo settings={s} title="About us" description={s.intro_text} image={s.about_image} />
      <header className="page-head container">
        <h1>{s.about_title}</h1>
      </header>
      <section className="container section-tight" aria-label="Our story">
        <div className="split">
          <div className="split-photo">
            <Pic src={s.about_image} sizes="(max-width: 860px) 92vw, 50vw" alt="" decoding="async" />
          </div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: markdown(s.about_text) }} />
        </div>
      </section>
      <section className="section container" aria-labelledby="about-steps">
        <div className="section-head">
          <h2 id="about-steps">How a trip comes together</h2>
        </div>
        <ol className="steps-list" style={{ marginTop: 0 }}>
          {(s.steps || []).map((st, i) => (
            <li key={st.title}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <FaqList faqs={faqs} />
      <CtaWindow settings={s} />
    </>
  );
}

export async function getStaticProps() {
  return pageProps({ faqs: await getFaqs() });
}
