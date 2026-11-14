import Link from 'next/link';
import Pic from './Pic.jsx';
import { money } from '../lib/format.js';
import { dateRange } from '../lib/departures.mjs';

export const bookHref = (d) => `/book-a-trip?trip=${encodeURIComponent(d.trip_slug)}&dep=${encodeURIComponent(d.id)}`;

function Seats({ d }) {
  const left = d.seats_left == null || d.seats_left === '' ? null : Number(d.seats_left);
  return (
    <span className="dep-status">
      {d.status === 'filling' && <span className="chip chip-sun">Filling fast</span>}
      {left != null && (
        <span className={left <= 3 ? 'dep-few' : undefined}>
          {left} seat{left === 1 ? '' : 's'} left
        </span>
      )}
    </span>
  );
}

// The dates on one trip's page.
export function TripDates({ departures, currency = '₹' }) {
  if (!departures.length) return null;
  return (
    <section className="trip-block" id="dates" aria-labelledby="dates-title">
      <h2 id="dates-title">Upcoming dates</h2>
      <ul className="dep-list">
        {departures.map((d) => (
          <li key={d.id} className="dep-row">
            <div className="dep-when">
              <strong>{dateRange(d.start_date, d.end_date)}</strong>
              {d.note && <span>{d.note}</span>}
            </div>
            <div className="dep-price">
              <strong>{money(d.price, currency)}</strong>
              <span>per person</span>
            </div>
            <Seats d={d} />
            <Link href={bookHref(d)} className="btn-ghost dep-book">
              Book this date
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// A departure with its trip, for the home page and the Upcoming trips page.
export function DepartureCard({ d, headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  return (
    <article className="dep-card">
      <Link href={`/packages/${d.trip.slug}`} className="dep-photo" tabIndex={-1} aria-hidden="true">
        {d.trip.hero_image && <Pic src={d.trip.hero_image} sizes="(max-width: 640px) 30vw, 160px" alt="" loading="lazy" decoding="async" width="320" height="320" />}
      </Link>
      <div className="dep-body">
        <p className="dep-date">{dateRange(d.start_date, d.end_date)}</p>
        <H className="dep-title">
          <Link href={`/packages/${d.trip.slug}`}>{d.trip.title}</Link>
        </H>
        <p className="dep-meta">
          {[d.trip.duration_label, `${money(d.price, d.trip.currency)} per person`].filter(Boolean).join(' · ')}
        </p>
        {d.note && <p className="dep-note">{d.note}</p>}
        <div className="dep-foot">
          <Seats d={d} />
          <Link href={bookHref(d)} className="text-link">
            Book this date
          </Link>
        </div>
      </div>
    </article>
  );
}

// Departures grouped under month headings.
export function DeparturesByMonth({ departures }) {
  const groups = [];
  for (const d of departures) {
    const key = d.start_date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(d);
    else groups.push({ key, items: [d] });
  }
  return groups.map((g) => (
    <section key={g.key} className="dep-month" aria-labelledby={`m-${g.key}`}>
      <h2 id={`m-${g.key}`}>{new Date(`${g.key}-15T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2>
      <div className="dep-grid">
        {g.items.map((d) => (
          <DepartureCard key={d.id} d={d} />
        ))}
      </div>
    </section>
  ));
}
