import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';

// Landing page for the password-reset email. Supabase signs the user in from the link, then we set a new password.
export default function Reset() {
  const router = useRouter();
  const [state, setState] = useState({ busy: false, msg: '', bad: false });
  async function submit(e) {
    e.preventDefault();
    const pw = e.currentTarget.password.value;
    if (pw.length < 10) return setState({ msg: 'Use at least 10 characters.', bad: true });
    setState({ busy: true });
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setState({ busy: false, msg: error.message, bad: true });
    router.replace('/admin');
  }
  return (
    <div className="adm-center">
      <Head>
        <title>New password · Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <form className="adm-card adm-narrow adm-login" onSubmit={submit}>
        <h1>Choose a new password</h1>
        <div className="adm-field">
          <label className="adm-label" htmlFor="password">
            New password
          </label>
          <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="adm-input" />
          <p className="adm-hint">At least 10 characters.</p>
        </div>
        {state.msg && (
          <p className={state.bad ? 'adm-error' : 'adm-hint'} role="alert">
            {state.msg}
          </p>
        )}
        <button className="adm-btn" type="submit" disabled={state.busy}>
          Save password
        </button>
      </form>
    </div>
  );
}
Reset.admin = true;
