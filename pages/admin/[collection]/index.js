import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AdminShell, { useToast } from '../../../components/admin/AdminShell.jsx';
import { supabase } from '../../../lib/supabase.js';
import { COLLECTIONS, allFields } from '../../../lib/admin/collections.js';
import { refreshPages } from '../../../lib/admin/api.js';
import { money } from '../../../lib/format.js';

function cell(field, value, row) {
  if (field?.type === 'boolean') return <span className={`adm-pill ${value ? 's-booked' : 's-closed'}`}>{value ? 'Shown' : 'Hidden'}</span>;
  if (field?.name === 'price') return money(value, row.currency);
  if (field?.type === 'date') return value ? new Date(value).toLocaleDateString('en-IN') : '-';
  return value ?? '-';
}

function CollectionList() {
  const router = useRouter();
  const key = router.query.collection;
  const c = COLLECTIONS[key];
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    if (!c) return;
    setRows(null);
    supabase
      .from(c.table)
      .select('*')
      .order(c.order[0], { ascending: c.order[1] })
      .then(({ data, error }) => (error ? toast(error.message, true) : setRows(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fields = useMemo(() => (c ? Object.fromEntries(allFields(c.groups).map((f) => [f.name, f])) : {}), [c]);
  const shown = (rows || []).filter((r) => !q || String(r[c.titleField] || '').toLowerCase().includes(q.toLowerCase()));
  const [busy, setBusy] = useState(null);

  async function remove(r) {
    const name = r[c.titleField] || 'Untitled';
    if (!window.confirm(`Delete "${name}"? This cannot be undone. To keep it but hide it, open it and untick "Show on website" instead.`)) return;
    setBusy(r.id);
    const { error } = await supabase.from(c.table).delete().eq('id', r.id);
    if (error) {
      setBusy(null);
      return toast(error.message, true);
    }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    await refreshPages(c.paths(r));
    setBusy(null);
    toast(`Deleted "${name}". The website is updated.`);
  }

  if (!router.isReady) return null;
  if (!c)
    return (
      <AdminShell title="Not found">
        <p>This section does not exist.</p>
      </AdminShell>
    );

  return (
    <AdminShell
      title={c.label}
      actions={
        <Link href={`/admin/${key}/new`} className="adm-btn">
          Add {c.singular}
        </Link>
      }
    >
      {c.note && <p className="adm-note">{c.note}</p>}
      <div className="adm-toolbar">
        <label className="sr-only" htmlFor="search">
          Search
        </label>
        <input id="search" className="adm-input adm-search" placeholder={`Search ${c.label.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="adm-card adm-flush">
        {rows === null ? (
          <p className="adm-pad">Loading</p>
        ) : shown.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                {c.columns.map((col) => (
                  <th key={col}>{fields[col]?.label || col}</th>
                ))}
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  {c.columns.map((col, i) => (
                    <td key={col}>{i === 0 ? <Link href={`/admin/${key}/${r.id}`}>{r[col] || 'Untitled'}</Link> : cell(fields[col], r[col], r)}</td>
                  ))}
                  <td className="adm-row-actions">
                    <Link href={`/admin/${key}/${r.id}`} className="adm-link">
                      Edit
                    </Link>
                    <button type="button" className="adm-link danger" disabled={busy === r.id} onClick={() => remove(r)}>
                      {busy === r.id ? 'Deleting' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-pad adm-hint">
            {rows.length ? 'Nothing matches your search.' : `No ${c.label.toLowerCase()} yet. Use "Add ${c.singular}" to create the first one.`}
          </p>
        )}
      </div>
      {toastNode}
    </AdminShell>
  );
}
CollectionList.admin = true;
export default CollectionList;
