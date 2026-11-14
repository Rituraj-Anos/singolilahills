# Singolila Hills website

Next.js (Pages Router) site with a built-in admin panel, backed by Supabase.

```
pages/        public pages, /admin screens, /api routes
components/   site components (components/admin for the admin)
lib/          content loading (content.js), Supabase clients, admin field config
lib/data/     bundled starter content, used until the database is connected
styles/       site.css (design tokens at the top) and admin.css
supabase/     SQL migrations and seed.sql
scripts/      generate-seed.mjs rebuilds supabase/seed.sql from lib/data
```

## Run it

```
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

With no Supabase variables set, the site runs from the bundled content in `lib/data` and `/admin` shows a setup screen.

Setup for the database, the admin account and the client's instructions are in **ADMIN-GUIDE.md**. Environment variables are listed in `.env.example`.
