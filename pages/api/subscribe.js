import { clean, EMAIL_RE, serviceClient } from '../../lib/server.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const b = req.body || {};
  if (b.company) return res.status(200).json({ ok: true });
  const email = clean(b.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const db = serviceClient();
  if (!db) return res.status(503).json({ error: 'Subscriptions are not set up yet.' });
  // upsert so subscribing twice is not an error
  const { error } = await db.from('subscribers').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) {
    console.error('[subscribe] failed:', error.message);
    return res.status(500).json({ error: 'Could not subscribe right now. Please try again.' });
  }
  return res.status(200).json({ ok: true });
}
