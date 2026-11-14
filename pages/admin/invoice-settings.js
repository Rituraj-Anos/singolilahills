import { useEffect, useState } from 'react';
import AdminShell, { useToast } from '../../components/admin/AdminShell.jsx';
import { FieldGroups } from '../../components/admin/Fields.jsx';
import { supabase } from '../../lib/supabase.js';
import { BUSINESS, defaults, toRow } from '../../lib/admin/collections.js';
import { dbMessage } from '../../lib/admin/api.js';

function InvoiceSettings() {
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [toastNode, toast] = useToast();

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('business_profile')
      .select('data')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setProblem(dbMessage(error));
        setValues({ ...defaults(BUSINESS.groups), ...(data?.data || {}) });
      });
  }, []);

  async function save(e) {
    e.preventDefault();
    const { row, errors: errs } = toRow(BUSINESS.groups, values);
    if (row.invoice_prefix && !/^[A-Za-z0-9-]{1,10}$/.test(row.invoice_prefix)) errs.invoice_prefix = 'Use up to 10 letters, numbers or dashes.';
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Please fix the highlighted fields.', true);
    setBusy(true);
    const { error } = await supabase.from('business_profile').upsert({ id: 1, data: { ...row, invoice_prefix: (row.invoice_prefix || 'SH').toUpperCase() } });
    setBusy(false);
    if (error) return toast(dbMessage(error), true);
    toast('Saved. New invoices use these details.');
  }

  return (
    <AdminShell title="Invoice settings">
      <p className="adm-note">
        Printed on every invoice. An issued invoice keeps the details it was issued with, so changing them here only affects invoices you issue from now on.
        These details are private: only admins can see them, and customers see them only on their own invoice.
      </p>
      {problem && <p className="adm-note adm-warn">{problem}</p>}
      {values && (
        <form onSubmit={save} noValidate className="adm-form">
          <FieldGroups groups={BUSINESS.groups} values={values} setValue={(k, v) => setValues((s) => ({ ...s, [k]: v }))} errors={errors} folder="business" />
          <div className="adm-savebar">
            <span className="adm-hint">Ask your accountant to check the GSTIN, tax rate and numbering before the first real invoice.</span>
            <button className="adm-btn" type="submit" disabled={busy}>
              {busy ? 'Saving' : 'Save'}
            </button>
          </div>
        </form>
      )}
      {toastNode}
    </AdminShell>
  );
}
InvoiceSettings.admin = true;
export default InvoiceSettings;
