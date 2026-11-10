import { requireAdmin } from '../../lib/server.js';

// Called by the admin panel after a save so the public pages update within seconds.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user = await requireAdmin(req);
  if (!user) return res.status(401).json({ error: 'Not allowed' });

  const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
  const safe = [...new Set(paths)].filter((p) => typeof p === 'string' && /^\/[\w\-/]*$/.test(p)).slice(0, 50);
  const done = [];
  const failed = [];
  for (const p of safe) {
    try {
      await res.revalidate(p);
      done.push(p);
    } catch {
      failed.push(p); // a deleted item's page no longer exists; ISR expiry handles it
    }
  }
  return res.status(200).json({ done, failed });
}
