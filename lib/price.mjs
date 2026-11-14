// Trip price estimate for the "Make it yours" panel. The trip page and the enquiry API both call
// `estimate`, so the figure a traveller sees is the figure that is saved. Whole rupees only.
// Pure JavaScript with no imports, so it also runs in plain Node tests.

export const MAX_PEOPLE = { adults: 30, children: 30 };
const CAP = 10_000_000; // ₹1 crore: anything above is a typo, not a price

const rupees = (v) => {
  if (v == null || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, CAP) : null;
};
const count = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Stable id for an option from its name, so a saved selection survives the owner reordering the list.
export function optionId(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// The owner's stay levels and add-ons, with anything incomplete dropped (no name, no valid price, repeated name).
export function tripOptions(trip = {}) {
  const seen = new Set();
  const keep = (o) => {
    const id = optionId(o?.name);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  };
  const stays = (Array.isArray(trip.stay_levels) ? trip.stay_levels : [])
    .filter(keep)
    .map((o) => ({ id: optionId(o.name), name: String(o.name).trim(), price: rupees(o.price) ?? 0, note: o.note || '' }));
  seen.clear();
  const addons = (Array.isArray(trip.addons) ? trip.addons : [])
    .filter((o) => rupees(o?.price) != null && keep(o))
    .map((o) => ({
      id: optionId(o.name),
      name: String(o.name).trim(),
      price: rupees(o.price),
      per: o.per === 'group' ? 'group' : 'person',
      child_price: o.per === 'group' ? null : rupees(o.child_price === '' ? null : o.child_price),
      note: o.note || '',
    }));
  return { stays, addons };
}

// Whatever the browser sends, keep only values the trip actually offers. The first stay level is the default.
export function cleanSelection(sel = {}, trip = {}) {
  const { stays, addons } = tripOptions(trip);
  const adults = count(sel.adults, 1, MAX_PEOPLE.adults, 2);
  const children = count(sel.children, 0, MAX_PEOPLE.children, 0);
  const stay = stays.some((s) => s.id === sel.stay) ? sel.stay : stays[0]?.id || '';
  const picked = Array.isArray(sel.addons) ? sel.addons : [];
  return { adults, children, stay, addons: addons.filter((a) => picked.includes(a.id)).map((a) => a.id) };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const peopleLabel = (adults, children) =>
  [plural(adults, 'adult', 'adults'), children > 0 && plural(children, 'child', 'children')].filter(Boolean).join(', ');

// { selection, lines: [{ label, amount }], total } for a trip and a (cleaned) selection.
export function estimate(trip = {}, raw = {}) {
  const sel = cleanSelection(raw, trip);
  const { stays, addons } = tripOptions(trip);
  const adultPrice = rupees(trip.price) ?? 0;
  const childPrice = rupees(trip.child_price === '' ? null : trip.child_price) ?? adultPrice;
  const people = sel.adults + sel.children;
  const lines = [];

  lines.push({ label: `Trip, ${plural(sel.adults, 'adult', 'adults')}`, amount: adultPrice * sel.adults });
  if (sel.children) lines.push({ label: `Trip, ${plural(sel.children, 'child', 'children')}`, amount: childPrice * sel.children });

  const stay = stays.find((s) => s.id === sel.stay);
  if (stay && stay.price > 0) lines.push({ label: `${stay.name} stays, ${plural(people, 'person', 'people')}`, amount: stay.price * people });

  for (const a of addons.filter((x) => sel.addons.includes(x.id))) {
    const amount = a.per === 'group' ? a.price : a.price * sel.adults + (a.child_price ?? a.price) * sel.children;
    lines.push({ label: a.per === 'group' ? `${a.name} (for the group)` : `${a.name}, ${plural(people, 'person', 'people')}`, amount });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    selection: { ...sel, stay_name: stay?.name || '', addon_names: addons.filter((x) => sel.addons.includes(x.id)).map((x) => x.name) },
    lines,
    total,
    people,
  };
}

// The written-out selection, for WhatsApp and the owner's email.
export function selectionText(trip, est, money = (n) => `₹${n.toLocaleString('en-IN')}`) {
  const s = est.selection;
  return [
    `Trip: ${trip.title}`,
    `Travellers: ${peopleLabel(s.adults, s.children)}`,
    s.stay_name && `Stays: ${s.stay_name}`,
    s.addon_names.length && `Add-ons: ${s.addon_names.join(', ')}`,
    `Estimate shown: ${money(est.total)}`,
  ]
    .filter(Boolean)
    .join('\n');
}
