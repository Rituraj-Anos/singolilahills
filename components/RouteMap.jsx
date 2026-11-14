import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addTiles, loadLeaflet, prefersReducedMotion, stopIcon } from '../lib/map.js';
import { routeLine, routeStops } from '../lib/route.mjs';

// Opens a day in the "Day by day" list and scrolls to it.
function openDay(n) {
  const el = document.getElementById(`day-${n}`);
  if (!el) return;
  el.open = true;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  el.querySelector('summary')?.focus({ preventScroll: true });
}

/*
  Map of the route: one numbered stop per place, joined by a line in day order.
  Loads only when it is about to scroll into view. Tapping a stop opens that day in the itinerary,
  and opening a day highlights its stop. The list of stops under the map is the same information
  as plain links, so the route is readable without the map (or without JavaScript).
*/
export default function RouteMap({ itinerary }) {
  const stops = useMemo(() => routeStops(itinerary), [itinerary]);
  const line = useMemo(() => routeLine(itinerary), [itinerary]);
  const box = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [status, setStatus] = useState('idle');
  const [active, setActive] = useState(-1);

  const highlight = useCallback(
    (i, pan) => {
      setActive(i);
      markers.current.forEach((m, j) => m.getElement()?.classList.toggle('is-active', j === i));
      if (pan && map.current && stops[i]) {
        const to = [stops[i].lat, stops[i].lng];
        if (prefersReducedMotion()) map.current.panTo(to, { animate: false });
        else map.current.flyTo(to, Math.max(map.current.getZoom(), 10), { duration: 0.8 });
      }
    },
    [stops]
  );

  // start loading a little before the map scrolls into view
  useEffect(() => {
    const el = box.current;
    if (!el || !stops.length) return;
    if (!('IntersectionObserver' in window)) {
      const t = setTimeout(() => setStatus('loading'), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setStatus((s) => (s === 'idle' ? 'loading' : s));
        io.disconnect();
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stops.length]);

  useEffect(() => {
    if (status !== 'loading') return;
    let alive = true;
    loadLeaflet()
      .then((L) => {
        if (!alive || !box.current) return;
        const m = L.map(box.current, {
          scrollWheelZoom: false, // the page keeps scrolling; zoom with the buttons or a pinch
          dragging: !L.Browser.mobile, // one finger scrolls the page on phones
          zoomSnap: 0.25,
        });
        map.current = m;
        addTiles(L, m);
        if (line.length > 1) L.polyline(line, { className: 'map-route', weight: 3, opacity: 0.9, dashArray: '6 7' }).addTo(m);
        markers.current = stops.map((s, i) =>
          L.marker([s.lat, s.lng], { icon: stopIcon(L, s.label), keyboard: false, title: `Day ${s.label}: ${s.place}` })
            .bindTooltip(`Day ${s.label} · ${s.place}`, { direction: 'top', className: 'map-tip' })
            .on('click', () => {
              highlight(i, false);
              openDay(s.days[0]);
            })
            .addTo(m)
        );
        m.fitBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lng])), { padding: [36, 36], maxZoom: 11 });
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [status, stops, line, highlight]);

  useEffect(() => () => map.current?.remove(), []);

  // opening a day in the list highlights its stop on the map
  useEffect(() => {
    if (status !== 'ready') return;
    const els = [...document.querySelectorAll('details.day[id^="day-"]')];
    const onToggle = (e) => {
      if (!e.target.open) return;
      const n = Number(e.target.id.slice(4));
      const i = stops.findIndex((s) => s.days.includes(n));
      if (i >= 0) highlight(i, true);
    };
    els.forEach((el) => el.addEventListener('toggle', onToggle));
    return () => els.forEach((el) => el.removeEventListener('toggle', onToggle));
  }, [status, stops, highlight]);

  if (!stops.length) return null;
  return (
    <section className="trip-block route" aria-labelledby="map-title">
      <div className="route-head">
        <h2 id="map-title">The route on a map</h2>
        <p className="muted">Tap a stop to open that day.</p>
      </div>
      <div className="route-map" ref={box} role="region" aria-label="Map of the route">
        {status !== 'ready' && <p className="route-map-note">{status === 'error' ? 'The map could not load. Every stop is listed below.' : 'Loading the map'}</p>}
      </div>
      <ol className="route-stops">
        {stops.map((s, i) => (
          <li key={`${s.lat},${s.lng}`}>
            <a
              href={`#day-${s.days[0]}`}
              className={i === active ? 'is-active' : undefined}
              onClick={(e) => {
                e.preventDefault();
                highlight(i, true);
                openDay(s.days[0]);
              }}
            >
              <span className="route-stop-n">{s.label}</span>
              {s.place}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
