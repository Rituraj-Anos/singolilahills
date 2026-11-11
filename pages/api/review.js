import { clean, notifyOwner, serviceClient } from '../../lib/server.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const b = req.body || {};
  // honeypot: real visitors never see or fill this field
  if (b.company) return res.status(200).json({ ok: true });

  const row = {
    author: clean(b.author, 60),
    location: clean(b.location, 60) || null,
    trip: clean(b.trip, 160) || null,
    rating: Number(b.rating),
    comment: clean(b.comment, 800),
    contact: clean(b.contact, 120) || null,
  };
  const fields = {};
  if (row.author.length < 2) fields.author = 'Please tell us your name.';
  if (!Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5) fields.rating = 'Please choose a star rating.';
  if (row.comment.length < 20) fields.comment = 'Please write at least a couple of sentences (20 characters or more).';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Please check the highlighted fields.', fields });

  const db = serviceClient();
  if (!db) {
    console.error('[review] SUPABASE_SECRET_KEY or URL missing; review not stored');
    return res.status(503).json({ error: 'Reviews are not set up yet. Please try again later.' });
  }
  const { error } = await db.from('review_submissions').insert(row);
  if (error) {
    console.error('[review] insert failed:', error.message);
    return res.status(500).json({ error: 'We could not save your review. Please try again.' });
  }
  await notifyOwner(`New review to approve: ${row.rating} stars from ${row.author}`, `${row.comment}\n\nTrip: ${row.trip || '-'}\nFrom: ${row.location || '-'}\nContact: ${row.contact || '-'}`);
  return res.status(200).json({ ok: true });
}
// shortcut: no per-IP rate limit in code; the Vercel/Cloudflare firewall rate-limit rule on /api/* covers it (see DEPLOY.md).
