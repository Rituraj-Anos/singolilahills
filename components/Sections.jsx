import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArrowButton from './ArrowButton.jsx';
import { ExperienceCard, TripCard } from './Cards.jsx';
import Pic from './Pic.jsx';
import Slider from './Slider.jsx';
import { metres } from '../lib/format.js';
import { INTERESTS } from '../lib/planner.mjs';

/* Things to do, filtered by the same interests as the trip planner. A chosen interest also links into the planner. */
export function ExperienceRow({ experiences, title = 'What you can do out there', titleId = 'exp-title' }) {
  const [interest, setInterest] = useState('');
  const offered = useMemo(() => INTERESTS.filter((i) => experiences.some((e) => (e.interests || []).includes(i.id))), [experiences]);
  const shown = interest ? experiences.filter((e) => (e.interests || []).includes(interest)) : experiences;
  const label = offered.find((i) => i.id === interest)?.label;
  if (!experiences.length) return null;
  const filters = (
    <div>
      <h2 id={titleId}>{title}</h2>
      <div className="exp-filters" role="group" aria-label="Filter by interest">
        <button type="button" aria-pressed={!interest} onClick={() => setInterest('')}>
          Everything
        </button>
        {offered.map((i) => (
          <button key={i.id} type="button" aria-pressed={interest === i.id} onClick={() => setInterest(i.id)}>
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {shown.length} things to do shown
      </p>
      {/* keyed so a new filter starts the row from the first card, with its slide-in */}
      <Slider key={interest || 'all'} head={filters} label="Things to do" cols={3}>
        {shown.map((e) => (
          <ExperienceCard key={e.slug} exp={e} href={`/destinations/${e.destination}#things-to-do`} />
        ))}
      </Slider>
      {interest && (
        <p className="exp-plan">
          <Link href={`/book-a-trip?i=${interest}`} className="text-link">
            Plan a trip around {label.toLowerCase()}
          </Link>
        </p>
      )}
    </>
  );
}

/* Infinite ticker. The list renders twice (second copy hidden from assistive tech) so the loop is seamless. */
export function Ticker({ items, render, duration = 60, reverse, label }) {
  if (!items.length) return null;
  return (
    <div className="ticker" style={{ '--ticker-dur': `${duration}s` }}>
      <ul className={`ticker-track${reverse ? ' reverse' : ''}`} aria-label={label}>
        {items.map((it, i) => (
          <li key={`a${i}`}>{render(it)}</li>
        ))}
        {/* duplicate copy: skipped by screen readers and by Tab */}
        {items.map((it, i) => (
          <li key={`b${i}`} aria-hidden="true" inert="">
            {render(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Statement whose words fill in as it scrolls through the viewport. Fully filled without JS or with reduced motion. */
export function Statement({ text }) {
  const ref = useRef(null);
  const words = useMemo(() => String(text || '').split(/\s+/).filter(Boolean), [text]);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const spans = [...el.querySelectorAll('.w')];
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the block's top hits 85% of the viewport, 1 when its bottom reaches 45%
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.4)));
      const lit = p * spans.length;
      spans.forEach((s, i) => (s.style.opacity = String(Math.min(1, Math.max(0.18, lit - i + 0.18)))));
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [words]);
  return (
    <section className="section statement" aria-label="About our trips">
      <div className="container">
        <p ref={ref}>
          {words.map((w, i) => (
            <span key={i} className="w">
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* Travel styles: a list of trip categories; hovering or focusing a row swaps the photo. */
export function TravelStyles({ packages }) {
  const styles = useMemo(() => {
    const map = new Map();
    for (const p of packages) {
      if (!p.category) continue;
      const s = map.get(p.category) || { name: p.category, count: 0, image: p.hero_image, tagline: p.tagline };
      s.count += 1;
      map.set(p.category, s);
    }
    return [...map.values()].slice(0, 6);
  }, [packages]);
  const [active, setActive] = useState(0);
  if (!styles.length) return null;
  return (
    <section className="section dark-panel on-dark" aria-labelledby="styles-title">
      <div className="container">
        <div className="section-head">
          <h2 id="styles-title">Ways to see the mountains</h2>
          <p>Every style comes with a local driver or guide, permits handled and stays we have slept in ourselves.</p>
        </div>
        <div className="styles-grid">
          <figure className="styles-photo">
            {styles.map((s, i) => (
              <Pic key={s.name} src={s.image} sizes="(max-width: 860px) 92vw, 45vw" alt="" loading="lazy" decoding="async" className={i === active ? 'is-active' : ''} />
            ))}
            <figcaption>{styles[active].tagline}</figcaption>
          </figure>
          <ul className="styles-list">
            {styles.map((s, i) => (
              <li key={s.name}>
                <Link
                  href={`/packages?style=${encodeURIComponent(s.name)}`}
                  className={i === active ? 'is-active' : ''}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="name">{s.name}</span>
                  <span className="count">
                    {s.count} {s.count === 1 ? 'trip' : 'trips'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* Trip grid with destination and style filters. Filters sync to ?region= and ?style= so links can pre-filter. */
export function TripFinder({ packages, limit, initialStyle = '', initialRegion = '', headingLevel = 3, swipe = false }) {
  // callers pass a `key` built from the initial filters, so a new ?style= link remounts with fresh state
  const [region, setRegion] = useState(initialRegion);
  const [style, setStyle] = useState(initialStyle);
  const regions = [...new Set(packages.map((p) => p.region).filter(Boolean))];
  const styles = [...new Set(packages.map((p) => p.category).filter(Boolean))];
  const shown = packages.filter((p) => (!region || p.region === region) && (!style || p.category === style));
  const visible = limit ? shown.slice(0, limit) : shown;
  const filters = (
      <div className="finder" role="group" aria-label="Filter trips">
        <label>
          <span className="sr-only">Region</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Travel style</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">All styles</option>
            {styles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {(region || style) && (
          <button
            type="button"
            className="clear"
            onClick={() => {
              setRegion('');
              setStyle('');
            }}
          >
            Clear
          </button>
        )}
      </div>
  );
  const empty = <p className="empty">No trips match those filters yet. Ask us and we will plan one for you.</p>;
  return (
    <>
      {swipe ? (
        <Slider head={filters} label="Trips" cols={3}>
          {visible.map((p) => (
            <TripCard key={p.slug} pkg={p} headingLevel={headingLevel} />
          ))}
        </Slider>
      ) : (
        filters
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {shown.length} trips shown
      </p>
      {!visible.length ? (
        empty
      ) : swipe ? null : (
        <div className="trip-grid">
          {visible.map((p, i) => (
            <div key={p.slug} data-reveal style={{ '--i': i % 3 }}>
              <TripCard pkg={p} headingLevel={headingLevel} />
            </div>
          ))}
        </div>
      )}
      {limit && shown.length > limit && (
        <div className="more-row">
          <ArrowButton href="/packages" variant="dark">
            See all {shown.length} trips
          </ArrowButton>
        </div>
      )}
    </>
  );
}

/* Signature: the trip's altitude profile, drawn from its real itinerary. Hidden when fewer than two days carry an altitude. */
export function AltitudeStrip({ itinerary = [] }) {
  const pts = itinerary.map((d) => ({ day: d.day, m: metres(d.altitude) })).filter((d) => d.m != null);
  if (pts.length < 2) return null;
  const W = 720, H = 220, padX = 28, padTop = 34, padBottom = 34;
  const max = Math.max(...pts.map((p) => p.m));
  const min = Math.min(...pts.map((p) => p.m));
  const top = Math.ceil(max / 500) * 500;
  const bottom = Math.max(0, Math.floor(min / 500) * 500 - 500);
  const x = (i) => padX + (i * (W - padX * 2)) / (pts.length - 1);
  const y = (m) => padTop + (1 - (m - bottom) / (top - bottom || 1)) * (H - padTop - padBottom);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.m).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1)},${H - padBottom} L${x(0)},${H - padBottom} Z`;
  const peak = pts.findIndex((p) => p.m === max);
  const fmt = (m) => `${m.toLocaleString('en-IN')} m`;
  return (
    <section className="altitude" aria-labelledby="alt-title">
      <div className="altitude-head">
        <h2 id="alt-title">The route, day by day</h2>
        <p>
          Highest point {fmt(max)} on day {pts[peak].day}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pts.map((p) => `Day ${p.day}: ${fmt(p.m)}`).join(', ')}>
        {[top, (top + bottom) / 2, bottom].map((g) => (
          <line key={g} className="grid" x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} />
        ))}
        <path className="area" d={area} />
        <path className="line" d={line} pathLength="2000" style={{ '--len': 2000 }} />
        {pts.map((p, i) => (
          <g key={i}>
            <circle className={i === peak ? 'peak' : 'dot'} cx={x(i)} cy={y(p.m)} r={i === peak ? 6 : 3.5} fill="var(--c-accent)" />
            <text x={x(i)} y={H - 10} textAnchor="middle">
              Day {p.day}
            </text>
            {i === peak && (
              <text className="val" x={x(i)} y={y(p.m) - 14} textAnchor="middle">
                {fmt(p.m)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </section>
  );
}

export function FaqList({ faqs, title = 'Before you book', text }) {
  if (!faqs.length) return null;
  return (
    <section className="section" aria-labelledby="faq-title">
      <div className="container faq-grid">
        <div className="faq-left">
          <h2 id="faq-title">{title}</h2>
          <p>{text || 'Ask about altitude, permits or the best month for your group. Our Darjeeling team replies, usually the same day.'}</p>
          <ArrowButton href="/book-a-trip" variant="dark">
            Send a question
          </ArrowButton>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.id || f.question || f.q} className="faq-item">
              <summary>
                {f.question || f.q}
                <span className="faq-toggle" aria-hidden="true" />
              </summary>
              <p className="answer">{f.answer || f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaWindow({ settings, title, text }) {
  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="cta-window">
        <Pic src={settings.cta_image} sizes="100vw" alt="" loading="lazy" decoding="async" />
        <span className="veil" aria-hidden="true" />
        <div className="cta-content" data-reveal>
          <h2 id="cta-title">{title || settings.cta_title}</h2>
          <p>{text || settings.cta_text}</p>
          <div className="actions">
            <ArrowButton href="/book-a-trip" variant="light">
              Plan a trip
            </ArrowButton>
            <Link href="/packages" className="btn-ghost on-dark">
              See all trips
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
