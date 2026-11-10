import { useRouter } from 'next/router';
import { useState } from 'react';
import ArrowButton from '../components/ArrowButton.jsx';
import Icon from '../components/Icon.jsx';
import { Seo } from '../components/Layout.jsx';
import { getPackages, pageProps } from '../lib/content.js';
import { telLink, waLink } from '../lib/format.js';

const GROUP = ['1', '2', '3 to 4', '5 to 8', '9 or more'];
const CUSTOM = 'A custom trip';

export default function BookATrip({ settings: s, trips }) {
  const { query } = useRouter();
  const [picked, setTrip] = useState(null);
  // until the visitor picks, preselect the trip they came from (?trip=slug)
  const trip = picked ?? (trips.find((t) => t.slug === query.trip)?.title || CUSTOM);
  const [state, setState] = useState({ status: 'idle', msg: '', errors: {} });
  const wa = waLink(s.whatsapp, `Hi ${s.brand_name}, I would like to plan a trip.`);
  const tel = telLink(s.phone);

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(f.entries());
    setState({ status: 'busy', msg: '', errors: {} });
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: 'error', msg: out.error || 'Something went wrong. Please try WhatsApp instead.', errors: out.fields || {} });
        return;
      }
      setState({ status: 'done', msg: '', errors: {} });
    } catch {
      setState({ status: 'error', msg: 'No connection. Please try again, or message us on WhatsApp.', errors: {} });
    }
  }

  const err = (k) => state.errors[k];
  const fieldProps = (k) => ({
    id: k,
    name: k,
    'aria-invalid': err(k) ? 'true' : undefined,
    'aria-describedby': err(k) ? `${k}-err` : undefined,
  });

  return (
    <>
      <Seo settings={s} title="Plan a trip" description="Send us your dates and group size. We reply with a day-by-day route and a price per person." />
      <header className="page-head container">
        <h1>Tell us where you want to go.</h1>
        <p className="lead">Send a rough idea, dates and group size. We reply with a first route and a price per person.</p>
      </header>

      <section className="container" style={{ paddingBottom: 'var(--sp-9)' }}>
        <div className="form-shell">
          <div>
            <h2 style={{ fontSize: 'var(--fs-h3)' }}>Prefer to talk?</h2>
            <p className="muted" style={{ marginTop: 'var(--sp-3)' }}>
              {s.office_hours}. A real person answers.
            </p>
            <ul className="contact-list">
              {wa && (
                <li>
                  <small>WhatsApp</small>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    Message us
                  </a>
                </li>
              )}
              {tel && (
                <li>
                  <small>Phone</small>
                  <a href={tel}>{s.phone}</a>
                </li>
              )}
              {s.email && (
                <li>
                  <small>Email</small>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </li>
              )}
              {s.address && (
                <li>
                  <small>Office</small>
                  <span>{s.address}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="form-card">
            {state.status === 'done' ? (
              <div role="status" className="stack">
                <span className="icon-chip" style={{ marginBottom: 0 }}>
                  <Icon name="check" />
                </span>
                <h2 style={{ fontSize: 'var(--fs-h3)' }}>Thank you, we have your enquiry.</h2>
                <p className="muted">We will reply on the number you gave us. If it is urgent, message us on WhatsApp.</p>
                {wa && (
                  <a className="btn-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
                    <Icon name="whatsapp" />
                    Continue on WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="form-grid">
                  <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="label">Which trip?</legend>
                    <div className="pick-row">
                      {[...trips.map((t) => t.title), CUSTOM].map((t) => (
                        <label key={t} className="pick">
                          <input type="radio" name="trip" value={t} checked={trip === t} onChange={() => setTrip(t)} />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="field">
                    <label htmlFor="name">Your name</label>
                    <input {...fieldProps('name')} required autoComplete="name" maxLength={80} />
                    {err('name') && <p className="error" id="name-err">{err('name')}</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="phone">Phone or WhatsApp</label>
                    <input {...fieldProps('phone')} type="tel" required autoComplete="tel" inputMode="tel" maxLength={20} />
                    {err('phone') && <p className="error" id="phone-err">{err('phone')}</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email (optional)</label>
                    <input {...fieldProps('email')} type="email" autoComplete="email" maxLength={120} />
                    {err('email') && <p className="error" id="email-err">{err('email')}</p>}
                  </div>
                  <div className="field">
                    <label htmlFor="travel_month">When are you travelling?</label>
                    <input {...fieldProps('travel_month')} maxLength={60} />
                    <p className="hint">A month is enough, for example March 2027.</p>
                  </div>
                  <div className="field">
                    <label htmlFor="group_size">How many travellers?</label>
                    <select {...fieldProps('group_size')} defaultValue="2">
                      {GROUP.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field full">
                    <label htmlFor="notes">Anything we should know?</label>
                    <textarea {...fieldProps('notes')} maxLength={1500} />
                    <p className="hint">Ages of children, fitness, food preferences, places you want to see.</p>
                  </div>
                  <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  {state.status === 'error' && (
                    <p className="notice bad full" role="alert">
                      {state.msg}
                    </p>
                  )}
                  <div className="full">
                    <ArrowButton type="submit" disabled={state.status === 'busy'}>
                      {state.status === 'busy' ? 'Sending' : 'Send enquiry'}
                    </ArrowButton>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export async function getStaticProps() {
  const trips = (await getPackages()).map(({ slug, title }) => ({ slug, title }));
  return pageProps({ trips });
}
