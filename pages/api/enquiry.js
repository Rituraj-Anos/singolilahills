import { clean, EMAIL_RE, notifyOwner, serviceClient } from '../../lib/server.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const b = req.body || {};
  // honeypot: real visitors never see or fill this field
  if (b.company) return res.status(200).json({ ok: true });

  const row = {
    name: clean(b.name, 80),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120).toLowerCase() || null,
    package_interest: clean(b.trip, 160) || null,
    travel_dates: clean(b.travel_month, 60) || null,
    group_size: clean(b.group_size, 20) || null,
    notes: clean(b.notes, 1500) || null,
    source: 'website',
  };
  const fields = {};
  if (row.name.length < 2) fields.name = 'Please tell us your name.';
  if (!/^\+?[\d\s()-]{7,20}$/.test(row.phone) || row.phone.replace(/\D/g, '').length < 7)
    fields.phone = 'Please enter a phone number we can reach, with country code if outside India.';
  if (row.email && !EMAIL_RE.test(row.email)) fields.email = 'That email address does not look right.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Please check the highlighted fields.', fields });

  const db = serviceClient();
  if (!db) {
    console.error('[enquiry] SUPABASE_SERVICE_ROLE_KEY or URL missing; enquiry not stored');
    return res.status(503).json({ error: 'Online enquiries are not set up yet. Please message us on WhatsApp.' });
  }
  const { error } = await db.from('inquiries').insert(row);
  if (error) {
    console.error('[enquiry] insert failed:', error.message);
    return res.status(500).json({ error: 'We could not save your enquiry. Please try again or message us on WhatsApp.' });
  }

  await notifyOwner(
    `New enquiry: ${row.name}${row.package_interest ? `, ${row.package_interest}` : ''}`,
    [
      `Name: ${row.name}`,
      `Phone: ${row.phone}`,
      `Email: ${row.email || '-'}`,
      `Trip: ${row.package_interest || '-'}`,
      `When: ${row.travel_dates || '-'}`,
      `Group: ${row.group_size || '-'}`,
      '',
      row.notes || '',
    ].join('\n')
  );
  return res.status(200).json({ ok: true });
}
// shortcut: no per-IP rate limit in code; add a Cloudflare WAF rate-limit rule on /api/* (e.g. 10 req/min/IP) at deploy.
