import { Children, useCallback, useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
  Horizontal carousel: swipe or scroll the row, or use the round arrow buttons.
  - head: content on the left of the bar (a heading or filters); actions: extra buttons beside the arrows
  - cols: 3 lays cards out three across on desktop (two on tablets, one and a bit on phones); omit to keep each card's own width
  - bleed: the row runs to the screen edges while the bar stays in the page column
  - auto: milliseconds between automatic steps (pauses on hover, focus, touch, hidden tab, off-screen and reduced motion)
  - loop: the arrows wrap around at the ends instead of stopping
  Cards slide in one after another the first time the row scrolls into view.
*/
export default function Slider({ head, actions, label, children, cols, bleed, auto = 0, loop = false, className = '' }) {
  const id = useId();
  const root = useRef(null);
  const track = useRef(null);
  const bar = useRef(null);
  const hold = useRef({ hover: false, focus: false, until: 0 });
  const [state, setState] = useState({ overflow: false, start: true, end: false });
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const next = { overflow: max > 2, start: t.scrollLeft <= 2, end: t.scrollLeft >= max - 2 };
    setState((s) => (s.overflow === next.overflow && s.start === next.start && s.end === next.end ? s : next));
    if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? (t.scrollLeft + t.clientWidth) / t.scrollWidth : 1})`;
  }, []);

  const go = useCallback(
    (dir) => {
      const t = track.current;
      if (!t) return;
      const behavior = reduced() ? 'auto' : 'smooth';
      const max = t.scrollWidth - t.clientWidth;
      if (dir > 0 && t.scrollLeft >= max - 2) return loop && t.scrollTo({ left: 0, behavior });
      if (dir < 0 && t.scrollLeft <= 2) return loop && t.scrollTo({ left: max, behavior });
      const first = t.firstElementChild;
      const gap = parseFloat(getComputedStyle(t).columnGap) || 0;
      t.scrollBy({ left: dir * ((first?.offsetWidth || t.clientWidth) + gap), behavior });
    },
    [loop]
  );

  // keep the arrows and progress line in step with the scroll position and size
  useEffect(() => {
    const t = track.current;
    let raf = 0;
    const onScroll = () => (raf ||= requestAnimationFrame(() => ((raf = 0), measure())));
    measure();
    t.addEventListener('scroll', onScroll, { passive: true });
    const ro = 'ResizeObserver' in window ? new ResizeObserver(onScroll) : null;
    ro?.observe(t);
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro?.disconnect();
    };
  }, [measure, items.length]);

  // slide the cards in the first time the row is on screen, and only auto-advance while it is
  const onScreen = useRef(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen.current = e.isIntersecting;
        if (e.isIntersecting) setSeen(true);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // once the cards have arrived, hand transitions back to the cards' own hover and press styles
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(() => setSettled(true), 1800);
    return () => clearTimeout(t);
  }, [seen]);

  useEffect(() => {
    if (!auto || reduced()) return;
    const tick = setInterval(() => {
      const h = hold.current;
      if (!onScreen.current || document.hidden || h.hover || h.focus || Date.now() < h.until) return;
      const t = track.current;
      if (t && t.scrollLeft >= t.scrollWidth - t.clientWidth - 2) t.scrollTo({ left: 0, behavior: 'smooth' });
      else go(1);
    }, auto);
    return () => clearInterval(tick);
  }, [auto, go]);

  // any hands-on scrolling pauses auto-advance for a while
  const nudge = () => (hold.current.until = Date.now() + 8000);
  const press = (dir) => {
    nudge();
    go(dir);
  };

  const cls = ['slider', bleed && 'is-bleed', cols && `cols-${cols}`, seen && 'is-in', settled && 'is-settled', className].filter(Boolean).join(' ');
  return (
    <div
      ref={root}
      className={cls}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === 'mouse' && (hold.current.hover = true)}
      onPointerLeave={() => (hold.current.hover = false)}
      onFocus={() => (hold.current.focus = true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && (hold.current.focus = false)}
    >
      <div className={`section-head slider-bar${bleed ? ' container' : ''}`}>
        {head && <div className="slider-head">{head}</div>}
        <div className="slider-tools">
          {actions}
          <div className="slider-nav" hidden={!state.overflow}>
            <button type="button" className="slider-arrow is-prev" aria-controls={id} aria-label="Previous" disabled={!loop && state.start} onClick={() => press(-1)}>
              <Icon name="arrow" />
            </button>
            <button type="button" className="slider-arrow" aria-controls={id} aria-label="Next" disabled={!loop && state.end} onClick={() => press(1)}>
              <Icon name="arrow" />
            </button>
          </div>
        </div>
      </div>
      <ul id={id} ref={track} className="slider-track" onPointerDown={nudge} onWheel={nudge} onTouchStart={nudge}>
        {items.map((child, i) => (
          <li key={child.key ?? i} className="slider-item" style={{ '--i': Math.min(i, 6) }}>
            {child}
          </li>
        ))}
      </ul>
      <div className={`slider-progress${bleed ? ' container' : ''}`} hidden={!state.overflow} aria-hidden="true">
        <span>
          <span ref={bar} />
        </span>
      </div>
    </div>
  );
}
