import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Pic from './Pic.jsx';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
  Centre-focus carousel for the destinations.
  The middle card is large; its neighbours tilt back, shrink and fade. Swipe, drag, use the arrows, the dots
  or the left/right keys. It steps by itself while on screen (paused on hover, focus, touch, a hidden tab
  and with reduced motion). The cards fan out from the centre the first time the section scrolls into view.
  Every card is a real link, so it also works before the page's scripts have loaded.
*/
export default function DestCarousel({ items, title, titleId, actions, auto = 5200 }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState(false);
  const [settled, setSettled] = useState(false);
  const root = useRef(null);
  const onScreen = useRef(false);
  const hold = useRef({ hover: false, focus: false, until: 0 });
  const drag = useRef(null);
  const moved = useRef(false);

  const step = useCallback((d) => setActive((a) => (a + d + n) % n), [n]);
  const pause = () => (hold.current.until = Date.now() + 9000);

  // fan the cards out the first time the section is on screen
  useEffect(() => {
    const el = root.current;
    if (!('IntersectionObserver' in window)) {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen.current = e.isIntersecting;
        if (e.isIntersecting) setSeen(true);
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(() => setSettled(true), 1400);
    return () => clearTimeout(t);
  }, [seen]);

  useEffect(() => {
    if (!auto || n < 2 || reduced()) return;
    const tick = setInterval(() => {
      const h = hold.current;
      if (!onScreen.current || document.hidden || h.hover || h.focus || Date.now() < h.until) return;
      step(1);
    }, auto);
    return () => clearInterval(tick);
  }, [auto, n, step]);

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    pause();
  };
  const up = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      moved.current = true;
      step(dx < 0 ? 1 : -1);
    }
  };
  const key = (e) => {
    if (e.key === 'ArrowRight') (pause(), step(1), e.preventDefault());
    if (e.key === 'ArrowLeft') (pause(), step(-1), e.preventDefault());
  };

  // shortest way round the circle, so the row can loop without a jump
  const half = Math.floor(n / 2);
  const offset = (i) => ((i - active + n + half) % n) - half;

  const cls = ['dc', seen && 'is-in', settled && 'is-settled'].filter(Boolean).join(' ');
  return (
    <div
      ref={root}
      className={cls}
      role="region"
      aria-roledescription="carousel"
      aria-label="Destinations"
      onKeyDown={key}
      onPointerEnter={(e) => e.pointerType === 'mouse' && (hold.current.hover = true)}
      onPointerLeave={() => (hold.current.hover = false)}
      onFocus={() => (hold.current.focus = true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && (hold.current.focus = false)}
    >
      <div className="container section-head dc-head">
        <h2 id={titleId}>{title}</h2>
        <div className="slider-tools">
          {actions}
          {n > 1 && (
            <div className="slider-nav">
              <button type="button" className="slider-arrow is-prev" aria-label="Previous destination" onClick={() => (pause(), step(-1))}>
                <Icon name="arrow" />
              </button>
              <button type="button" className="slider-arrow" aria-label="Next destination" onClick={() => (pause(), step(1))}>
                <Icon name="arrow" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dc-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={() => (drag.current = null)}>
        <ul className="dc-list">
          {items.map((d, i) => {
            const o = offset(i);
            const a = Math.abs(o);
            const here = o === 0;
            const trips = d.circuits?.length || 0;
            return (
              <li
                key={d.slug}
                className={`dc-card${here ? ' is-active' : ''}${a > 2 ? ' is-far' : ''}`}
                style={{ '--o': seen ? o : 0, '--a': seen ? Math.min(a, 3) : 0, '--e': settled ? 0 : a * 110 }}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}`}
              >
                <Link
                  href={`/destinations/${d.slug}`}
                  tabIndex={here ? 0 : -1}
                  aria-hidden={here ? undefined : true}
                  draggable={false}
                  onClick={(e) => {
                    // a swipe, or a tap on a card beside the middle one, moves the row instead of opening the page
                    if (moved.current || !here) {
                      e.preventDefault();
                      moved.current = false;
                      if (!here) (pause(), setActive(i));
                    }
                  }}
                >
                  <Pic src={d.hero_image} sizes="(max-width: 640px) 72vw, 340px" alt="" loading="lazy" decoding="async" width="640" height="864" draggable={false} />
                  <span className="dc-shade" aria-hidden="true" />
                  {trips > 0 && (
                    <span className="dc-chip">
                      {trips} {trips === 1 ? 'trip' : 'trips'}
                    </span>
                  )}
                  <span className="dc-caption">
                    <small>{d.altitude}</small>
                    <strong>{d.name}</strong>
                  </span>
                  <span className="dc-go" aria-hidden="true">
                    Explore
                    <Icon name="arrow" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {n > 1 && (
        <div className="dc-dots" role="group" aria-label="Choose a destination">
          {items.map((d, i) => (
            <button key={d.slug} type="button" className={i === active ? 'is-on' : ''} aria-label={d.name} aria-current={i === active ? 'true' : undefined} onClick={() => (pause(), setActive(i))} />
          ))}
        </div>
      )}
    </div>
  );
}
