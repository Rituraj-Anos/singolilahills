import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { slugify } from '../../lib/admin/collections.js';
import { uploadImage } from '../../lib/admin/api.js';
import { supabase } from '../../lib/supabase.js';
import { addTiles, loadLeaflet, stopIcon } from '../../lib/map.js';
import { REGION, inRegion, parseCoords } from '../../lib/route.mjs';

// Options for ref fields, loaded once per table while the admin is open.
const refCache = new Map();
function useRefOptions(ref) {
  const key = ref ? `${ref.table}:${ref.value}:${ref.label}:${ref.label2 || ''}` : '';
  const [opts, setOpts] = useState(() => refCache.get(key) || null);
  useEffect(() => {
    if (!ref || !supabase || refCache.has(key)) return;
    let alive = true;
    supabase
      .from(ref.table)
      .select([ref.value, ref.label, ref.label2].filter(Boolean).join(', '))
      .order(ref.label)
      .then(({ data }) => {
        const list = (data || []).map((r) => ({ value: r[ref.value], label: [r[ref.label] || r[ref.value], ref.label2 && r[ref.label2]].filter(Boolean).join(', ') }));
        refCache.set(key, list);
        if (alive) setOpts(list);
      });
    return () => {
      alive = false;
    };
  }, [key, ref]);
  return opts;
}

// Place search: OpenStreetMap's free geocoder. Only runs when the owner presses Search (their usage policy
// asks for no search-as-you-type), and only looks in India, Nepal and Bhutan.
async function searchPlace(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in,np,bt&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('The place search is not answering. Paste coordinates instead.');
  const rows = await res.json();
  return rows.map((r) => ({ name: r.display_name, lat: Math.round(Number(r.lat) * 1e5) / 1e5, lng: Math.round(Number(r.lon) * 1e5) / 1e5 }));
}

function PinInput({ id, value, onChange }) {
  const pin = value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng)) ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
  const [text, setText] = useState(pin ? `${pin.lat}, ${pin.lng}` : '');
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState('');
  const [ready, setReady] = useState(false);
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const set = useRef(onChange);
  set.current = onChange;

  // small map: click to drop the pin, drag it to fine-tune
  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !box.current || map.current) return;
      const m = L.map(box.current, { scrollWheelZoom: false, zoomSnap: 0.5 });
      addTiles(L, m);
      const start = pin || { lat: (REGION.south + REGION.north) / 2, lng: 88.4 };
      m.setView([start.lat, start.lng], pin ? 11 : 7);
      m.on('click', (e) => set.current({ lat: Math.round(e.latlng.lat * 1e5) / 1e5, lng: Math.round(e.latlng.lng * 1e5) / 1e5 }));
      map.current = m;
      map.current._L = L;
      setReady(true);
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the marker and the text box in step with the saved value
  useEffect(() => {
    const m = map.current;
    if (pin) setText(`${pin.lat}, ${pin.lng}`);
    if (!m) return;
    const L = m._L;
    if (!pin) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = L.marker([pin.lat, pin.lng], { draggable: true, icon: stopIcon(L, '•') }).addTo(m);
      marker.current.on('dragend', (e) => {
        const p = e.target.getLatLng();
        set.current({ lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5 });
      });
    } else marker.current.setLatLng([pin.lat, pin.lng]);
    if (!m.getBounds().contains([pin.lat, pin.lng])) m.setView([pin.lat, pin.lng], Math.max(m.getZoom(), 10));
  }, [ready, pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  function typed(v) {
    setText(v);
    if (!v.trim()) return;
    const p = parseCoords(v);
    if (p) {
      setMsg('');
      onChange(p);
    }
  }
  async function find() {
    if (!q.trim()) return;
    setMsg('Searching');
    try {
      const rows = await searchPlace(q.trim());
      setFound(rows);
      setMsg(rows.length ? '' : 'Nothing found. Try a nearby town, or paste coordinates from Google Maps.');
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="adm-pin">
      <div className="adm-inline">
        <input
          id={id}
          className="adm-input"
          value={text}
          onChange={(e) => typed(e.target.value)}
          onBlur={() => text.trim() && !parseCoords(text) && setMsg('Paste two numbers like 27.1048, 88.0015, or a Google Maps link.')}
          placeholder="27.1048, 88.0015 or a Google Maps link"
        />
        {pin && (
          <button
            type="button"
            className="adm-link"
            onClick={() => {
              setText('');
              onChange(null);
            }}
          >
            Remove pin
          </button>
        )}
      </div>
      <div className="adm-inline">
        <input
          className="adm-input adm-small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), find())}
          placeholder="Search a place, for example Tumling"
          aria-label="Search a place"
        />
        <button type="button" className="adm-btn adm-btn-quiet" onClick={find}>
          Search
        </button>
      </div>
      {found?.length > 0 && (
        <ul className="adm-pin-results">
          {found.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ lat: r.lat, lng: r.lng });
                  setFound(null);
                }}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="adm-pin-map" ref={box} aria-label="Click the map to place the pin" />
      <p className={`adm-hint${pin && !inRegion(pin) ? ' adm-warn' : ''}`} role="status">
        {msg ||
          (pin
            ? inRegion(pin)
              ? `Pin at ${pin.lat}, ${pin.lng}. Drag it to adjust.`
              : 'This pin is outside the Eastern Himalaya and will not show on the website. Latitude (about 26 to 28) comes first, then longitude (about 88 to 89).'
            : 'No pin yet. Click the map, search for the place, or paste coordinates.')}
      </p>
    </div>
  );
}

