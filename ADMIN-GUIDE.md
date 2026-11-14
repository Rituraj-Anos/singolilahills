# Singalila Hills website: setup and admin guide

## One-time setup (about 30 minutes, once)

You will use two places: the **Supabase dashboard** in your browser (supabase.com), and the file **`.env.local`** in this folder.

### Part A: create the database

1. Go to supabase.com, sign in, and press **New project**. Pick the **Mumbai** region (it cannot be changed later). Save the database password somewhere safe. Wait until the project finishes setting up.
2. In the left menu open **SQL Editor**. Press **New query**. For each file below, open it on your computer, copy everything inside, paste it into the editor and press **Run**. Do them in this order, and wait for "Success" each time:
   1. `supabase/migrations/01_initial_schema.sql`
   2. `supabase/migrations/02_cms_and_security.sql`
   3. `supabase/migrations/03_review_submissions.sql`
   4. `supabase/migrations/04_planner.sql`
   5. `supabase/migrations/05_experiences.sql` (things to do at each destination)
   6. `supabase/migrations/06_route_map.sql` (a map pin on every itinerary day)
   7. `supabase/migrations/07_customiser.sql` ("Make it yours" price options, switched off on every trip)
   8. `supabase/migrations/08_clients_invoices.sql` (clients and invoices, private to admins)
   9. `supabase/migrations/09_planner_departures_popups.sql` (editable planner questions, dated departures, pop-ups)
   10. `supabase/seed.sql` (loads today's trips, destinations, stories and FAQs; sample reviews and reels arrive hidden)

   **Already have a live database from before?** Run only the files you have not run yet, in order (for this site: 05, 06, 07, 08, 09). Every file is safe to run again and never overwrites what the owner has edited.

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
| Trips: map pins | Each itinerary day has a **Place on the map** and a **Map pin**. Search the place, click the small map, drag the pin, or paste coordinates or a Google Maps link. The trip page draws the route from these pins in day order; days with the same pin share one numbered stop. The starting pins are approximate, so check them. A pin outside the Eastern Himalaya is ignored (the field warns you). |
| Trips: Make it yours | Stay levels (the first one is the starting choice, give it an extra of 0), add-ons (per person or once per group, with an optional child price) and a trip price per child. Travellers see a live estimate and can send it to you; the server works the estimate out again from these prices, so nobody can change it in their browser. **Every trip starts with the panel switched off** because the example prices are placeholders: check them, then tick **Show "Make it yours" on the trip page**. |
| Destinations | Places, best season, altitude, what you will see, which trips go there. |
| Departures | Fixed dates for a trip: trip, first and last day, price per person (empty means the trip price), seats in total and seats left, status (Open, Filling fast, Sold out, Cancelled), a short note and Show on website. Open dates appear on the trip page under "Upcoming dates", on the **Upcoming trips** page (linked in the footer) and in "Upcoming departures" on the home page, soonest first. "Book this date" opens the planner with the trip and dates filled in, and the enquiry shows the date picked. Past dates, sold-out and cancelled dates, and dates with 0 seats left hide by themselves (pages refresh within 5 minutes). The seats-left count is public when you fill it in; leave it empty to show no count. |
| Planner questions | The questions on /book-a-trip. Add, edit, reorder (Order), hide (Show on website) or delete them; each has a question, helper text, an answer type (one choice, several choices, text, number, date, destination picker), "Travellers must answer", and choices with an optional photo, the trips it suits and tags. Tick "Same screen as the question before" to put two questions on one screen. The seven built-in questions marked "Used for matching" (destinations, month, length, who, group size, budget, interests) pick the suggested trips: you can reword, reorder, hide or require them and rename their choices, but their choices stay fixed. Your own questions are saved with each enquiry (shown in the enquiry and in the CSV) but do not change which trips are suggested. The planner page heading, intro and budget choices are in **Site settings > Trip planner**. Until migration 09 is run, the planner uses today's questions. |
| Pop-ups | A window over the website for a new trip or an offer: photo (shown across the top of the window), title, text, badge (such as "New" or "20% off"), a button that goes to a trip, a departure, WhatsApp or any link, start and end dates, which pages (every page, home only, or pages you list; `/packages/*` covers every trip page), how many seconds to wait, and how often (once per browser session, once a day, or only once). Only one shows at a time: the lowest Order that is live for that page. Visitors close it with the X, "Not now", Esc or a click outside, and the site remembers that in their browser. It never appears in the admin or for visitors without JavaScript. New pop-ups start hidden: tick Show on website when it is ready. |
| Things to do | The "What you can do here" cards on each destination page, also shown on the home page with interest filters (the same interests as the trip planner). Title, photo, destination, how long, best months, interests and the trips that include it. |
| Journal | Stories with a cover photo and text. |
| Reviews | Add only real, permitted reviews. Hidden until ticked "Show on website". These fill the moving review rows on the home page. |
| Review requests | Reviews that travellers write at `/share-your-trip` wait here. Press Publish for real ones, Reject for the rest. Their phone or email is private and only shown here. |
| Instagram reels | Link, cover image, destination. |
| FAQs | Questions shown on the home and about pages. |
| Site settings | Phone, WhatsApp, email, social links, home page headline and photos, about page, privacy and terms, search and share text, and under Trip planner the planner page heading, intro and the budget choices (prices per person). |
| Subscribers | Newsletter emails, export to CSV. |

Every item has **Show on website**.

## Clients and invoices (Business section of the admin)

| Section | What it does |
|---|---|
| Clients | One record per person. Every enquiry is linked to its client by phone number (the last 10 digits, so `+91 98300 12345` and `098300 12345` match), or by email when the phone is new. Add tags, preferences, private notes and a follow-up date. The client page shows a timeline of enquiries, invoices and payments. If the same person ended up twice, open one and use **Merge a duplicate**. |
| Invoice settings | Do this first. Legal name, address, GSTIN, logo, bank and UPI details, terms, the person who signs, the number prefix (default `SH`), days to pay and the usual tax rate. These are private (only admins see them) and each invoice keeps a copy from the day it is issued. |
| Invoice items | Lines you use often, such as "Sandakphu trip, per person". One click in the invoice builder. |
| Invoices | Start one from **New invoice**, from a client page, or from an enquiry (**Create invoice** in the enquiry; it fills in the trip and, if the traveller used "Make it yours", every line of their estimate). Add lines with quantity, price, tax % and discount; choose whether prices are before tax or include tax. The preview on the right is exactly what the client sees. |

How invoices behave, and why:

1. **Drafts** have no number and can be changed or deleted.
2. **Issue invoice** gives it the next number in the financial-year series, for example `SH/2026-27/0001` (April to March, a new series each year). Numbers never repeat and never skip, which Indian GST rules ask for.
3. An **issued invoice can't be edited or deleted**. To fix one, **Void** it (with a reason; it stays on record, marked cancelled) and use **Copy into a new draft**.
4. Share it with **Copy link** or **Send on WhatsApp**. The client opens a clean page and can save it as a PDF. Anyone with the link can see that one invoice, so send it only to the client.
5. **Record a payment** (UPI, bank, cash, card) with its reference. The status changes by itself to Part paid or Paid, and each payment has a printable **Receipt**. A payment can't be more than the balance.
6. The Invoices screen shows money received this month, what is still to be paid and what is overdue. **Export invoices** and **Export payments** give CSV files for the accountant.

Before the first real invoice, ask the accountant to confirm the GSTIN, the GST rate for tour packages, whether prices are shown before or including tax, and the number prefix. Unticking hides it without deleting it. Changes appear on the main pages as soon as you press Save; other pages follow within 5 minutes.

## Photos

Use the Upload photo button. Images must be under 8 MB. Wide landscape photos about 2000 px across work best. Compress big camera files first (squoosh.app).

## If something does not work

- "Connect the database first": the three Supabase variables are missing on the host.
- "No admin access": the admin step (Part B, step 5) was not run for that email.
- Enquiries say "not set up yet": `SUPABASE_SECRET_KEY` is missing on the host.
- Forgot password: the Forgot password link on the sign-in page emails a reset link.
