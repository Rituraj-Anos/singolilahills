// Creates (or resets) an admin login in one step, so no SQL is needed.
//   Usage:  npm run make-admin -- owner@example.com "Owner name"
// It asks for the password in the terminal (hidden), so it never appears on screen or in a file.
// It uses the secret key from .env.local, which stays on this computer.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const email = (process.argv[2] || '').trim().toLowerCase();
const name = (process.argv[3] || 'Owner').trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error('Usage: npm run make-admin -- owner@example.com "Owner name"');
  process.exit(1);
}

// read .env.local (and .env) without printing anything
const env = { ...process.env };
for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local. Run this from the website folder (the one with package.json).');
  process.exit(1);
}

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error('Run this in a normal terminal window so it can ask for the password.'));
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n') {
          finish();
          return resolve(buf);
        }
        if (c === '\u0003') {
          finish();
          process.exit(1);
        }
        if (c === '\u007f' || c === '\b') buf = buf.slice(0, -1);
        else buf += c;
      }
    };
    stdin.on('data', onData);
  });
}

// ADMIN_PASSWORD in the environment is for automated checks only; people should type it when asked.
let password = env.ADMIN_PASSWORD;
if (!password) {
  password = await askHidden(`New password for ${email} (10 or more characters, typing is hidden): `);
  const again = await askHidden('Type it again: ');
  if (password !== again) {
    console.error('The two passwords are different. Nothing was changed.');
    process.exit(1);
  }
}
if (password.length < 10) {
  console.error('The password needs at least 10 characters. Nothing was changed.');
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

try {
  const existing = await findUser();
  let id;
  if (existing) {
    const { error } = await db.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error) throw error;
    id = existing.id;
    console.log('Existing login found. Password changed and email marked as confirmed.');
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
    console.log('New login created.');
  }
  const { error: adminErr } = await db.from('admins').upsert({ user_id: id, name }, { onConflict: 'user_id' });
  if (adminErr) throw adminErr;
  console.log(`Done. ${email} is an admin. Sign in at /admin/login.`);
} catch (e) {
  console.error('Failed:', e.message || e);
  process.exit(1);
}
