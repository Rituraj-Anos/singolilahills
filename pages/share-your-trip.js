import { useState } from 'react';
import ArrowButton from '../components/ArrowButton.jsx';
import Icon from '../components/Icon.jsx';
import { Seo } from '../components/Layout.jsx';
import { getPackages, pageProps } from '../lib/content.js';

const OTHER = 'Another trip';

export default function ShareYourTrip({ settings: s, trips }) {
  const [rating, setRating] = useState(0);
  const [state, setState] = useState({ status: 'idle', msg: '', errors: {} });

  async function submit(e) {
    e.preventDefault();
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), rating };
    setState({ status: 'busy', msg: '', errors: {} });
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return setState({ status: 'error', msg: out.error || 'Something went wrong. Please try again.', errors: out.fields || {} });
      setState({ status: 'done', msg: '', errors: {} });
    } catch {
      setState({ status: 'error', msg: 'No connection. Please try again.', errors: {} });
    }
  }

  const err = (k) => state.errors[k];
  const fp = (k) => ({ id: k, name: k, 'aria-invalid': err(k) ? 'true' : undefined, 'aria-describedby': err(k) ? `${k}-err` : undefined });

  return (
    <>
      <Seo settings={s} title="Share your trip" description="Travelled with us? Tell other travellers how it went." />
      <header className="page-head container">
        <h1>How was your trip?</h1>
        <p className="lead">Travelled with us? A few honest lines help other travellers choose. We read every review before it appears on the website.</p>
      </header>

      <section className="container" style={{ paddingBottom: 'var(--sp-9)' }}>
        <div className="form-card" style={{ maxWidth: '720px' }}>
          {state.status === 'done' ? (
            <div role="status" className="stack">
              <span className="icon-chip" style={{ marginBottom: 0 }}>
                <Icon name="check" />
              </span>
              <h2 style={{ fontSize: 'var(--fs-h3)' }}>Thank you for sharing your trip.</h2>
              <p className="muted">We check each review before it goes live, so it may take a day or two to appear.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="form-grid">
                <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="label">Your rating</legend>
                  <div className="pick-row">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <label key={n} className="pick">
                        <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
                        <span>
                          {n}
                          <Icon name="star" />
                          <span className="sr-only"> stars</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {err('rating') && <p className="error">{err('rating')}</p>}
                </fieldset>
                <div className="field">
                  <label htmlFor="author">Your name</label>
                  <input {...fp('author')} required autoComplete="name" maxLength={60} />
                  {err('author') && <p className="error" id="author-err">{err('author')}</p>}
                </div>
                <div className="field">
                  <label htmlFor="location">Where are you from? (optional)</label>
                  <input {...fp('location')} maxLength={60} autoComplete="address-level2" />
                </div>
                <div className="field full">
                  <label htmlFor="trip">Which trip did you take? (optional)</label>
                  <select {...fp('trip')} defaultValue="">
                    <option value="">Choose a trip</option>
                    {trips.map((t) => (
                      <option key={t.slug}>{t.title}</option>
                    ))}
                    <option>{OTHER}</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="comment">Your review</label>
                  <textarea {...fp('comment')} required maxLength={800} />
                  <p className="hint">What stood out? Your guide, the stays, the views, the food. Up to 800 characters.</p>
                  {err('comment') && <p className="error" id="comment-err">{err('comment')}</p>}
                </div>
                <div className="field full">
                  <label htmlFor="contact">Phone or email (optional, private)</label>
                  <input {...fp('contact')} maxLength={120} autoComplete="email" />
                  <p className="hint">Only the team sees this. It helps us confirm you travelled with us. It is never shown on the website.</p>
                </div>
                <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                {state.status === 'error' && (
                  <p className="notice bad full" role="alert">
                    {state.msg}
                  </p>
                )}
                <div className="full">
                  <ArrowButton type="submit" disabled={state.status === 'busy'}>
                    {state.status === 'busy' ? 'Sending' : 'Send my review'}
                  </ArrowButton>
                  <p className="hint" style={{ marginTop: 'var(--sp-3)' }}>
                    By sending, you agree we may show your name, city and review on our website.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export async function getStaticProps() {
  const trips = (await getPackages()).map(({ slug, title }) => ({ slug, title }));
  return pageProps({ trips });
}
