// Browser-side helpers for the admin screens. Writes go straight to Supabase with the admin's own session,
// and Row Level Security (supabase/migrations/02) only lets users listed in `admins` write.
import { supabase, MEDIA_BUCKET } from '../supabase.js';

export async function refreshPages(paths) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || !paths?.length) return;
  await fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paths }),
  }).catch(() => {}); // pages still refresh on their 5-minute timer
}

const MAX_MB = 8;

export async function uploadImage(file, folder = 'uploads') {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Images must be under ${MAX_MB} MB. Try exporting a smaller version.`);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function toCsv(rows, cols) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    // prefix formula-like cells so spreadsheets do not execute them
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

// Turns a "table not found" error into the step the owner needs to take.
export function dbMessage(error, migration = '08_clients_invoices.sql') {
  if (!error) return '';
  if (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message || ''))
    return `This part of the admin needs one more database step. In Supabase, open SQL Editor, run supabase/migrations/${migration}, then reload this page.`;
  if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message || ''))
    return `The database is missing a function. Run supabase/migrations/${migration} in the Supabase SQL Editor, then try again.`;
  return error.message;
}

export function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