function RefInput({ id, field, value, onChange, common }) {
  const opts = useRefOptions(field.ref);
  if (!opts) return <p className="adm-hint">Loading</p>;
  if (field.type === 'refs') {
    const picked = Array.isArray(value) ? value : [];
    const missing = picked.filter((v) => !opts.some((o) => o.value === v));
    return (
      <div className="adm-checks" role="group" aria-label={field.label}>
        {opts.map((o) => (
          <label key={o.value} className="adm-check-pill">
            <input
              type="checkbox"
              checked={picked.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...picked, o.value] : picked.filter((x) => x !== o.value))}
            />
            {o.label}
          </label>
        ))}
        {missing.map((v) => (
          <label key={v} className="adm-check-pill adm-warn" title="This item no longer exists">
            <input type="checkbox" checked onChange={() => onChange(picked.filter((x) => x !== v))} />
            {v} (missing)
          </label>
        ))}
      </div>
    );
  }
  return (
    <select {...common} id={id} className="adm-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {value && !opts.some((o) => o.value === value) && <option value={value}>{value} (missing)</option>}
    </select>
  );
}

function ImageInput({ id, value, onChange, folder }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      onChange(await uploadImage(file, folder));
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="adm-image">
      {value ? <img src={value} alt="" /> : <span className="adm-image-empty">No photo yet</span>}
      <div className="adm-image-actions">
        <label className="adm-btn adm-btn-quiet">
          {busy ? 'Uploading' : value ? 'Replace photo' : 'Upload photo'}
          <input type="file" accept="image/*" onChange={pick} disabled={busy} className="sr-only" />
        </label>
        {value && (
          <button type="button" className="adm-link" onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
      <input id={id} className="adm-input adm-small" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="or paste an image link" />
      {err && <p className="adm-error">{err}</p>}
    </div>
  );
}

function ImagesInput({ value = [], onChange, folder }) {
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)).filter(Boolean));
  return (
    <div className="adm-images">
      {value.map((src, i) => (
        <ImageInput key={`${i}-${src}`} value={src} onChange={(v) => set(i, v)} folder={folder} />
      ))}
      <ImageInput value="" onChange={(v) => v && onChange([...value, v])} folder={folder} />
    </div>
  );
}

