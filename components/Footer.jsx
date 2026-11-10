import Link from 'next/link';
import { useState } from 'react';
import ArrowButton from './ArrowButton.jsx';
import { BrandMark } from './Icon.jsx';
import { telLink, waLink } from '../lib/format.js';

function Subscribe() {
  const [state, setState] = useState({ status: 'idle', msg: '' });
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setState({ status: 'busy', msg: '' });
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value, company: form.company.value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not subscribe right now.');
      form.reset();
      setState({ status: 'done', msg: 'Thank you. You are on the list.' });
    } catch (err) {
      setState({ status: 'error', msg: err.message });
    }
  }
  return (
    <form className="subscribe" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor="sub-email">
        Email address
      </label>
      <input id="sub-email" name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
      <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <ArrowButton type="submit" variant="light" disabled={state.status === 'busy'}>
        {state.status === 'busy' ? 'Subscribing' : 'Subscribe'}
      </ArrowButton>
      <p className="msg" role="status" aria-live="polite">
        {state.msg}
      </p>
    </form>
  );
}

export default function Footer({ settings: s, destinations = [] }) {
  const year = new Date().getFullYear();
  const wa = waLink(s.whatsapp);
  const tel = telLink(s.phone);
  const socials = [
    ['Instagram', s.instagram],
    ['Facebook', s.facebook],
    ['YouTube', s.youtube],
  ].filter(([, url]) => url);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <h2>{s.newsletter_title}</h2>
            <p>{s.newsletter_text}</p>
          </div>
          <Subscribe />
        </div>
        <div className="footer-cols">
          <div className="about">
            <Link href="/" className="brand">
              <BrandMark />
              <span className="brand-name">{s.brand_name}</span>
            </Link>
            <p>{s.brand_tagline}. {s.address}.</p>
          </div>
          <nav aria-label="Trips and places">
            <p className="col-label">Explore</p>
            <ul>
              <li>
                <Link href="/packages">All trips</Link>
              </li>
              {destinations.slice(0, 4).map((d) => (
                <li key={d.slug}>
                  <Link href={`/destinations/${d.slug}`}>{d.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <p className="col-label">Company</p>
            <ul>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/blog">Journal</Link>
              </li>
              <li>
                <Link href="/book-a-trip">Plan a trip</Link>
              </li>
              <li>
                <Link href="/share-your-trip">Share your trip</Link>
              </li>
              <li>
                <Link href="/policies/privacy-policy">Privacy</Link>
              </li>
              <li>
                <Link href="/policies/terms-conditions">Terms</Link>
              </li>
            </ul>
          </nav>
          {(s.email || tel || wa || socials.length > 0) && (
          <div>
            <p className="col-label">Talk to us</p>
            <ul>
              {s.email && (
                <li>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </li>
              )}
              {tel && (
                <li>
                  <a href={tel}>{s.phone}</a>
                </li>
              )}
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          )}
        </div>
        <div className="footer-bottom">
          <p>
            © {year} {s.brand_name}
          </p>
          <p>{s.office_hours}</p>
        </div>
      </div>
      <p className="footer-ghost" aria-hidden="true">
        {s.brand_name}
      </p>
    </footer>
  );
}
