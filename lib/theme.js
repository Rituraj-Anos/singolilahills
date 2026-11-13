// Light and dark theme. The choice is stored per browser; with no choice the site follows the device setting.
// The first paint is handled by the inline script in pages/_document.js, so the page never flashes the wrong theme.
import { useSyncExternalStore } from 'react';

const KEY = 'theme';
const META = { light: '#f5f4f0', dark: '#0d1112' };
const listeners = new Set();
let timer = 0;

export const THEME_SCRIPT = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('${KEY}')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.setAttribute('data-theme',t);d.classList.add('js');var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='dark'?'${META.dark}':'${META.light}')})()`;

const read = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
const stored = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

function apply(theme) {
  const el = document.documentElement;
  if (read() === theme) return;
  // colours fade for a moment when switching; skipped when the visitor prefers less motion
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.classList.add('theme-anim');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('theme-anim'), 420);
  }
  el.setAttribute('data-theme', theme);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', META[theme]);
  listeners.forEach((l) => l());
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // private mode: the theme still changes for this visit
  }
  apply(theme);
}

function subscribe(cb) {
  listeners.add(cb);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystem = () => !stored() && apply(mq.matches ? 'dark' : 'light');
  const onStorage = (e) => e.key === KEY && apply(stored() || (mq.matches ? 'dark' : 'light'));
  mq.addEventListener('change', onSystem);
  window.addEventListener('storage', onStorage); // keeps other open tabs in step
  return () => {
    listeners.delete(cb);
    mq.removeEventListener('change', onSystem);
    window.removeEventListener('storage', onStorage);
  };
}

// The server renders 'light'; React swaps to the real value straight after hydration without a mismatch warning.
export function useTheme() {
  return useSyncExternalStore(subscribe, read, () => 'light');
}
