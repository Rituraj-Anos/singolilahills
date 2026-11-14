import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Pic from './Pic.jsx';
import { waLink } from '../lib/format.js';
import { isPopupLive, popupMatchesPath, todayIST } from '../lib/departures.mjs';

const DAY = 86400000;
const key = (p) => `popup:${p.id}`;

// Has this visitor already closed it recently enough? "Every visit" means once per browser session.
function seen(p) {
  try {
    if (p.frequency === 'every') return Boolean(sessionStorage.getItem(key(p)));
    const at = Number(localStorage.getItem(key(p)) || 0);
    if (!at) return false;
    return p.frequency === 'once' ? true : Date.now() - at < DAY;
  } catch {
    return false; // storage blocked: show it, closing still works for this page
  }
}
function remember(p) {
  try {
    localStorage.setItem(key(p), String(Date.now()));
    sessionStorage.setItem(key(p), '1');
  } catch {
    /* storage blocked */
  }
}

/*
  At most one pop-up at a time: the first live one for this page that the visitor hasn't closed.
  Rendered only after the page has loaded in the browser, so it never blocks visitors without JavaScript,
  and the admin and invoice pages are excluded. Closes with the button, Esc or a click on the backdrop;
  focus stays inside while it is open and goes back to where it was afterwards.
*/
export default function Popup({ popups = [], whatsapp, brand }) {
  const { asPath } = useRouter();
  const [open, setOpen] = useState(null);
  const box = useRef(null);
  const back = useRef(null);

  useEffect(() => {
    if (!popups.length) return;
    const today = todayIST();
    const p = popups.find((x) => isPopupLive(x, today) && popupMatchesPath(x, asPath) && !seen(x));
    if (!p) return;
    const t = setTimeout(() => {
      back.current = document.activeElement;
      setOpen(p);
    }, Math.min(120, Math.max(0, Number(p.delay_seconds) || 0)) * 1000);
    return () => clearTimeout(t);
  }, [asPath, popups]);

  const close = useCallback(() => {
    setOpen((p) => {
      if (p) remember(p);
      return null;
    });
    const el = back.current;
    if (el && typeof el.focus === 'function' && document.contains(el)) setTimeout(() => el.focus({ preventScroll: true }), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    box.current?.querySelector('.popup-close')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll('a[href], button:not([disabled])')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!box.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = before;
    };
  }, [open, close]);

  // a new page closes it without counting as "closed by the visitor"
  useEffect(() => () => setOpen(null), [asPath]);

  if (!open) return null;
  const href = open.link_type === 'whatsapp' ? waLink(whatsapp, `Hi ${brand}, I saw "${open.title}" on your website.`) : open.href;
  const external = href && !href.startsWith('/');
  const cta =
    open.button_label && href ? (
      external ? (
        <a className="btn popup-cta" href={href} target="_blank" rel="noopener noreferrer" onClick={close}>
          <span className="btn-fill" aria-hidden="true" />
          <span className="btn-label">{open.button_label}</span>
          <span className="btn-disc" aria-hidden="true">
            <Icon name="arrow" className="arrow-out" />
            <Icon name="arrow" className="arrow-in" />
          </span>
        </a>
      ) : (
        <Link className="btn popup-cta" href={href} onClick={close}>
          <span className="btn-fill" aria-hidden="true" />
          <span className="btn-label">{open.button_label}</span>
          <span className="btn-disc" aria-hidden="true">
            <Icon name="arrow" className="arrow-out" />
            <Icon name="arrow" className="arrow-in" />
          </span>
        </Link>
      )
    ) : null;

  return (
    <div className="popup-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={box} className="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title" aria-describedby={open.text ? 'popup-text' : undefined}>
        <button type="button" className="popup-close" onClick={close} aria-label="Close">
          <Icon name="close" />
        </button>
        {open.image && (
          <div className="popup-photo">
            <Pic src={open.image} sizes="(max-width: 560px) 92vw, 520px" alt="" decoding="async" width="1040" height="585" />
            {open.badge && <span className="popup-badge">{open.badge}</span>}
          </div>
        )}
        <div className="popup-body">
          {open.badge && !open.image && <span className="popup-badge is-inline">{open.badge}</span>}
          <h2 id="popup-title">{open.title}</h2>
          {open.text && <p id="popup-text">{open.text}</p>}
          <div className="popup-actions">
            {cta}
            <button type="button" className="text-link popup-later" onClick={close}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
