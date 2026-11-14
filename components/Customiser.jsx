import { useMemo, useState } from 'react';
import ArrowButton from './ArrowButton.jsx';
import Icon from './Icon.jsx';
import { money, waLink } from '../lib/format.js';
import { monthOptions } from '../lib/planner.mjs';
import { MAX_PEOPLE, estimate, peopleLabel, selectionText, tripOptions } from '../lib/price.mjs';

function Counter({ id, label, value, min, max, onChange }) {
  return (
    <div className="mk-count">
      <span id={`${id}-label`}>{label}</span>
      <div className="mk-count-ctl" role="group" aria-labelledby={`${id}-label`}>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite" aria-label={`${value} ${label.toLowerCase()}`}>{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

/*
  "Make it yours": travellers, stay level and add-ons, with a live estimate.
  The same estimate() runs on the server when the request is sent, so the saved figure is the one shown.
*/
export default function Customiser({ pkg, settings }) {
  const { stays, addons } = useMemo(() => tripOptions(pkg), [pkg]);
  const [sel, setSel] = useState({ adults: 2, children: 0, stay: stays[0]?.id || '', addons: [] });
  const [form, setForm] = useState(false);
  const [send, setSend] = useState({ status: 'idle', msg: '', errors: {} });
  const est = useMemo(() => estimate(pkg, sel), [pkg, sel]);
  const cur = (n) => money(n, pkg.currency || '₹');
  const update = (patch) => setSel((s) => ({ ...s, ...patch }));
  const toggle = (id) => update({ addons: sel.addons.includes(id) ? sel.addons.filter((x) => x !== id) : [...sel.addons, id] });
  const wa = waLink(settings.whatsapp, `Hi ${settings.brand_name}! I would like a price for this:\n${selectionText(pkg, est, cur)}`);
  const childNote = pkg.child_price != null && pkg.child_price !== '' && Number(pkg.child_price) !== Number(pkg.price);

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSend({ status: 'busy', msg: '', errors: {} });
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'),
          phone: f.get('phone'),
          email: f.get('email'),
          notes: f.get('notes'),
          company: f.get('company'),
          travel_month: f.get('month'),
          trip: pkg.title,
          trip_slug: pkg.slug,
          adults: sel.adults,
          children: sel.children,
          selection: sel,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return setSend({ status: 'error', msg: out.error || 'Something went wrong. Please try WhatsApp instead.', errors: out.fields || {} });
      setSend({ status: 'done', msg: '', errors: {} });
    } catch {
      setSend({ status: 'error', msg: 'No connection. Please try again, or message us on WhatsApp.', errors: {} });
    }
  }
  const err = (k) => send.errors[k];
  const fp = (k) => ({ id: `mk-${k}`, name: k, 'aria-invalid': err(k) ? 'true' : undefined, 'aria-describedby': err(k) ? `mk-${k}-err` : undefined });

  return (
    <section className="trip-block mk" id="make-it-yours" aria-labelledby="mk-title">
      <h2 id="mk-title">Make it yours</h2>
      <p className="muted mk-lead">Choose who is coming, where you sleep and any extras. The price updates as you go.</p>

      <div className="mk-grid">
        <div className="mk-choices">
          <fieldset className="mk-set">
            <legend>Who is coming</legend>
            <div className="mk-counts">
              <Counter id="mk-adults" label="Adults" value={sel.adults} min={1} max={MAX_PEOPLE.adults} onChange={(adults) => update({ adults })} />
              <Counter id="mk-children" label="Children" value={sel.children} min={0} max={MAX_PEOPLE.children} onChange={(children) => update({ children })} />
            </div>
            {childNote && <p className="mk-hint">The trip costs {cur(pkg.child_price)} for each child.</p>}
          </fieldset>

          {stays.length > 1 && (
            <fieldset className="mk-set">
              <legend>Where you sleep</legend>
              <div className="mk-options">
                {stays.map((s) => (
                  <label key={s.id} className={`mk-opt${sel.stay === s.id ? ' is-on' : ''}`}>
                    <input type="radio" name="mk-stay" value={s.id} checked={sel.stay === s.id} onChange={() => update({ stay: s.id })} />
                    <span className="mk-opt-body">
                      <strong>{s.name}</strong>
                      {s.note && <small>{s.note}</small>}
                    </span>
                    <span className="mk-opt-price">{s.price ? `+${cur(s.price)} pp` : 'Included'}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {addons.length > 0 && (
            <fieldset className="mk-set">
              <legend>Add to your trip</legend>
              <div className="mk-options">
                {addons.map((a) => (
                  <label key={a.id} className={`mk-opt is-check${sel.addons.includes(a.id) ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={sel.addons.includes(a.id)} onChange={() => toggle(a.id)} />
                    <span className="mk-opt-body">
                      <strong>{a.name}</strong>
                      {a.note && <small>{a.note}</small>}
                    </span>
                    <span className="mk-opt-price">
                      +{cur(a.price)} {a.per === 'group' ? 'per group' : 'pp'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <aside className="mk-total" aria-live="polite">
          <p className="mk-total-label">Estimate for {peopleLabel(est.selection.adults, est.selection.children)}</p>
          <p className="mk-total-amount">
            <span className="sr-only">About </span>
            {cur(est.total)}
          </p>
          <dl className="mk-lines">
            {est.lines.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>{cur(l.amount)}</dd>
              </div>
            ))}
          </dl>
          <p className="mk-hint">An estimate. We confirm the final price in writing before you pay anything.</p>

          {send.status === 'done' ? (
            <div className="mk-done" role="status">
              <span className="icon-chip">
                <Icon name="check" />
              </span>
              <p>
                <strong>Thank you.</strong> We have your choices and will send the price on the number you gave.
              </p>
            </div>
          ) : (
            <div className="mk-actions">
              {!form && (
                <ArrowButton onClick={() => setForm(true)} aria-expanded={false} aria-controls="mk-form">
                  Send me this price
                </ArrowButton>
              )}
              {wa && (
                <a className="btn-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" />
                  Send on WhatsApp
                </a>
              )}
            </div>
          )}
        </aside>
      </div>

      {form && send.status !== 'done' && (
        <form id="mk-form" className="mk-form" onSubmit={submit} noValidate>
          <h3>Where should we send it?</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="mk-name">Your name</label>
              <input {...fp('name')} required autoComplete="name" maxLength={80} />
              {err('name') && <p className="error" id="mk-name-err">{err('name')}</p>}
            </div>
            <div className="field">
              <label htmlFor="mk-phone">Phone or WhatsApp</label>
              <input {...fp('phone')} type="tel" required autoComplete="tel" inputMode="tel" maxLength={20} />
              {err('phone') && <p className="error" id="mk-phone-err">{err('phone')}</p>}
            </div>
            <div className="field">
              <label htmlFor="mk-email">Email (optional)</label>
              <input {...fp('email')} type="email" autoComplete="email" maxLength={120} />
              {err('email') && <p className="error" id="mk-email-err">{err('email')}</p>}
            </div>
            <div className="field">
              <label htmlFor="mk-month">When (optional)</label>
              <select id="mk-month" name="month" defaultValue="">
                <option value="">Not sure yet</option>
                {monthOptions().map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="mk-notes">Anything else? (optional)</label>
              <textarea {...fp('notes')} maxLength={1500} />
            </div>
            <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {send.status === 'error' && (
              <p className="notice bad full" role="alert">
                {send.msg}
              </p>
            )}
          </div>
          <div className="planner-actions">
            <button type="button" className="btn-ghost" onClick={() => setForm(false)}>
              Cancel
            </button>
            <ArrowButton type="submit" disabled={send.status === 'busy'}>
              {send.status === 'busy' ? 'Sending' : `Send my choices, ${cur(est.total)}`}
            </ArrowButton>
          </div>
        </form>
      )}
    </section>
  );
}
