import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArrowButton from './ArrowButton.jsx';
import Icon from './Icon.jsx';
import Pic from './Pic.jsx';
import { rankTrips } from '../lib/match.mjs';
import {
  DEFAULT_BUDGET_BANDS,
  INTERESTS,
  LENGTHS,
  TRAVELLERS,
  describePlan,
  monthOptions,
  optionValue,
  parsePlan,
  planToText,
  plannerScreens,
  serializePlan,
  withPlaces,
} from '../lib/planner.mjs';
import { dateRange } from '../lib/departures.mjs';
import { money, waLink } from '../lib/format.js';

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Choices as pills, or as photo cards when any choice has a photo.
function Choices({ name, items, multi, selected, onPick }) {
  const isOn = (v) => (multi ? selected.includes(v) : selected === v);
  if (items.some((it) => it.image))
    return (
      <div className="dest-picks">
        {items.map((it) => (
          <label key={it.value} className="dest-pick">
            <input type={multi ? 'checkbox' : 'radio'} name={name} checked={isOn(it.value)} onChange={() => onPick(it.value)} />
            {it.image ? <Pic src={it.image} sizes="(max-width: 640px) 46vw, 220px" alt="" loading="lazy" decoding="async" width="320" height="240" /> : <span className="dest-pick-blank" aria-hidden="true" />}
            <span className="dest-pick-name">{it.label}</span>
            <span className="dest-pick-tick" aria-hidden="true">
              <Icon name="check" />
            </span>
          </label>
        ))}
      </div>
    );
  return (
    <div className="pick-row">
      {items.map((it) => (
        <label key={it.value} className="pick">
          <input type={multi ? 'checkbox' : 'radio'} name={name} checked={isOn(it.value)} onChange={() => onPick(it.value)} />
          <span>{it.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function Planner({ settings, trips, destinations, questions = [], departures = [] }) {
  const { isReady, query } = useRouter();
  const bands = settings.budget_bands?.length ? settings.budget_bands : DEFAULT_BUDGET_BANDS;
  const screens = useMemo(() => plannerScreens(questions), [questions]);
  // the URL is only readable after hydration; the key remounts the planner with the saved answers
  const initial = useMemo(
    () =>
      parsePlan(isReady ? query : {}, {
        destinationSlugs: destinations.map((d) => d.slug),
        bandCount: bands.length,
        tripSlugs: trips.map((t) => t.slug),
        custom: screens.flat().filter((q) => !q.maps_to),
        screens: screens.length,
        departureIds: departures.map((d) => d.id),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReady]
  );
  return (
    <>
      <PlannerInner
        key={isReady ? 'ready' : 'first'}
        initial={initial}
        settings={settings}
        trips={trips}
        destinations={destinations}
        bands={bands}
        screens={screens}
        departures={departures}
      />
      <noscript>
        <p className="notice bad">The planner needs JavaScript. You can still reach us on WhatsApp or by phone with the details on this page.</p>
      </noscript>
    </>
  );
}

function PlannerInner({ initial, settings, trips, destinations, bands, screens, departures }) {
  const router = useRouter();
  const departure = departures.find((d) => d.id === initial.dep);
  const askedSlug = departure?.trip_slug || initial.trip;
  const total = screens.length;
  const [plan, setPlan] = useState(initial.plan);
  const [step, setStep] = useState(Math.min(initial.step, total + 1));
  const [prefer, setPrefer] = useState('');
  const [missing, setMissing] = useState({});
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

  const custom = useMemo(() => screens.flat().filter((q) => !q.maps_to).map((q) => withPlaces(q, destinations)), [screens, destinations]);
  const screenOf = useMemo(() => {
    const m = {};
    screens.forEach((s, i) => s.forEach((q) => (m[q.maps_to || q.key] = i + 1)));
    if (m.group && !m.travelling) m.travelling = m.group;
    if (m.length && !m.month) m.month = m.length;
    return m;
  }, [screens]);

  const sync = (p, s) =>
    router.replace({ pathname: router.pathname, query: serializePlan(p, s, initial.trip, initial.dep) }, undefined, { shallow: true, scroll: false });
  const update = (patch) => {
    const next = { ...plan, ...patch };
    setPlan(next);
    sync(next, step);
  };
  const setAnswer = (key, v) => update({ answers: { ...plan.answers, [key]: v } });
  const go = (n) => {
    setMissing({});
    setStep(n);
    sync(plan, n);
  };

  const answered = (q) => {
    switch (q.maps_to) {
      case 'destinations':
        return plan.destinations.length > 0;
      case 'month':
        return Boolean(plan.month);
      case 'length':
        return Boolean(plan.length);
      case 'travelling':
        return Boolean(plan.travelling);
      case 'budget':
        return plan.budget != null;
      case 'interests':
        return plan.interests.length > 0;
      case 'group':
        return true;
      default: {
        const v = plan.answers[q.key];
        return Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '';
      }
    }
  };
  const next = () => {
    const gaps = Object.fromEntries((screens[step - 1] || []).filter((q) => q.required && !answered(q)).map((q) => [q.key, 'Please answer this to continue.']));
    setMissing(gaps);
    if (Object.keys(gaps).length) return document.getElementById(`pq-${Object.keys(gaps)[0]}`)?.focus();
    go(step + 1);
  };

  const ctx = { destinations, bands, screenOf, questions: custom };
  const matches = useMemo(() => rankTrips(trips, plan, destinations, bands), [trips, plan, destinations, bands]);
  const asked = trips.find((t) => t.slug === askedSlug);
  const options = [
    ...(asked ? [{ trip: asked, reasons: [departure ? 'The date you picked' : 'You asked about this trip'], warnings: [] }] : []),
    ...matches.filter((m) => m.trip.slug !== askedSlug),
  ];
  const choice = prefer || options[0]?.trip.slug || '__none';
  const chosenTrip = trips.find((t) => t.slug === choice);
  const useDate = departure && choice === departure.trip_slug;
  const rows = [...(useDate ? [['Date', `${dateRange(departure.start_date, departure.end_date)}, ${departure.trip_title}`, null]] : []), ...describePlan(plan, ctx)];
  const wa = waLink(
    settings.whatsapp,
    [planToText(plan, ctx, { brand: settings.brand_name, tripTitles: options.map((o) => o.trip.title) }), useDate && `- Date: ${dateRange(departure.start_date, departure.end_date)}`].filter(Boolean).join('\n')
  );

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
      answers: plan.answers,
      departure_id: useDate ? departure.id : '',
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

  // One question's input. The matching questions keep their fixed choices; the owner can rename them.
  const label = (q, id, fallback) => q.options.find((o) => optionValue(o) === id)?.label || fallback;
  const image = (q, id) => q.options.find((o) => optionValue(o) === id)?.image || '';
  function renderInput(q) {
    const id = `pq-${q.key}`;
    switch (q.maps_to) {
      case 'destinations':
        return (
          <Choices
            name={id}
            multi
            items={destinations.map((d) => ({ value: d.slug, label: d.name, image: d.hero_image }))}
            selected={plan.destinations}
            onPick={(v) => update({ destinations: toggle(plan.destinations, v) })}
          />
        );
      case 'month':
        return (
          <div className="field">
            <label htmlFor={id}>Month</label>
            <select id={id} value={plan.month} onChange={(e) => update({ month: e.target.value })}>
              <option value="">Not sure yet</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'length':
        return <Choices name={id} items={LENGTHS.map((l) => ({ value: l.id, label: label(q, l.id, l.label), image: image(q, l.id) }))} selected={plan.length} onPick={(v) => update({ length: v })} />;
      case 'travelling':
        return <Choices name={id} items={TRAVELLERS.map((t) => ({ value: t.id, label: label(q, t.id, t.label), image: image(q, t.id) }))} selected={plan.travelling} onPick={(v) => update({ travelling: v })} />;
      case 'group':
        return (
          <div className="form-grid">
            <div className="field">
              <label htmlFor={id}>Adults</label>
              <select id={id} value={plan.adults} onChange={(e) => update({ adults: Number(e.target.value) })}>
                {range(1, 20).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${id}-children`}>Children</label>
              <select id={`${id}-children`} value={plan.children} onChange={(e) => update({ children: Number(e.target.value) })}>
                {range(0, 10).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 'budget':
        return (
          <Choices
            name={id}
            items={[{ value: '', label: 'Not sure yet' }, ...bands.map((b, i) => ({ value: String(i), label: b.label }))]}
            selected={plan.budget == null ? '' : String(plan.budget)}
            onPick={(v) => update({ budget: v === '' ? null : Number(v) })}
          />
        );
      case 'interests':
        return (
          <Choices
            name={id}
            multi
            items={INTERESTS.map((i) => ({ value: i.id, label: label(q, i.id, i.label), image: image(q, i.id) }))}
            selected={plan.interests}
            onPick={(v) => update({ interests: toggle(plan.interests, v) })}
          />
        );
      default:
        break;
    }
    const cq = withPlaces(q, destinations);
    const value = plan.answers[q.key];
    if (cq.type === 'single' || cq.type === 'multi') {
      const items = cq.options.map((o) => ({ value: optionValue(o), label: o.label, image: o.image }));
      const multi = cq.type === 'multi';
      return (
        <Choices
          name={id}
          multi={multi}
          items={items}
          selected={multi ? (Array.isArray(value) ? value : []) : value || ''}
          onPick={(v) => setAnswer(q.key, multi ? toggle(Array.isArray(value) ? value : [], v) : v)}
        />
      );
    }
    const common = { id, value: value ?? '', 'aria-invalid': missing[q.key] ? 'true' : undefined, 'aria-describedby': missing[q.key] ? `${id}-err` : undefined };
    if (cq.type === 'number')
      return <input {...common} className="pq-short" type="number" min="0" max="100000" inputMode="numeric" onChange={(e) => setAnswer(q.key, e.target.value)} aria-label={q.title} />;
    if (cq.type === 'date') return <input {...common} className="pq-short" type="date" onChange={(e) => setAnswer(q.key, e.target.value)} aria-label={q.title} />;
    return <textarea {...common} maxLength={500} onChange={(e) => setAnswer(q.key, e.target.value)} aria-label={q.title} />;
  }

  if (step <= total) {
    const qs = screens[step - 1];
    const [first, ...rest] = qs;
    const renderBlock = (q, heading) => (
      <div className="pq" role="group" aria-labelledby={heading ? 'planner-title' : `pq-${q.key}-t`}>
        {!heading && (
          <p className="label pq-title" id={`pq-${q.key}-t`}>
            {q.title}
            {q.required && <span aria-hidden="true"> *</span>}
          </p>
        )}
        {!heading && q.help && <p className="planner-hint">{q.help}</p>}
        {renderInput(q)}
        {missing[q.key] && (
          <p className="error" id={`pq-${q.key}-err`} role="alert">
            {missing[q.key]}
          </p>
        )}
      </div>
    );
    return (
      <div className="planner">
        <div className="planner-top">
          <p>
            Step {step} of {total}
          </p>
          <div className="planner-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="Planner progress">
            <span style={{ transform: `scaleX(${step / total})` }} />
          </div>
        </div>
        <section aria-labelledby="planner-title">
          <h2 id="planner-title" ref={head} tabIndex={-1} className="planner-title">
            {first.title}
            {first.required && <span aria-hidden="true"> *</span>}
          </h2>
          {first.help && <p className="planner-hint">{first.help}</p>}
          <div className="pq-stack">
            {renderBlock(first, true)}
            {rest.map((q) => (
              <div key={q.key}>{renderBlock(q, false)}</div>
            ))}
          </div>
          <div className="planner-actions">
            {step > 1 && (
              <button type="button" className="btn-ghost" onClick={() => go(step - 1)}>
                Back
              </button>
            )}
            <ArrowButton onClick={next}>{step === total ? 'See my trips' : 'Next'}</ArrowButton>
          </div>
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
          {rows.map(([label, value, editStep]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
              {editStep ? (
                <button type="button" className="linklike" onClick={() => go(editStep)} aria-label={`Change ${label.toLowerCase()}`}>
                  Change
                </button>
              ) : (
                <span />
              )}
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
                    <Pic src={trip.hero_image} sizes="88px" alt="" loading="lazy" decoding="async" width="88" height="88" />
                    <span className="match-body">
                      <strong>{trip.title}</strong>
                      <small>
                        {departure && trip.slug === departure.trip_slug
                          ? `${dateRange(departure.start_date, departure.end_date)}, ${money(departure.price, trip.currency)} per person`
                          : `${trip.duration_label}, from ${money(trip.price, trip.currency)} per person`}
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
              <label className="pick">
                <input type="radio" name="prefer" checked={choice === '__none'} onChange={() => setPrefer('__none')} />
                <span>No preference, plan something for me</span>
              </label>
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
              {total > 0 && (
                <button type="button" className="btn-ghost" onClick={() => go(total)}>
                  Back
                </button>
              )}
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

