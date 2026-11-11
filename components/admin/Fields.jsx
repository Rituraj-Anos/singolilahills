import { useState } from 'react';
import { slugify } from '../../lib/admin/collections.js';
import { uploadImage } from '../../lib/admin/api.js';

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
  const isGroup = ['repeater', 'images', 'checkboxes'].includes(f.type);
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
