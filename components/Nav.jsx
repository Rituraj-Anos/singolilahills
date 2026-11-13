import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import ArrowButton from './ArrowButton.jsx';
import Icon, { BrandMark } from './Icon.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export const NAV_LINKS = [
  { label: 'Trips', href: '/packages' },
  { label: 'Destinations', href: '/destinations' },
  { label: 'About', href: '/about' },
  { label: 'Journal', href: '/blog' },
  { label: 'Contact', href: '/book-a-trip' },
];

const isCurrent = (path, href) => path === href || path.startsWith(`${href}/`);

export default function Nav({ brand }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const router = useRouter();
  useEffect(() => {
    const close = () => setOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);
  const path = router.asPath.split(/[?#]/)[0];

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    menuRef.current?.querySelector('a')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <div className="nav-wrap">
        <nav className="nav" aria-label="Main">
          <Link href="/" className="brand" aria-label={`${brand} home`}>
            <BrandMark />
            <span className="brand-name">{brand}</span>
          </Link>
          <ul className="nav-links">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isCurrent(path, l.href) ? 'page' : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <div className="nav-cta">
            <ArrowButton href="/book-a-trip">Plan a trip</ArrowButton>
          </div>
          <button
            ref={btnRef}
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </nav>
      </div>
      <div id="mobile-menu" ref={menuRef} className={`mobile-menu${open ? ' is-open' : ''}`} inert={open ? undefined : ''}>
        <ul>
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={isCurrent(path, l.href) ? 'page' : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <ArrowButton href="/book-a-trip">Plan a trip</ArrowButton>
      </div>
    </>
  );
}
