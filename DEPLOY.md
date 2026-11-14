# Deploying: Vercel + Supabase + UptimeRobot

| Piece | Service | Plan |
|---|---|---|
| Website and API | Vercel | Hobby (free) for testing. **Pro ($20/month) for the client's live business site.** |
| Database, admin login, photos | Supabase | Free to start, Pro ($25/month) recommended once it is live (daily backups, no pausing) |
| Keep-alive and downtime alerts | UptimeRobot | Free |
| Photos on Cloudflare R2 | not used yet | Photos are stored in Supabase Storage for now |

Vercel's free Hobby plan is for personal, non-commercial use only. Use it to build and show the site; move to Pro before the client's business goes live on it. Netlify's free plan is the alternative that allows commercial use.

## 1. Put the code on GitHub

Repository: https://github.com/Rituraj-Anos/singolilahills

The site is its own project, separate from the extractor tool in the folder above it. From inside `cloned-traavellio-nextjs`:

```
git init
git add .
git commit -m "Singalila Hills website"
git branch -M main
git remote add origin https://github.com/Rituraj-Anos/singolilahills.git
git push -u origin main
```

`.env.local` is ignored by git and must stay that way. Never commit it.

## 2. Database (Supabase)

1. Create the project and choose the **Mumbai (ap-south-1)** region. It cannot be changed later.
2. Run the SQL files and create the admin user as described in `ADMIN-GUIDE.md`.

## 3. Site (Vercel)

1. vercel.com > Add New > Project > import the GitHub repository. Vercel detects Next.js; leave the build settings alone.
2. `vercel.json` already runs the API in Mumbai (`bom1`), next to the database, so the enquiry form is fast.
3. Settings > Environment Variables. Add the values from `.env.example`:
   - `NEXT_PUBLIC_SITE_URL` (the final address, no trailing slash)
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` (the client's real number)
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (secret: never prefix it with `NEXT_PUBLIC_`)
   - Where to find these three values: `ADMIN-GUIDE.md`, Part C.
   - optional: `RESEND_API_KEY`, `NOTIFY_EMAIL`
   - recommended before launch: `NEXT_PUBLIC_MAP_TILES` and `NEXT_PUBLIC_MAP_ATTRIBUTION` for the trip route maps. Without them the maps use the public OpenStreetMap tiles, which are fine for testing but are not meant for a busy commercial site. A free MapTiler account (cloud.maptiler.com) gives a key; then use `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=YOUR_KEY` and the attribution `&copy; MapTiler &copy; OpenStreetMap contributors`. Redeploy after adding them.
4. Deploy. If you used a temporary address, change `NEXT_PUBLIC_SITE_URL` to the real domain and redeploy.
5. Supabase > Authentication > URL configuration: set the Site URL to the live address and add `https://YOUR-SITE/admin/reset` to the Redirect URLs, so password-reset emails work.
6. Custom domain: Vercel > Settings > Domains, then follow the DNS steps.

Every push to `main` deploys by itself. Every pull request gets its own preview address.

## 4. Keep it awake and watch it (UptimeRobot)

A free Supabase project pauses after about a week without activity.

1. uptimerobot.com > Add monitor > HTTP(s) > `https://YOUR-SITE/api/health`, every 5 minutes.
2. Add the owner's email as the alert contact.

`/api/health` makes one tiny database read, which counts as activity, and returns an error status if the database is unreachable.

## 5. Spam protection

The forms have a hidden trap field and server checks, but no per-visitor rate limit in code. After going live, add a rate limit on `/api/*` in Vercel's Firewall (Pro) or put the domain behind Cloudflare's free proxy and add a rate-limiting rule there (for example 10 requests a minute per visitor).

## 6. Test the live site (10 minutes)

1. Open the live site on a phone. Check the WhatsApp button opens the right number.
2. Plan a test trip at `/book-a-trip` and send it. It should appear in `/admin/enquiries` with all the answers.
3. Send a test review at `/share-your-trip`. It should appear in `/admin/review-requests`; publish it and check it shows on the home page.
4. Sign in at `/admin`, change a trip's price, press Save, and confirm the public page updates within a few seconds.
5. Upload a photo in a trip and check it shows on the site.
6. On a trip page, press Download itinerary (PDF) and save it. Check the photos are in the file.

## Limits to know

| Service | Limit | What happens |
|---|---|---|
| Vercel Hobby | Monthly usage caps; non-commercial only | Fine for testing. Go to Pro for the live client site. |
| Supabase free | 500 MB database, 1 GB photos, no automatic backups | Plenty for this site. Export enquiries to CSV from the admin once a month. |
| Supabase free | Pauses after a week idle | Handled by the UptimeRobot ping. |
