import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase renamed its keys: "publishable" replaces "anon" and "secret" replaces "service_role".
// Both names work here; the old ones are read as a fallback.
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isLive = Boolean(url && anonKey);

// Public client: anon key, RLS applies. In the browser it also holds the admin's login session.
export const supabase = isLive
  ? createClient(url, anonKey, { auth: { persistSession: typeof window !== 'undefined' } })
  : null;

// Server-only client for writes that must bypass RLS (public enquiry form). Never import from browser code.
export function serviceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// A client that acts as the logged-in user whose JWT is passed (server routes checking admin rights).
export function userClient(accessToken) {
  if (!isLive) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export const MEDIA_BUCKET = 'media';
