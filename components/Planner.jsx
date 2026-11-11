import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArrowButton from './ArrowButton.jsx';
import Icon from './Icon.jsx';
import { rankTrips } from '../lib/match.mjs';
import {
  DEFAULT_BUDGET_BANDS,
  INTERESTS,
  LENGTHS,
  TRAVELLERS,
  describePlan,
  monthOptions,
  parsePlan,
  planToText,
  serializePlan,
} from '../lib/planner.mjs';
import { money, waLink } from '../lib/format.js';

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const STEPS = [
  { title: 'Where do you want to go?', hint: 'Pick one or more places. Skip this if you are not sure yet.' },
  { title: 'When are you thinking of travelling?', hint: 'A rough month is enough.' },
  { title: 'Who is coming?', hint: 'This helps us suggest the right pace and altitude.' },
  { title: 'What is your budget per person?', hint: 'It covers transport, stays, permits and most meals on the route.' },
  { title: 'What do you enjoy?', hint: 'Pick as many as you like.' },
];

function Pick({ type, name, checked, onChange, children }) {
  return (
    <label className="pick">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

export default function Planner({ settings, trips, destinations }) {
  const { isReady, query } = useRouter();
  const bands = settings.budget_bands?.length ? settings.budget_bands : DEFAULT_BUDGET_BANDS;
  // the URL is only readable after hydration; the key remounts the planner with the saved answers
  const initial = useMemo(
    () => parsePlan(isReady ? query : {}, { destinationSlugs: destinations.map((d) => d.slug), bandCount: bands.length, tripSlugs: trips.map((t) => t.slug) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReady]
  );
  return (
    <>
      <PlannerInner key={isReady ? 'ready' : 'first'} initial={initial} settings={settings} trips={trips} destinations={destinations} bands={bands} />
      <noscript>
        <p className="notice bad">The planner needs JavaScript. You can still reach us on WhatsApp or by phone with the details on this page.</p>
      </noscript>
    </>
  );
}

function PlannerInner({ initial, settings, trips, destinations, bands }) {
  const router = useRouter();
  const askedSlug = initial.trip;
  const [plan, setPlan] = useState(initial.plan);
  const [step, setStep] = useState(initial.step);
  const [prefer, setPrefer] = useState('');
  const [send, setSend] = useState({ status: 'idle', msg: '', errors: {} });
  const months = useMemo(() => monthOptions(new Date()), []);
  const head = useRef(null);
  const mounted = useRef(false);

  // move focus to the new step's heading so keyboard and screen reader users land in the right place
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    head.current?.focus();
  }, [step]);

  const sync = (p, s) =>
    router.replace({ pathname: router.pathname, query: serializePlan(p, s, askedSlug) }, undefined, { shallow: true, scroll: false });
  const update = (patch) => {
    const next = { ...plan, ...patch };
    setPlan(next);
    sync(next, step);
  };
  const go = (n) => {
    setStep(n);
    sync(plan, n);
  };

  const ctx = { destinations, bands };
  const matches = useMemo(() => rankTrips(trips, plan, destinations, bands), [trips, plan, destinations, bands]);
  const asked = trips.find((t) => t.slug === askedSlug);
  const options = [
    ...(asked ? [{ trip: asked, reasons: ['You asked about this trip'], warnings: [] }] : []),
    ...matches.filter((m) => m.trip.slug !== askedSlug),
  ];
  const choice = prefer || options[0]?.trip.slug || '__none';
  const chosenTrip = trips.find((t) => t.slug === choice);
  const wa = waLink(settings.whatsapp, planToText(plan, ctx, { brand: settings.brand_name, tripTitles: options.map((o) => o.trip.title) }));

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get('name'),
      phone: f.get('phone'),
      email: f.get('email'),
      notes: f.get('notes'),
      company: f.get('company'),
      trip: chosenTrip ? chosenTrip.title : 'A custom trip',
      destinations: destinations.filter((d) => plan.destinations.includes(d.slug)).map((d) => d.name),
      travel_month: plan.month,
      trip_length: plan.length,
      adults: plan.adults,
      children: plan.children,
      travelling_with: plan.travelling,
      budget_label: plan.budget != null ? bands[plan.budget]?.label : '',
      interests: plan.interests,
      matched_trips: options.map((o) => o.trip.slug),
    };
    setSend({ status: 'busy', msg: '', errors: {} });
    try {
      const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return setSend({ status: 'error', msg: out.error || 'Something went wrong. Please try WhatsApp instead.', errors: out.fields || {} });
      setSend({ status: 'done', msg: '', errors: {} });
    } catch {
      setSend({ status: 'error', msg: 'No connection. Please try again, or message us on WhatsApp.', errors: {} });
    }
  }

  const err = (k) => send.errors[k];
  const fp = (k) => ({ id: `pl-${k}`, name: k, 'aria-invalid': err(k) ? 'true' : undefined, 'aria-describedby': err(k) ? `pl-${k}-err` : undefined });

  if (send.status === 'done') {
    return (
      <div role="status" className="stack">
        <span className="icon-chip" style={{ marginBottom: 0 }}>
          <Icon name="check" />
        </span>
        <h2 style={{ fontSize: 'var(--fs-h3)' }}>Thank you, we have your plan.</h2>
        <p className="muted">We will reply on the number you gave us with a route and a price per person. If it is urgent, message us on WhatsApp.</p>
        {wa && (
          <a className="btn-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" />
            Continue on WhatsApp
          </a>
        )}
      </div>
    );
  }

  const actions = (
    <div className="planner-actions">
      {step > 1 && (
        <button type="button" className="btn-ghost" onClick={() => go(step - 1)}>
          Back
        </button>
      )}
      <ArrowButton onClick={() => go(step + 1)}>{step === 5 ? 'See my trips' : 'Next'}</ArrowButton>
    </div>
  );

  if (step <= 5) {
    const s = STEPS[step - 1];
    return (
      <div className="planner">
        <div className="planner-top">
          <p>
            Step {step} of 5
          </p>
          <div className="planner-progress" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step} aria-label="Planner progress">
            <span style={{ transform: `scaleX(${step / 5})` }} />
          </div>
        </div>
        <section aria-labelledby="planner-title">
          <h2 id="planner-title" ref={head} tabIndex={-1} className="planner-title">
            {s.title}
          </h2>
          <p className="planner-hint">{s.hint}</p>

          {step === 1 && (
            <div className="dest-picks">
              {destinations.map((d) => (
                <label key={d.slug} className="dest-pick">
                  <input type="checkbox" checked={plan.destinations.includes(d.slug)} onChange={() => update({ destinations: toggle(plan.destinations, d.slug) })} />
                  <img src={d.hero_image} alt="" loading="lazy" decoding="async" width="320" height="240" />
                  <span className="dest-pick-name">{d.name}</span>
                  <span className="dest-pick-tick" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pl-month">Month</label>
                <select id="pl-month" value={plan.month} onChange={(e) => update({ month: e.target.value })}>
                  <option value="">Not sure yet</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="label">How long?</legend>
                <div className="pick-row">
                  {LENGTHS.map((l) => (
                    <Pick key={l.id} type="radio" name="length" checked={plan.length === l.id} onChange={() => update({ length: l.id })}>
                      {l.label}
                    </Pick>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="label">Travelling as</legend>
                <div className="pick-row">
                  {TRAVELLERS.map((t) => (
                    <Pick key={t.id} type="radio" name="travelling" checked={plan.travelling === t.id} onChange={() => update({ travelling: t.id })}>
                      {t.label}
                    </Pick>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="pl-adults">Adults</label>
                <select id="pl-adults" value={plan.adults} onChange={(e) => update({ adults: Number(e.target.value) })}>
                  {range(1, 20).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pl-children">Children</label>
                <select id="pl-children" value={plan.children} onChange={(e) => update({ children: Number(e.target.value) })}>
                  {range(0, 10).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="pick-row">
              <Pick type="radio" name="budget" checked={plan.budget == null} onChange={() => update({ budget: null })}>
                Not sure yet
              </Pick>
              {bands.map((b, i) => (
                <Pick key={b.label} type="radio" name="budget" checked={plan.budget === i} onChange={() => update({ budget: i })}>
                  {b.label}
                </Pick>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="pick-row">
              {INTERESTS.map((i) => (
                <Pick key={i.id} type="checkbox" name="interests" checked={plan.interests.includes(i.id)} onChange={() => update({ interests: toggle(plan.interests, i.id) })}>
                  {i.label}
                </Pick>
              ))}
            </div>
          )}

          {actions}
        </section>
      </div>
    );
  }

  return (
    <div className="planner">
      <section aria-labelledby="planner-title">
        <h2 id="planner-title" ref={head} tabIndex={-1} className="planner-title">
          Your plan
        </h2>
        <dl className="plan-summary">
          {describePlan(plan, ctx).map(([label, value, editStep]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
              <button type="button" className="linklike" onClick={() => go(editStep)} aria-label={`Change ${label.toLowerCase()}`}>
                Change
              </button>
            </div>
          ))}
        </dl>

        <form onSubmit={submit} noValidate>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="planner-title" style={{ fontSize: 'var(--fs-h3)' }}>
              {options.length ? 'Trips that fit' : 'Let us build it for you'}
            </legend>
            {options.length === 0 && (
              <p className="planner-hint">Nothing on our list matches all of that, which is fine. Send the plan and we will put a route together for you.</p>
            )}
            <div className="match-list">
              {options.map(({ trip, reasons, warnings }) => (
                <div key={trip.slug} className="match">
                  <label className="match-pick">
                    <input type="radio" name="prefer" value={trip.slug} checked={choice === trip.slug} onChange={() => setPrefer(trip.slug)} />
                    <img src={trip.hero_image} alt="" loading="lazy" decoding="async" width="88" height="88" />
                    <span className="match-body">
                      <strong>{trip.title}</strong>
                      <small>
                        {trip.duration_label}, from {money(trip.price, trip.currency)} per person
                      </small>
                      <span className="chips">
                        {reasons.slice(0, 3).map((r) => (
                          <span key={r} className="chip chip-plain">
                            {r}
                          </span>
                        ))}
                        {warnings.map((w) => (
                          <span key={w} className="chip chip-warn">
                            {w}
                          </span>
                        ))}
                      </span>
                    </span>
                  </label>
                  <Link href={`/packages/${trip.slug}`} className="text-link">
                    View trip
                  </Link>
                </div>
              ))}
              <Pick type="radio" name="prefer" checked={choice === '__none'} onChange={() => setPrefer('__none')}>
                No preference, plan something for me
              </Pick>
            </div>
          </fieldset>

          <h3 className="planner-title" style={{ fontSize: 'var(--fs-h3)', marginTop: 'var(--sp-7)' }}>
            Where should we send it?
          </h3>
          <div className="form-grid" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="field">
              <label htmlFor="pl-name">Your name</label>
              <input {...fp('name')} required autoComplete="name" maxLength={80} />
              {err('name') && <p className="error" id="pl-name-err">{err('name')}</p>}
            </div>
            <div className="field">
              <label htmlFor="pl-phone">Phone or WhatsApp</label>
              <input {...fp('phone')} type="tel" required autoComplete="tel" inputMode="tel" maxLength={20} />
              {err('phone') && <p className="error" id="pl-phone-err">{err('phone')}</p>}
            </div>
            <div className="field full">
              <label htmlFor="pl-email">Email (optional)</label>
              <input {...fp('email')} type="email" autoComplete="email" maxLength={120} />
              {err('email') && <p className="error" id="pl-email-err">{err('email')}</p>}
            </div>
            <div className="field full">
              <label htmlFor="pl-notes">Anything we should know? (optional)</label>
              <textarea {...fp('notes')} maxLength={1500} />
              <p className="hint">Ages of children, fitness, food preferences, places you want to see.</p>
            </div>
            <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {send.status === 'error' && (
              <p className="notice bad full" role="alert">
                {send.msg}
              </p>
            )}
            <div className="full planner-actions">
              <button type="button" className="btn-ghost" onClick={() => go(5)}>
                Back
              </button>
              <ArrowButton type="submit" disabled={send.status === 'busy'}>
                {send.status === 'busy' ? 'Sending' : 'Send my plan'}
              </ArrowButton>
              {wa && (
                <a className="btn-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" />
                  Send on WhatsApp instead
                </a>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
