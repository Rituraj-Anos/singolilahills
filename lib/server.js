// Server-only helpers for API routes.
import { serviceClient, userClient } from './supabase.js';

export function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Optional owner notification by email through Resend's HTTP API (no SDK needed).
export async function notifyOwner(subject, text) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.NOTIFY_FROM || 'Website <onboarding@resend.dev>', to: [to], subject, text }),
    });
  } catch (e) {
    // the enquiry is already saved; a failed email must not fail the request
    console.error('[notify] email failed:', e.message);
  }
}

// Returns the user if the bearer token belongs to someone in the admins table, else null.
export async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = userClient(token);
  if (!db) return null;
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return null;
  const { data } = await db.from('admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
  return data ? auth.user : null;
}

export { serviceClient };
