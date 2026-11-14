// Leaflet is loaded only when a map is about to scroll into view, so pages without a map never download it.
// Map tiles: set NEXT_PUBLIC_MAP_TILES to a provider URL with your key (for example MapTiler or Stadia Maps,
// both have a free tier). Without it the public OpenStreetMap tiles are used, which are fine for testing
// and light use but are not meant to carry a busy production site.
export const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

let leaflet = null;
export async function loadLeaflet() {
  if (!leaflet) leaflet = import('leaflet').then((m) => m.default || m);
  return leaflet;
}

export function addTiles(L, map) {
  return L.tileLayer(TILE_URL, { maxZoom: 17, attribution: TILE_ATTRIBUTION, crossOrigin: true }).addTo(map);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// A round numbered marker drawn in CSS (no image files to host or lose).
export function stopIcon(L, label) {
  const wide = String(label).length > 2;
  return L.divIcon({
    className: 'map-stop',
    html: `<span class="map-stop-dot${wide ? ' is-wide' : ''}">${esc(label)}</span>`,
    iconSize: wide ? [44, 30] : [30, 30],
    iconAnchor: wide ? [22, 15] : [15, 15],
    tooltipAnchor: [0, -18],
  });
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
