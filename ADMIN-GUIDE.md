# Shingolia Hills website: setup and admin guide

## One-time setup (about 30 minutes, once)

You will use two places: the **Supabase dashboard** in your browser (supabase.com), and the file **`.env.local`** in this folder.

### Part A: create the database

1. Go to supabase.com, sign in, and press **New project**. Pick the **Mumbai** region (it cannot be changed later). Save the database password somewhere safe. Wait until the project finishes setting up.
2. In the left menu open **SQL Editor**. Press **New query**. For each file below, open it on your computer, copy everything inside, paste it into the editor and press **Run**. Do them in this order, and wait for "Success" each time:
   1. `supabase/migrations/01_initial_schema.sql`
   2. `supabase/migrations/02_cms_and_security.sql`
   3. `supabase/migrations/03_review_submissions.sql`
   4. `supabase/migrations/04_planner.sql`
   5. `supabase/seed.sql` (loads today's trips, destinations, stories and FAQs; sample reviews and reels arrive hidden)

### Part B: create the owner's login

3. Left menu **Authentication**, then **Users**, then **Add user**, then **Create new user**. Type the owner's email and a strong password (10 or more characters). If you see a switch called **Auto Confirm User**, turn it on. Press **Create user**.
4. Left menu **Authentication**, then **Sign In / Providers** (the name may be **Sign In / Up**). Turn **off** "Allow new users to sign up". If you skip this, strangers can create accounts.
5. Make that user an admin. Back in **SQL Editor**, press **New query**, paste this, **change `owner@example.com` to the exact email from step 3**, and press **Run**:
   ```sql
   insert into public.admins (user_id, name)
   select id, 'Owner' from auth.users where email = 'owner@example.com'
   on conflict do nothing;
   ```
   Check it worked: run `select * from public.admins;`. You should see one row. If the table is empty, the email did not match step 3; fix it and run again.

   **Easier way, no SQL (do it after Part C):** in a terminal inside the website folder run
   `npm run make-admin -- owner@example.com "Owner name"`
   It asks for a password (typing is hidden), then creates the login, confirms the email and makes it an admin. Run it again any time to set a new password for the same email.

### Part C: connect the site to Supabase (the `.env.local` file)

The site finds your database through three values. They go in the file `.env.local`, in the same folder as `package.json`. If the file does not exist, copy `.env.example` and rename the copy to `.env.local`.

6. In the Supabase dashboard open your project and press the green **Connect** button at the top, or open **Settings** (gear icon, bottom left) then **API Keys**. Copy these three values into `.env.local`, with no spaces, no quotes, and nothing after the `=` other than the value:

   | Line in `.env.local` | What to paste | Looks like | Secret? |
   |---|---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL=` | **Project URL** | `https://abcdefghijkl.supabase.co` | No |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` | **Publishable key** | `sb_publishable_...` | No, this one is meant to be public |
   | `SUPABASE_SECRET_KEY=` | **Secret key** (press the eye icon or Reveal to see it) | `sb_secret_...` | **Yes. Never share it, never post it in a chat, never commit it.** |

   Example of a finished file (these values are made up):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AbC123...
   SUPABASE_SECRET_KEY=sb_secret_XyZ789...
   NEXT_PUBLIC_WHATSAPP_NUMBER=919830012345
   ```
   **Watch the names.** The Connect dialog gives you a ready-made snippet with the names `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. This site reads them as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (with `NEXT_PUBLIC_` in front), and it ignores the shorter names. If /admin says "Connect the database first", this is almost always why. Any other line from the snippet, such as `SUPABASE_JWKS_URL`, is not needed.

   For the WhatsApp number, 10 digits is enough (the site adds the Indian country code 91); other countries need the country code, digits only.

   Older Supabase projects show **anon** and **service_role** keys instead. Those work too: put the anon key on a line `NEXT_PUBLIC_SUPABASE_ANON_KEY=` and the service_role key on `SUPABASE_SERVICE_ROLE_KEY=`.

   Also set `NEXT_PUBLIC_WHATSAPP_NUMBER` to the real number: country code and digits only, no `+` and no spaces.
7. Check it on your computer: run `npm install`, then `npm run dev`, open http://localhost:3000/admin/login and sign in with the email and password from step 3. If you reach the Overview screen, it works. After changing `.env.local`, stop the server (Ctrl+C) and start it again.
8. The same three values must also be added on the host. In Vercel: your project, **Settings**, **Environment Variables**, add each name and value, then redeploy. Details in `DEPLOY.md`.

### If a step fails

- "Connect the database first" on /admin: the three values are missing or have a typo; restart `npm run dev` after editing `.env.local`.
- "Email or password is not right": the password is not the one that was set (or the email has a typo). In the website folder run `npm run make-admin -- your@email.com "Owner"`. It sets a new password you choose, confirms the email and makes the account an admin.
- "No admin access": step 5 did not match any user; run `select * from public.admins;` to see.
- Forms say "not set up yet": the secret key is missing from `.env.local` or from the host.

## What the owner can change (no developer needed)

| Section | What it controls |
|---|---|
| Enquiries | Every trip plan a traveller sends: where, when, who, budget and interests, plus the trips we suggested. Open one to call, WhatsApp or email, set a status, pick a follow-up date (it appears under the Follow up tab that day), add private notes, and export to Excel (CSV). Filter by month and budget. A note appears when the same phone number enquired in the last 30 days. |
| Trips | Name, price, days, photos, day-by-day itinerary (each day can have its own photo), included and excluded lists, questions. Give each day an altitude like `2,970 m` and the website draws the altitude chart by itself. Every trip page has a Download itinerary (PDF) button that builds the PDF from this same information. |
| Trips: Planner matching | On each trip, tick the good months, who it suits and its interests. The trip planner on the website uses these to suggest trips, and warns when a trip is out of season for the month a traveller picked. Review the starting choices; they are a first draft. |
| Destinations | Places, best season, altitude, what you will see, which trips go there. |
| Journal | Stories with a cover photo and text. |
| Reviews | Add only real, permitted reviews. Hidden until ticked "Show on website". These fill the moving review rows on the home page. |
| Review requests | Reviews that travellers write at `/share-your-trip` wait here. Press Publish for real ones, Reject for the rest. Their phone or email is private and only shown here. |
| Instagram reels | Link, cover image, destination. |
| FAQs | Questions shown on the home and about pages. |
| Site settings | Phone, WhatsApp, email, social links, home page headline and photos, about page, privacy and terms, search and share text, and the budget choices shown in the trip planner (prices per person). |
| Subscribers | Newsletter emails, export to CSV. |

Every item has **Show on website**. Unticking hides it without deleting it. Changes appear on the main pages as soon as you press Save; other pages follow within 5 minutes.

## Photos

Use the Upload photo button. Images must be under 8 MB. Wide landscape photos about 2000 px across work best. Compress big camera files first (squoosh.app).

## If something does not work

- "Connect the database first": the three Supabase variables are missing on the host.
- "No admin access": the admin step (Part B, step 5) was not run for that email.
- Enquiries say "not set up yet": `SUPABASE_SECRET_KEY` is missing on the host.
- Forgot password: the Forgot password link on the sign-in page emails a reset link.