function Repeater({ field, value = [], onChange }) {
  const [open, setOpen] = useState(null);
  const update = (i, k, v) => onChange(value.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const move = (i, d) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    setOpen(i + d);
  };
  const add = () => {
    const blank = Object.fromEntries(field.fields.map((f) => [f.name, f.name === 'day' ? value.length + 1 : '']));
    onChange([...value, blank]);
    setOpen(value.length);
  };
  return (
    <div className="adm-repeater">
      {value.map((item, i) => (
        <div key={i} className="adm-rep-item">
          <div className="adm-rep-head">
            <button type="button" className="adm-rep-toggle" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              {field.itemLabel ? field.itemLabel(item, i) : `Item ${i + 1}`}
            </button>
            <span className="adm-rep-tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                Up
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move down">
                Down
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => window.confirm('Remove this item?') && onChange(value.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </span>
          </div>
          {open === i && (
            <div className="adm-rep-body">
              {field.fields.map((sub) => (
                <Field key={sub.name} field={sub} value={item[sub.name]} onChange={(v) => update(i, sub.name, v)} idPrefix={`${field.name}-${i}`} />
              ))}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="adm-btn adm-btn-quiet" onClick={add}>
        Add {field.label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  );
}

export function Field({ field: f, value, onChange, error, values, idPrefix = 'f', folder }) {
  const id = `${idPrefix}-${f.name}`;
  const describedBy = [f.hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const common = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy };
  let input;
  switch (f.type) {
    case 'textarea':
    case 'markdown':
      input = (
        <textarea
          {...common}
          className={`adm-input${f.type === 'markdown' ? ' adm-tall' : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case 'list':
      input = (
        <textarea
          {...common}
          className="adm-input"
          value={Array.isArray(value) ? value.join('\n') : value ?? ''}
          onChange={(e) => onChange(e.target.value.split('\n'))}
        />
      );
      break;
    case 'number':
      input = (
        <input {...common} className="adm-input adm-short" type="number" min={f.min} max={f.max} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case 'date':
      input = <input {...common} className="adm-input adm-short" type="date" value={(value || '').slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'boolean':
      return (
        <div className="adm-field adm-check">
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <label htmlFor={id}>{f.label}</label>
        </div>
      );
    case 'image':
      input = <ImageInput id={id} value={value} onChange={onChange} folder={folder} />;
      break;
    case 'images':
      input = <ImagesInput value={value} onChange={onChange} folder={folder} />;
      break;
    case 'repeater':
      input = <Repeater field={f} value={value} onChange={onChange} />;
      break;
    case 'select':
      input = (
        <select {...common} className="adm-input adm-short" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">Choose</option>}
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'ref':
    case 'refs':
      input = <RefInput id={id} field={f} value={value} onChange={onChange} common={common} />;
      break;
    case 'pin':
      input = <PinInput id={id} value={value} onChange={onChange} />;
      break;
    case 'checkboxes': {
      const picked = Array.isArray(value) ? value : [];
      // keep the saved order the same as the options order
      const next = (v, on) => f.options.map((o) => o.value).filter((x) => (x === v ? on : picked.includes(x)));
      input = (
        <div className="adm-checks" role="group" aria-label={f.label}>
          {f.options.map((o) => (
            <label key={o.value} className="adm-check-pill">
              <input type="checkbox" checked={picked.includes(o.value)} onChange={(e) => onChange(next(o.value, e.target.checked))} />
              {o.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'slug':
      input = (
        <div className="adm-inline">
          <input {...common} className="adm-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {f.from && (
            <button type="button" className="adm-btn adm-btn-quiet" onClick={() => onChange(slugify(values?.[f.from]))}>
              Make from {f.from === 'name' ? 'name' : 'title'}
            </button>
          )}
        </div>
      );
      break;
    default:
      input = (
        <input {...common} className="adm-input" type={f.type === 'url' ? 'url' : 'text'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
  }
  const isGroup = ['repeater', 'images', 'checkboxes', 'refs'].includes(f.type);
  return (
    <div className="adm-field">
      {isGroup ? <p className="adm-label">{f.label}</p> : <label htmlFor={id} className="adm-label">{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>}
      {f.hint && (
        <p className="adm-hint" id={`${id}-hint`}>
          {f.hint}
        </p>
      )}
      {f.type === 'markdown' && <p className="adm-hint">Leave an empty line between paragraphs. Wrap words in two stars for bold. Lines starting with a dash and a space become a list.</p>}
      {input}
      {error && (
        <p className="adm-error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldGroups({ groups, values, setValue, errors, folder }) {
  return groups.map((g) => (
    <fieldset key={g.title} className="adm-card adm-group">
      <legend>{g.title}</legend>
      {g.fields.map((f) => (
        <Field key={f.name} field={f} value={values[f.name]} values={values} onChange={(v) => setValue(f.name, v)} error={errors[f.name]} folder={folder} />
      ))}
    </fieldset>
  ));
}
