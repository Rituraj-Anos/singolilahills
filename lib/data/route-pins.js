// Map pins for each itinerary day: where the traveller spends the night, or the day's main stop.
// Coordinates are approximate (looked up on OpenStreetMap, rounded to about 10 m); the owner can move
// any pin in the admin. Days are matched by their day number.
const P = {
  njp: ['New Jalpaiguri (NJP)', 26.6829, 88.4425],
  bagdogra: ['Bagdogra Airport', 26.6818, 88.3301],
  chitrey: ['Chitrey', 27.015, 88.088],
  tumling: ['Tumling', 27.0313, 88.069],
  kalipokhri: ['Kalipokhri', 27.079, 88.02],
  sandakphu: ['Sandakphu', 27.1048, 88.0015],
  phalut: ['Phalut', 27.2132, 88.0137],
  gurdum: ['Gurdum', 27.1215, 88.0567],
  darjeeling: ['Darjeeling', 27.0378, 88.2632],
  makaibari: ['Makaibari, Kurseong', 26.866, 88.272],
  tigerhill: ['Tiger Hill', 26.9949, 88.2853],
  mirik: ['Mirik Lake', 26.8899, 88.1826],
  reshikhola: ['Reshikhola', 27.1618, 88.6526],
  zuluk: ['Zuluk', 27.2526, 88.7773],
  gnathang: ['Gnathang Valley', 27.299, 88.8178],
  aritar: ['Aritar, Lampokhari Lake', 27.1867, 88.6766],
  gangtok: ['Gangtok', 27.329, 88.6123],
  lachen: ['Lachen', 27.7306, 88.5495],
  gurudongmar: ['Gurudongmar Lake', 28.0271, 88.7107],
  yumthang: ['Yumthang Valley', 27.8043, 88.7033],
  lataguri: ['Lataguri, Gorumara', 26.7065, 88.769],
  madarihat: ['Madarihat, Jaldapara', 26.7198, 89.1853],
  jaldapara: ['Jaldapara National Park', 26.69, 89.29],
  jayanti: ['Jayanti, Buxa', 26.6754, 89.6377],
  hasimara: ['Hasimara', 26.727, 89.3473],
};

const route = (...keys) => keys.map((k, i) => ({ day: i + 1, place: P[k][0], pin: { lat: P[k][1], lng: P[k][2] } }));

export const ROUTE_PINS = {
  'sandakphu-vintage-land-rover': route('tumling', 'kalipokhri', 'sandakphu', 'phalut', 'darjeeling', 'njp'),
  'singalila-ridge-trek': route('chitrey', 'tumling', 'kalipokhri', 'sandakphu', 'gurdum', 'darjeeling', 'bagdogra'),
  'darjeeling-colonial-tea-retreat': route('makaibari', 'makaibari', 'darjeeling', 'tigerhill', 'mirik'),
  'offbeat-silk-route-zuluk': route('reshikhola', 'zuluk', 'gnathang', 'aritar', 'njp'),
  'north-sikkim-gurudongmar-yumthang': route('gangtok', 'lachen', 'gurudongmar', 'yumthang', 'gangtok', 'njp'),
  'dooars-wildlife-rhino-safari': route('lataguri', 'madarihat', 'jaldapara', 'jayanti', 'hasimara'),
};

// Adds the pins to a trip's itinerary without overwriting a place or pin that is already set.
export function withPins(slug, itinerary = []) {
  const pins = ROUTE_PINS[slug];
  if (!pins) return itinerary;
  return itinerary.map((d, i) => {
    const p = pins.find((x) => x.day === Number(d.day ?? i + 1));
    return p ? { ...d, place: d.place || p.place, pin: d.pin?.lat != null ? d.pin : p.pin } : d;
  });
}
