import { useEffect, useState } from 'react';
import AdminShell, { useToast } from '../../components/admin/AdminShell.jsx';
import { supabase } from '../../lib/supabase.js';
import { download, toCsv } from '../../lib/admin/api.js';

function Subscribers() {
  const [rows, setRows] = useState(null);
  const [toastNode, toast] = useToast();
  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => (error ? toast(error.message, true) : setRows(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function remove(r) {
    if (!window.confirm(`Remove ${r.email} from the list?`)) return;
    const { error } = await supabase.from('subscribers').delete().eq('id', r.id);
    if (error) return toast(error.message, true);
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  }
  return (
    <AdminShell
      title="Newsletter subscribers"
      actions={
        <button type="button" className="adm-btn adm-btn-quiet" disabled={!rows?.length} onClick={() => download('subscribers.csv', toCsv(rows, ['email', 'created_at']))}>
          Export CSV
        </button>
      }
    >
      <p className="adm-note">Export the list to send newsletters from Mailchimp, Brevo or Gmail.</p>
      <div className="adm-card adm-flush">
        {rows === null ? (
          <p className="adm-pad">Loading</p>
        ) : rows.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button type="button" className="adm-link danger" onClick={() => remove(r)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-pad adm-hint">No subscribers yet.</p>
        )}
      </div>
      {toastNode}
    </AdminShell>
  );
}
Subscribers.admin = true;
export default Subscribers;
