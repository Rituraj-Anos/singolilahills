import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminShell, { useToast } from '../../../components/admin/AdminShell.jsx';
import { FieldGroups } from '../../../components/admin/Fields.jsx';
import { supabase } from '../../../lib/supabase.js';
import { COLLECTIONS, defaults, toRow } from '../../../lib/admin/collections.js';
import { refreshPages } from '../../../lib/admin/api.js';

function Editor() {
  const router = useRouter();
  const { collection: key, id } = router.query;
  const c = COLLECTIONS[key];
  const isNew = id === 'new';
  const [values, setValues] = useState(null);
  const [original, setOriginal] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    if (!router.isReady || !c) return;
    if (isNew) {
      setValues(defaults(c.groups));
      return;
    }
    supabase
      .from(c.table)
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return toast(error?.message || 'Not found', true);
        setValues({ ...defaults(c.groups), ...data });
        setOriginal(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, key, id]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setValue = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    setDirty(true);
  };

  async function save(e) {
    e.preventDefault();
    const { row, errors: errs } = toRow(c.groups, values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast('Please fix the highlighted fields.', true);
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setBusy(true);
    const q = isNew ? supabase.from(c.table).insert(row) : supabase.from(c.table).update(row).eq('id', id);
    const { data, error } = await q.select().single();
    setBusy(false);
    if (error) {
      const msg = error.code === '23505' ? 'That web address is already used by another item. Change it and save again.' : error.message;
      return toast(msg, true);
    }
    setDirty(false);
    const paths = c.paths(data);
    if (original?.slug && original.slug !== data.slug) paths.push(...c.paths(original));
    await refreshPages(paths);
    toast(row.published === false ? 'Saved. It is hidden from the website.' : 'Saved. The website is updated.');
    if (isNew) router.replace(`/admin/${key}/${data.id}`);
    else setOriginal(data);
  }

  async function remove() {
    if (!window.confirm(`Delete "${values[c.titleField]}"? This cannot be undone. To keep it but hide it, untick "Show on website" instead.`)) return;
    const { error } = await supabase.from(c.table).delete().eq('id', id);
    if (error) return toast(error.message, true);
    await refreshPages(c.paths(original || values));
    router.replace(`/admin/${key}`);
  }

  if (!router.isReady) return null;
  if (!c)
    return (
      <AdminShell title="Not found">
        <p>This section does not exist.</p>
      </AdminShell>
    );

  const title = isNew ? `New ${c.singular}` : values?.[c.titleField] || c.label;
  const liveUrl = !isNew && original?.published && original?.slug && c.paths(original)[2];

  return (
    <AdminShell
      title={title}
      actions={
        <>
          <Link href={`/admin/${key}`} className="adm-link">
            Back to {c.label.toLowerCase()}
          </Link>
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-quiet">
              View on website
            </a>
          )}
        </>
      }
    >
      {values ? (
        <form onSubmit={save} noValidate className="adm-form">
          <FieldGroups groups={c.groups} values={values} setValue={setValue} errors={errors} folder={key} />
          <div className="adm-savebar">
            <span className="adm-hint">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
            {!isNew && (
              <button type="button" className="adm-link danger" onClick={remove}>
                Delete
              </button>
            )}
            <button className="adm-btn" type="submit" disabled={busy}>
              {busy ? 'Saving' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <p>Loading</p>
      )}
      {toastNode}
    </AdminShell>
  );
}
Editor.admin = true;
export default Editor;
