# Shingolia Hills website: setup and admin guide

## One-time setup (developer, about 20 minutes)

1. Create a free project at supabase.com.
2. Supabase dashboard > SQL editor. Run these files, in order:
   1. `supabase/migrations/01_initial_schema.sql`
   2. `supabase/migrations/02_cms_and_security.sql`
   3. `supabase/migrations/03_review_submissions.sql`
   4. `supabase/migrations/04_planner.sql`
   5. `supabase/seed.sql` (loads today's trips, destinations, stories and FAQs; sample reviews and reels arrive hidden)
3. Authentication > Users > Add user. Enter the owner's email and a strong password (10+ characters).
4. Authentication > Sign In / Providers: turn **off** "Allow new users to sign up". Otherwise strangers can create accounts.
5. SQL editor, make the owner an admin (change the email):
   ```sql
   insert into public.admins (user_id, name)
   select id, 'Owner' from auth.users where email = 'owner@example.com'
   on conflict do nothing;
   ```
6. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key and service role key (Project settings > API). Set the same values on the host.
7. `npm install`, `npm run build`, deploy. The admin is at `/admin`.

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
- "No admin access": step 5 was not run for that email.
- Enquiries say "not set up yet": `SUPABASE_SERVICE_ROLE_KEY` is missing on the host.
- Forgot password: the Forgot password link on the sign-in page emails a reset link.
