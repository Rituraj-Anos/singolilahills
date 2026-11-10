import { useEffect, useState } from 'react';
import AdminShell, { useToast } from '../../components/admin/AdminShell.jsx';
import { FieldGroups } from '../../components/admin/Fields.jsx';
import { supabase } from '../../lib/supabase.js';
import { SETTINGS, toRow } from '../../lib/admin/collections.js';
import { refreshPages } from '../../lib/admin/api.js';
import { DEFAULT_SETTINGS } from '../../lib/data/settings.js';

function Settings() {
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return; // AdminShell shows the setup screen
    supabase
      .from('site_settings')
      .select('data')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast(error.message, true);
        setValues({ ...DEFAULT_SETTINGS, ...(data?.data || {}) });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e.preventDefault();
    const { row, errors: errs } = toRow(SETTINGS.groups, values);
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Please fix the highlighted fields.', true);
    setBusy(true);
    const { error } = await supabase.from('site_settings').upsert({ id: 1, data: row });
    setBusy(false);
    if (error) return toast(error.message, true);
    await refreshPages(SETTINGS.paths());
    toast('Saved. The website is updated.');
  }

  return (
    <AdminShell title="Site settings">
      <p className="adm-note">Contact details, home page text and photos, the about page and the legal pages. Changes go live when you press Save.</p>
      {values ? (
        <form onSubmit={save} noValidate className="adm-form">
          <FieldGroups groups={SETTINGS.groups} values={values} setValue={(k, v) => setValues((s) => ({ ...s, [k]: v }))} errors={errors} folder="site" />
          <div className="adm-savebar">
            <span className="adm-hint">Saving updates the main pages straight away; other pages follow within 5 minutes.</span>
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
Settings.admin = true;
export default Settings;
