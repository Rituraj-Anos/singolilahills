import { supabase } from '../../lib/supabase.js';

// Ping target for the free uptime monitor. The tiny database read also stops a free Supabase project from pausing.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!supabase) return res.status(200).json({ ok: true, db: 'not configured' });
  const { error } = await supabase.from('site_settings').select('id').eq('id', 1).maybeSingle();
  if (error) return res.status(503).json({ ok: false, db: 'error' });
  return res.status(200).json({ ok: true, db: 'ok' });
}
