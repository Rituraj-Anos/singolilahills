import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { COLLECTIONS } from '../../lib/admin/collections.js';
import { BrandMark } from '../Icon.jsx';
import ThemeToggle from '../ThemeToggle.jsx';

const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/enquiries', label: 'Enquiries' },
  ...Object.entries(COLLECTIONS).map(([key, c]) => ({ href: `/admin/${key}`, label: c.label })),
  { href: '/admin/review-requests', label: 'Review requests' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/settings', label: 'Site settings' },
];

function NotConfigured() {
  return (
    <div className="adm-center">
      <div className="adm-card adm-narrow">
        <h1>Connect the database first</h1>
        <p>
          The admin panel needs Supabase. Add <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> and{' '}
          <code>SUPABASE_SECRET_KEY</code> to the environment, run the SQL in <code>supabase/migrations</code>, then reload.
          The steps are in <code>ADMIN-GUIDE.md</code>.
        </p>
      </div>
    </div>
  );
}

export default function AdminShell({ title, actions, children }) {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    async function check(session) {
      if (!session) {
        if (alive) router.replace(`/admin/login?next=${encodeURIComponent(router.asPath)}`);
        return;
      }
      const { data } = await supabase.from('admins').select('user_id, name').eq('user_id', session.user.id).maybeSingle();
      if (alive) setState({ status: data ? 'ok' : 'denied', user: { ...session.user, name: data?.name } });
    }
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') check(null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => supabase.auth.signOut();

  if (!supabase) return <NotConfigured />;
  if (state.status === 'loading')
    return (
      <div className="adm-center" role="status">
        Loading
      </div>
    );
  if (state.status === 'denied')
    return (
      <div className="adm-center">
        <div className="adm-card adm-narrow">
          <h1>No admin access</h1>
          <p>
            You are signed in as {state.user?.email}, but this account is not an admin. Ask the site owner to add you, or sign in with
            another account.
          </p>
          <button className="adm-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );

  const path = router.asPath.split(/[?#]/)[0];
  const current = (href) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`));

  return (
    <AdminCtx.Provider value={state.user}>
      <Head>
        <title>{`${title} · Admin`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="adm">
        <aside className="adm-side">
          <Link href="/admin" className="adm-brand">
            <BrandMark />
            <span>
              <strong>Website admin</strong>
              <small>{state.user?.name || state.user?.email}</small>
            </span>
          </Link>
          <nav aria-label="Admin">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={current(n.href) ? 'page' : undefined}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="adm-side-foot">
            <ThemeToggle className="adm-theme-btn" />
            <a href="/" target="_blank" rel="noopener noreferrer">
              View website
            </a>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </aside>
        <div className="adm-main">
          <header className="adm-top">
            <h1>{title}</h1>
            <div className="adm-actions">{actions}</div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </AdminCtx.Provider>
  );
}

// Small toast used by every admin screen.
export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  const node = (
    <div className={`adm-toast${msg ? ' is-on' : ''}${msg?.bad ? ' bad' : ''}`} role="status" aria-live="polite">
      {msg?.text}
    </div>
  );
  return [node, (text, bad = false) => setMsg({ text, bad })];
}
