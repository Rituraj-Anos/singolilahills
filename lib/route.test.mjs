import assert from 'node:assert/strict';
import test from 'node:test';
import { dayRange, inRegion, parseCoords, routeLine, routeStops } from './route.mjs';

test('reads pasted coordinates and Google Maps links', () => {
  assert.deepEqual(parseCoords('27.1048, 88.0015'), { lat: 27.1048, lng: 88.0015 });
  assert.deepEqual(parseCoords('27.1048 88.0015'), { lat: 27.1048, lng: 88.0015 });
  assert.deepEqual(parseCoords('https://www.google.com/maps/place/Sandakphu/@27.1063,88.0012,15z'), { lat: 27.1063, lng: 88.0012 });
  assert.deepEqual(parseCoords('https://www.google.com/maps/place/X/data=!3d27.10612!4d88.00118'), { lat: 27.10612, lng: 88.00118 });
  assert.deepEqual(parseCoords('https://maps.google.com/?q=27.04,88.26'), { lat: 27.04, lng: 88.26 });
  assert.equal(parseCoords('Sandakphu'), null);
  assert.equal(parseCoords('200, 88'), null);
});

test('region check catches swapped latitude and longitude', () => {
  assert.equal(inRegion({ lat: 27.1, lng: 88 }), true);
  assert.equal(inRegion({ lat: 88, lng: 27.1 }), false);
  assert.equal(inRegion({ lat: NaN, lng: 88 }), false);
  assert.equal(inRegion(null), false);
});

test('days that share a pin become one stop', () => {
  const days = [
    { day: 1, place: 'Gangtok', pin: { lat: 27.329, lng: 88.6123 } },
    { day: 2, place: 'Lachen', pin: { lat: 27.7306, lng: 88.5495 } },
    { day: 3, place: 'No pin' },
    { day: 4, place: 'Swapped', pin: { lat: 88.5, lng: 27.7 } },
    { day: 5, place: 'Gangtok', pin: { lat: 27.329, lng: 88.6123 } },
  ];
  const stops = routeStops(days);
  assert.deepEqual(stops.map((s) => [s.place, s.label]), [['Gangtok', '1, 5'], ['Lachen', '2']]);
  assert.deepEqual(routeLine(days), [[27.329, 88.6123], [27.7306, 88.5495], [27.329, 88.6123]]);
});

test('day labels', () => {
  assert.equal(dayRange([1, 2]), '1-2');
  assert.equal(dayRange([1, 2, 3, 6]), '1-3, 6');
  assert.equal(dayRange([4]), '4');
});
