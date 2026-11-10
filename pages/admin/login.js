import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { BrandMark } from '../../components/Icon.jsx';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [state, setState] = useState({ busy: false, msg: '', bad: false });

  async function submit(e) {
    e.preventDefault();
    if (!supabase) return setState({ msg: 'The database is not connected yet. See ADMIN-GUIDE.md.', bad: true });
    const f = e.currentTarget;
    setState({ busy: true, msg: '' });
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(f.email.value, { redirectTo: `${window.location.origin}/admin/reset` });
      setState({ busy: false, msg: error ? error.message : 'If that email has an account, a reset link is on its way.', bad: Boolean(error) });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.value, password: f.password.value });
    if (error) return setState({ busy: false, msg: 'Email or password is not right.', bad: true });
    const next = typeof router.query.next === 'string' && router.query.next.startsWith('/admin') ? router.query.next : '/admin';
    router.replace(next);
  }

  return (
    <div className="adm-center">
      <Head>
        <title>Sign in · Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <form className="adm-card adm-narrow adm-login" onSubmit={submit}>
        <BrandMark />
        <h1>{mode === 'login' ? 'Sign in to edit the website' : 'Reset your password'}</h1>
        <div className="adm-field">
          <label className="adm-label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="username" className="adm-input" />
        </div>
        {mode === 'login' && (
          <div className="adm-field">
            <label className="adm-label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="adm-input" />
          </div>
        )}
        {state.msg && (
          <p className={state.bad ? 'adm-error' : 'adm-hint'} role="alert">
            {state.msg}
          </p>
        )}
        <button className="adm-btn" type="submit" disabled={state.busy}>
          {state.busy ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Send reset link'}
        </button>
        <button type="button" className="adm-link" onClick={() => setMode(mode === 'login' ? 'reset' : 'login')}>
          {mode === 'login' ? 'Forgot your password?' : 'Back to sign in'}
        </button>
      </form>
    </div>
  );
}
Login.admin = true;
