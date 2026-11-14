// Departure and pop-up date rules. Pure JavaScript with no imports, shared by the pages, the API and the browser.

export const DEPARTURE_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'filling', label: 'Filling fast' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Today's date in India, as YYYY-MM-DD (the server may run in another time zone).
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
}

export function isBookable(d, today = todayIST()) {
  if (!d || d.published === false) return false;
  if (!['open', 'filling'].includes(d.status)) return false;
  if (!d.start_date || String(d.start_date).slice(0, 10) < today) return false;
  if (d.seats_left != null && d.seats_left !== '' && Number(d.seats_left) <= 0) return false;
  return true;
}

export function isPopupLive(p, today = todayIST()) {
  if (!p || p.published === false) return false;
  if (p.starts_on && String(p.starts_on).slice(0, 10) > today) return false;
  if (p.ends_on && String(p.ends_on).slice(0, 10) < today) return false;
  return true;
}

const fmt = (iso, opts) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });

// "22 Nov to 27 Nov 2026", or "28 Dec 2026 to 2 Jan 2027" across a year end.
export function dateRange(start, end) {
  if (!start) return '';
  const sameYear = String(start).slice(0, 4) === String(end || start).slice(0, 4);
  const a = fmt(start, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  const b = fmt(end || start, { day: 'numeric', month: 'short', year: 'numeric' });
  return end && end !== start ? `${a} to ${b}` : b;
}

// Which pages a pop-up is allowed on. Chosen pages may end in * to cover a section, for example /packages/*.
export function popupMatchesPath(p, path) {
  const clean = (String(path || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/');
  if (clean === '/admin' || clean.startsWith('/admin/') || clean.startsWith('/invoice/')) return false;
  if (p.pages === 'home') return clean === '/';
  if (p.pages === 'chosen') {
    return (p.page_paths || []).some((raw) => {
      const r = String(raw || '').trim().replace(/\/+$/, '') || '/';
      return r.endsWith('*') ? clean.startsWith(r.slice(0, -1)) : clean === r;
    });
  }
  return true;
}
