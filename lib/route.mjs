// Route map helpers. Pure JavaScript with no imports, shared by the trip page, the admin and the tests.

// Roughly the Eastern Himalaya and the plains below it: North Bengal, Sikkim, east Nepal, Bhutan's border.
// A pin outside this box is almost always a typo or latitude and longitude swapped.
export const REGION = { south: 25.5, north: 29, west: 86.5, east: 92.5 };

export const inRegion = (p) =>
  Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= REGION.south && p.lat <= REGION.north && p.lng >= REGION.west && p.lng <= REGION.east;

const num = (s) => Number.parseFloat(String(s).replace(',', '.'));

// Reads a pin from what an owner is likely to paste: "27.1048, 88.0015", "27.1048 88.0015",
// a Google Maps link (@lat,lng or !3dlat!4dlng or ?q=lat,lng). Returns { lat, lng } or null.
export function parseCoords(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const tries = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/];
  for (const re of tries) {
    const m = s.match(re);
    if (m) {
      const lat = num(m[1]);
      const lng = num(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
    }
  }
  return null;
}

// Map stops from itinerary days. Days that share a pin become one stop labelled with all their day numbers,
// so a two-night stay shows as "1-2" instead of two markers on top of each other.
export function routeStops(itinerary = []) {
  const stops = [];
  itinerary.forEach((d, i) => {
    const pin = d?.pin && { lat: Number(d.pin.lat), lng: Number(d.pin.lng) };
    if (!inRegion(pin)) return;
    const day = Number(d.day ?? i + 1);
    const same = stops.find((s) => Math.abs(s.lat - pin.lat) < 1e-4 && Math.abs(s.lng - pin.lng) < 1e-4);
    if (same) same.days.push(day);
    else stops.push({ lat: pin.lat, lng: pin.lng, place: d.place || d.title || `Day ${day}`, days: [day] });
  });
  return stops.map((s) => ({ ...s, label: dayRange(s.days) }));
}

// [1,2] -> "1-2", [1,5] -> "1, 5", [3] -> "3"
export function dayRange(days) {
  const out = [];
  let start = days[0];
  for (let i = 1; i <= days.length; i++) {
    if (days[i] !== days[i - 1] + 1) {
      out.push(start === days[i - 1] ? String(start) : `${start}-${days[i - 1]}`);
      start = days[i];
    }
  }
  return out.join(', ');
}

// The line follows the days in order (including a return to an earlier stop), not the merged stops.
export function routeLine(itinerary = []) {
  return itinerary
    .map((d) => d?.pin && { lat: Number(d.pin.lat), lng: Number(d.pin.lng) })
    .filter(inRegion)
    .map((p) => [p.lat, p.lng]);
}
