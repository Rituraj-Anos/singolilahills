import Link from 'next/link';
import Icon from './Icon.jsx';
import Pic from './Pic.jsx';
import { dateLabel, money, monthsLabel } from '../lib/format.js';

export function TripCard({ pkg, headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  return (
    <Link href={`/packages/${pkg.slug}`} className="trip-card">
      <Pic src={pkg.hero_image} sizes="(max-width: 640px) 92vw, (max-width: 1000px) 46vw, 33vw" alt="" loading="lazy" decoding="async" width="800" height="1000" />
      <span className="shade" aria-hidden="true" />
      <span className="chips">
        <span className="chip">{pkg.duration_days} days</span>
        {pkg.category && <span className="chip">{pkg.category}</span>}
      </span>
      <span className="body">
        <small>{pkg.destination}</small>
        <H>{pkg.title}</H>
        <span className="foot">
          <span className="price">
            <small>from</small>
            <strong>{money(pkg.price, pkg.currency)}</strong>
          </span>
          <span className="view" aria-hidden="true">
            View trip
          </span>
        </span>
      </span>
    </Link>
  );
}

export function DestCard({ dest }) {
  return (
      <Link href={`/destinations/${dest.slug}`} className="dest-card">
        <Pic src={dest.hero_image} sizes="(max-width: 640px) 70vw, 340px" alt="" loading="lazy" decoding="async" width="640" height="864" />
        <span className="shade" aria-hidden="true" />
        <span className="hover-veil" aria-hidden="true" />
        <span className="caption">
          <small>{dest.altitude}</small>
          <strong>{dest.name}</strong>
        </span>
      </Link>
  );
}

// One thing to do at a destination. With `href` the whole card is a link; with `trips` it lists the trips
// that include it as links instead (a link can't sit inside another link).
export function ExperienceCard({ exp, href, trips = [], headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  const when = monthsLabel(exp.best_months);
  const body = (
    <>
      <span className="exp-photo">
        {exp.image && <Pic src={exp.image} sizes="(max-width: 640px) 80vw, 360px" alt="" loading="lazy" decoding="async" width="720" height="540" />}
      </span>
      <span className="exp-body">
        <span className="exp-meta">
          {exp.duration && (
            <span>
              <Icon name="clock" />
              {exp.duration}
            </span>
          )}
          {when && (
            <span>
              <Icon name="calendar" />
              {when}
            </span>
          )}
        </span>
        <H className="exp-title">{exp.title}</H>
        {exp.summary && <span className="exp-summary">{exp.summary}</span>}
      </span>
    </>
  );
  if (href)
    return (
      <Link href={href} className="exp-card">
        {body}
      </Link>
    );
  return (
    <article className="exp-card">
      {body}
      {trips.length > 0 && (
        <p className="exp-trips">
          <span>On </span>
          {trips.map((t, i) => (
            <span key={t.slug}>
              {i > 0 && ', '}
              <Link href={`/packages/${t.slug}`}>{t.title}</Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

export function PostCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="post-card" data-reveal>
      <span className="cover">
        <Pic src={post.image} sizes="(max-width: 900px) 92vw, 33vw" alt="" loading="lazy" decoding="async" width="800" height="600" />
      </span>
      <span className="chips">
        {post.category && <span className="chip chip-plain">{post.category}</span>}
        {post.read_time && <span className="chip chip-plain">{post.read_time}</span>}
      </span>
      <h3>{post.title}</h3>
      <p>{post.summary}</p>
      <span className="sr-only">Published {dateLabel(post.published_at)}</span>
    </Link>
  );
}

export function ReviewCard({ review }) {
  return (
      <figure className="review-card">
        <span className="stars" role="img" aria-label={`${review.rating || 5} out of 5`}>
          {Array.from({ length: review.rating || 5 }, (_, i) => (
            <Icon key={i} name="star" />
          ))}
        </span>
        <blockquote>{review.comment}</blockquote>
        <figcaption>
          <strong>{review.author}</strong>
          {review.circuit}
        </figcaption>
      </figure>
  );
}

export function ReelCard({ reel }) {
  return (
    <a className="reel" href={reel.reel_url} target="_blank" rel="noopener noreferrer">
      <Pic src={reel.thumbnail} sizes="260px" alt="" loading="lazy" decoding="async" width="360" height="640" />
      <span className="shade" aria-hidden="true" />
      <span className="play" aria-hidden="true">
        <Icon name="play" />
      </span>
      <span className="caption">
        <strong>{reel.title}</strong>
        <br />
        <small>{reel.destination}, on Instagram</small>
      </span>
    </a>
  );
}
