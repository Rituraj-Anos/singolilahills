# Singalila Hills: next-steps implementation plan

Goal: turn the site from "browse trips and send an enquiry" into one place where a traveller can discover, plan, customise, get a quote and pay a deposit, and where the owner can answer, quote and confirm without leaving the admin.

Estimates are rough developer-days for one person who knows this codebase. They do not include waiting time for the client (photos, Razorpay approval, content).

## Added since the first plan

- **Moving review rows** on the home page (two rows, opposite directions, pause on hover). Built, but it only shows once at least one review is published, because the sample reviews were never confirmed as real.
- **Traveller reviews:** `/share-your-trip` form, held in `review_submissions`, approved in the admin under Review requests. No review appears without the owner's approval.
- **Trip planner (phase 1, built):** `/book-a-trip` is now a five-step planner (where, when, who, budget, interests) that suggests up to three trips and sends the plan as an enquiry or on WhatsApp. The plan lives in the URL, so a refresh keeps it. Matching is in `lib/match.mjs` with 14 unit tests (`npm test`); out-of-season trips rank lower. The enquiries inbox shows the answers, has month and budget filters, a follow-up date with an overdue tab, and a repeat-phone-number warning. Migration `04_planner.sql`. Saving to a live database is untested until Supabase exists.
- **Itinerary PDF:** every trip has a print-ready itinerary page (all facts, altitude chart, every day, photos, inclusions, permits, questions, price and contact). The button uses the browser's Save as PDF. Each itinerary day can now have its own photo.
- **Deployment:** Vercel plus Supabase plus UptimeRobot, steps in `DEPLOY.md`. Photos stay in Supabase Storage; Cloudflare R2 is postponed.

A real downloadable PDF file (for attaching to WhatsApp or email, and for quotes and invoices) arrives with phase 5b.

## The journey we are building

| Step | Traveller sees | Owner does in the admin | Phase |
|---|---|---|---|
| Discover | Destinations, and what you can do there (experiences) | Adds experiences and photos | 2 |
| Plan | A short planner: where, when, who, budget, interests, with matching trips | Sees structured requests in the inbox | 1 |
| Explore | Trip page with a map of the route and the day-by-day plan | Pins each day on a map | 3 |
| Customise | Stay level and add-ons, with a live price estimate | Sets the options and prices per trip | 4 |
| Quote | A personal quote link, shared on WhatsApp | Builds the quote from the enquiry in two minutes | 5 |
| Book | Accept the quote and pay a deposit online | Sees the booking and the seats left | 6 |

## What exists today (starting point)

- Enquiry form on `/book-a-trip`: trip, name, phone, email, month, group size, notes. Saved by `pages/api/enquiry.js` with a service-role key.
- Trip pages: day-by-day accordion, altitude chart, inclusions, FAQs, WhatsApp button.
- Admin: every content type is defined once in `lib/admin/collections.js`. The list and editor screens are generated from it, so a new content type is mostly one config entry plus a table.
- Content reads go through `lib/content.js`. Pages refresh on admin save through `/api/revalidate`.

Each phase below follows those patterns: a numbered SQL migration, a `COLLECTIONS` entry or new fields, a getter in `lib/content.js`, and validation in an API route.

---

## Phase 0: launch blockers (do first, 1 to 2 days)

Everything after this needs a live database, so it comes first.

1. Create the Supabase project. Run `01`, `02` and `seed.sql`, then the admin steps in `ADMIN-GUIDE.md`.
2. Test end to end: sign in, edit a trip, upload a photo, check the public page updates, send an enquiry, see it in the inbox.
3. Set the real WhatsApp number and confirm the brand spelling (Singalila or Singalila).
4. Deploy a preview on Cloudflare (`@opennextjs/cloudflare`) or Vercel. Add a rate-limit rule on `/api/*`.
5. Add the first automated check: a Playwright smoke test that loads the home page and submits the enquiry form.

**Done when:** the owner can sign in on the live preview and every admin section saves.

---

## Phase 1: trip planner and richer enquiry (reel points 1, 4, 8; 3 to 4 days)

Turn `/book-a-trip` into a short stepped planner instead of adding a second form. One place to start a trip keeps the site simpler.

### Traveller

Five short steps, each one screen on mobile, with Back and a progress line:

1. **Where:** pick one or more destinations (cards with photos), or "Not sure yet".
2. **When:** a month, or exact dates if known, and the number of nights.
3. **Who:** solo, couple, family with children, friends, older travellers. Number of adults and children.
4. **Budget per person:** bands in ₹ (for example under 15k, 15 to 25k, 25 to 40k, over 40k). The owner sets the bands in the admin.
5. **Interests:** snow and high passes, trekking, tea and heritage, wildlife, photography, slow and relaxed.

Then a result screen:
- Up to three **matching trips** with a one-line reason each ("fits your dates and budget").
- "Send my plan" saves it as an enquiry. "Send on WhatsApp" opens WhatsApp with the whole plan written out.
- If nothing matches: "We will build this one for you", with the same two buttons.

The planner state lives in the URL, so a half-finished plan survives a refresh and can be shared.

### Matching (no AI needed)

A small scoring function in `lib/match.js`, with a unit test because it decides what people see:
- destination matches: +3
- trip length within one day of the requested nights: +2
- price within budget: +2 (within 15 % over: +1)
- travel month is a good month for the trip: +1
- trip suits who is travelling: +1

This needs two new structured fields on trips: **good months** (ticks for Jan to Dec, replacing guesswork on the free-text season) and **suitable for** (the same five traveller types).

### Owner

- The inbox shows the new fields as a readable summary: "Couple, 2 adults, March, 6 nights, ₹25 to 40k, trekking and photography".
- New filters: by month and by budget band.
- A **follow-up date** on each enquiry and an "overdue" tab, so nobody is forgotten.
- Duplicate warning when the same phone number enquired in the last 30 days.

### Data (migration `03_planner.sql`)

- `inquiries`: add `destinations text[]`, `date_from date`, `date_to date`, `nights int`, `adults int`, `children int`, `travelling_with text`, `budget_band text`, `interests text[]`, `follow_up_on date`, `source_page text`. Add check constraints on counts and lengths.
- `packages`: add `months int[]`, `suitable_for text[]`.
- `site_settings`: budget bands and interest labels, editable in Site settings.

### Files

`pages/book-a-trip.js` (stepped planner), new `components/Planner.jsx`, `lib/match.js` (+ test), `pages/api/enquiry.js` (validate the new fields), `lib/admin/collections.js` (new trip fields and a `checkboxes` field type), `components/admin/Fields.jsx`, `pages/admin/enquiries.js`.

**Done when:** a visitor can finish the planner on a phone in under a minute, sees sensible matches, and the owner sees the full structured request.

---

## Phase 2: experiences and destination discovery (reel points 5, 6; 2 to 3 days)

Show what people actually do, not only place names.

### Traveller

- Each destination page gets a **"What you can do here"** section: experience cards such as "Sleeping Buddha sunrise from Sandakphu", "Toy train to Ghum", "Rhino safari at Jaldapara". Each card shows a photo, the best season, how long it takes and which trips include it.
- The home page gets an **experiences** row filtered by the same interests as the planner, so "Snow" or "Wildlife" leads straight to the right trips.
- Destination cards show an experience count and the best months.

### Owner

- A new **Experiences** section in the admin: title, photo, destination, description, duration, best months, interests, and the trips that include it.
- Because the admin is generated from `COLLECTIONS`, this is mostly one config entry.

### Data (migration `04_experiences.sql`)

`experiences` table with the same `published` and `sort_order` pattern and the same RLS policies as the other content tables.

### Files

`lib/admin/collections.js`, `lib/content.js` (`getExperiences`), `pages/destinations/[slug].js`, `pages/index.js`, new `ExperienceCard` in `components/Cards.jsx`, `scripts/generate-seed.mjs` (seed 8 to 12 real experiences from the existing itineraries).

**Done when:** every destination shows at least three experiences and the planner interests link to them.

---

## Phase 3: interactive itinerary map (reel point 2; 2 to 3 days)

### Traveller

- Trip pages get a **map of the route**: numbered stops, one per day, joined by a line, with the altitude chart beside it. Tapping a stop opens that day in the itinerary, and opening a day highlights its stop.
- The map loads only when it scrolls into view, so it costs nothing on first load. Without JavaScript, the day list stays complete, because the map is extra and not the only way to read the route.

### Owner

- Each itinerary day gets a **place name and a map pin**. The editor shows a small map. Search for a place or click to drop the pin, or paste coordinates copied from Google Maps.

### Technical choices

- **Leaflet** (about 40 kB) with map tiles from a provider with a free tier and an API key, such as MapTiler or Stadia Maps. The public OpenStreetMap tile server is meant for light use only, so it should not carry production traffic.
- The line joins the stops directly. Real road routing is unreliable on ridge tracks like Sandakphu, so a straight stop-to-stop line is more honest. Road routing can come later for road trips if the client wants it.
- Loaded with `next/dynamic` and `ssr: false`, only on trip pages.

### Data

No new table. Itinerary days are JSON, so add `place`, `lat` and `lng` to each day. Validate that the coordinates fall roughly inside the Eastern Himalaya region, which catches swapped latitude and longitude.

### Files

New `components/RouteMap.jsx`, `pages/packages/[slug].js`, `lib/admin/collections.js` (new `pin` field type), `components/admin/Fields.jsx` (map picker), CSS in `site.css` using the existing tokens.

**Done when:** every seeded trip shows its route, and the owner can move a pin and see it update on the site.

---

## Phase 4: package customiser and price estimate (reel point 3; 3 days)

Keep "one price, everything included", and let travellers adjust it.

### Traveller

On each trip page, a **"Make it yours"** panel:
- Number of adults and children.
- Stay level, for example Standard, Comfort or Premium, each with a price difference.
- Add-ons, for example an extra night in Darjeeling, a private vehicle, a Tiger Hill sunrise or a toy train ride. Each is priced per person or per group.
- A **live estimate**: "About ₹74,000 for 2 adults", labelled clearly as an estimate that the team confirms.
- "Get this quote" sends the exact selection with the enquiry. "Ask on WhatsApp" sends it as a written message.

### Owner

- Per trip in the admin: stay levels and add-ons as simple repeatable rows (name, price, per person or per group, and an optional child price).
- Every enquiry shows the selected options and the estimate the traveller saw.

### Price logic

One function, `lib/price.js`, used both on the trip page and on the server, so the estimate the traveller sees is the one saved. It works in whole rupees with no floating-point totals, and has unit tests for children, per-group add-ons and empty selections. The server recalculates the estimate from the saved trip prices and never trusts a total sent by the browser.

### Data (migration `05_options.sql`)

- `packages`: add `options jsonb` (stay levels and add-ons) and `child_price numeric`.
- `inquiries`: add `selection jsonb` and `estimate numeric`.

**Done when:** the estimate on the page, in the enquiry and in the admin always matches, and the tests cover the edge cases.

---

## Phase 5: quotes in the admin and a shareable quote page (reel points 4, 7; 4 to 5 days)

This is the step that links the owner and the traveller, and it is where the site starts saving the owner real time.

### Owner

- From any enquiry, **"Create quote"** opens a quote prefilled from the request: trip, dates, travellers, chosen options and line items.
- The owner edits the lines, adds a note, sets a validity date and presses Send. The site creates a private link and opens WhatsApp with a ready message: "Hi Ananya, here is your quote for Sandakphu, 14 to 19 March: [link]".
- A **Quotes** screen shows statuses: draft, sent, viewed, accepted, paid, expired. The enquiry status updates by itself (for example, Contacted when the quote is sent).

### Traveller

- `/quote/[token]` is a clean, printable page with the trip summary, the day plan, the map, the price breakdown, what is included, the terms and the validity date.
- Buttons: "Accept quote" (deposit payment in Phase 6), "Ask a question" (WhatsApp) and "Download PDF" (the browser's print-to-PDF with a print stylesheet, so no PDF library is needed).

### Security

- The token is long and random, so it can't be guessed. The quotes table has no public read policy, and the quote page reads it through a server route by token. Quotes expire, and the owner can revoke one.
- The page is marked `noindex` and is not in the sitemap.

### Data (migration `06_quotes.sql`)

`quotes` (enquiry id, token, status, line items, total, valid until, viewed at, accepted at, notes) with an index on the token. Admin-only RLS.

### Files

New `pages/admin/quotes.js`, a quote editor screen, `pages/quote/[token].js`, `pages/api/quote/[token].js` (read, mark viewed, accept), the inbox drawer button, and a print stylesheet.

**Done when:** the owner turns an enquiry into a sent quote in about two minutes, and the traveller can open it on a phone and accept it.

---

## Phase 5b: client management and invoices (6 to 8 days, after phase 5)

Turns the admin from a website editor into the owner's day-to-day business tool.

### Clients

- Every enquiry is matched to a **client record** by phone number (falling back to email), so a repeat traveller is recognised automatically and a duplicate is merged instead of created.
- **Clients screen:** search, tags (repeat traveller, VIP, agent), private notes, preferences (food, mobility, fitness), contact details, next follow-up date, and a WhatsApp button.
- **Client page:** one timeline of everything for that person: enquiries, quotes, bookings, invoices and payments.
- Data: `clients` table with a unique normalised phone number; `client_id` added to enquiries, quotes and invoices; a merge-duplicates action. Admin-only RLS, like the other private tables.

### Invoices

- **Invoice builder** in the admin: pick a client, or start from an accepted quote and have everything prefilled. Line items, discounts, tax lines, due date, notes, bank and UPI details. The on-screen preview matches the PDF.
- **Statuses:** draft, sent, partly paid, paid, void. Issued invoices can't be edited or deleted; you void and reissue, which keeps the books honest.
- **Numbering:** a series such as `SHH/2026-27/0001`, assigned by a database function inside a transaction so numbers never repeat or skip. India's GST rules require a consecutive series, so the client's accountant should confirm the format.
- **PDF:** a real A4 PDF file generated on the server from the saved invoice (so it can never drift from the data), with the logo, client, items, totals and payment details. Shared as a link by WhatsApp or email; the client sees it at `/invoice/[token]` and can download it.
- **Payments:** record UPI, bank and cash payments with a reference. The balance updates by itself, and a receipt PDF can be sent. Razorpay deposits from phase 6 post here automatically.
- **Reports:** money received this month, outstanding balances, overdue invoices, and a CSV export for the accountant.
- Data: `invoices`, `invoice_items`, `invoice_payments`, an `invoice_counters` table and an `issue_invoice()` function. Admin-only RLS; the public link reads through a server route by token.

### Also in this phase

- The same server PDF code produces the **itinerary PDF** as a downloadable file, and the **quote PDF**.

### Notes and needs

- **Reference reviewed: `piratuks/invoice-builder`** (MIT licence). It is an Electron desktop app with SQLite, so its code doesn't drop into this Next.js and Supabase site; we borrow its ideas, not its code. Ideas taken for this phase:
  - A **snapshot** of the business and client details saved on each invoice when it is issued, so an old invoice never changes if a client's address is edited later.
  - A saved **item catalogue** (for example "Sandakphu trip, per person") so common lines are one click, with the default quantity set to 1.
  - **Tax that is inclusive or exclusive** of the price, plus discounts and surcharges.
  - **Partial payments** and clear document states.
  - **Serial number and today's date filled in automatically**; users of that tool asked for exactly this.
  - Import and export of clients and items as spreadsheet/CSV, and a full data backup.
  - Left out on purpose: the drag-and-drop layout builder and Peppol/XRechnung e-invoicing (European standards). One clean, branded invoice layout is enough here.
- From the client: confirm which of these he wants, and whether he needs invoices in more than one currency.
- From the client: legal business name and address, GSTIN (if registered), bank and UPI details, logo, preferred invoice prefix.
- GST on tour services has special rules (including how the tax is shown). The accountant must confirm the tax setup before the first real invoice goes out.

**Done when:** an accepted quote becomes an invoice in one click, the PDF downloads with correct numbering, and recording a payment updates the balance.

---

## Phase 6: departures and online deposit (reel point 7; 5 to 7 days, after Razorpay approval)

### Traveller

- Trip pages list **fixed departures** with dates and seats left ("6 seats left").
- Accepting a quote or picking a departure leads to **pay a deposit**, for example 20 %, through Razorpay (UPI, cards, net banking).
- They get a confirmation page and an email receipt. The balance is collected later by the owner, as today.

### Owner

- A **Departures** section per trip: date, seats, optional price change, open or closed.
- A **Bookings** screen: who, which departure, amount paid, balance due, payment reference.
- An email to the owner on every payment.

### How payment works

1. The server creates a Razorpay order for the deposit. The amount comes from the saved quote, never from the browser.
2. The traveller pays in Razorpay's checkout window.
3. The server confirms the payment twice: it checks the signature returned to the browser, and it receives Razorpay's webhook, whose signature it verifies with the webhook secret. Only the webhook marks the booking as paid, so a closed browser tab can't lose a payment.
4. Confirming a booking and reducing the seats happen in one database function in a single transaction, so two people can't take the last seat at the same moment.

### Data (migration `07_bookings.sql`)

`departures`, `bookings` and `payments` tables, plus a `confirm_booking()` function. Admin-only RLS. Payment secrets live only in server environment variables.

### Before starting

The client needs a Razorpay account with business KYC approved. Test mode works straight away, so building can start before approval. He also needs to decide the deposit percentage, the refund and cancellation rules (to add to the terms, ideally checked by his lawyer), and how GST is shown (his accountant should confirm).

**Done when:** a test-mode payment creates a booking, reduces the seats, sends both emails, and the webhook alone can confirm a payment even if the browser closed.

---

## Phase 7: polish and growth (ongoing, pick as needed)

- **Traveller reels row on the home page (to do, about 0.5 day).** A "Traveller reels" carousel with a play button on each cover, like the Video Reviews row on tourpickkars.in. Travellers share their reel; the owner adds it from the admin. The admin already has a reels tab (title, destination, Instagram link, cover image, show on website), and reels currently show only on matching trip pages. Work left:
  - Load reels on the home page and show published ones in a `Slider` of `ReelCard`s, hidden when there are none.
  - Rename the admin tab to "Traveller reels" and update its note.
  - Optional: let travellers send a reel link on `/share-your-trip`, held for approval like review requests (needs a new migration).
  - Optional: play the video in a pop-up on the site instead of opening Instagram.

- Email confirmation to the traveller when they give an email (Resend is already wired for owner emails).
- Simple analytics (Plausible, or GA with a consent banner), and a funnel in the admin overview: planner started, enquiries, quotes sent, quotes accepted, deposits paid.
- Real photography and a short hero video.
- Hindi and Bengali versions of the main pages.
- Owner and staff roles (staff can answer enquiries but can't change prices).
- Optional later: an AI-written first draft of a custom itinerary for the owner to edit. Only worth it once the structured planner has shown which requests come in most.

---

## Order, effort and dependencies

| Phase | Effort | Needs first | Main win |
|---|---|---|---|
| 0 Launch blockers | 1 to 2 days | Supabase project, real number | Site is live and editable |
| 1 Planner and enquiry | 3 to 4 days | 0 | Better leads, faster replies |
| 2 Experiences | 2 to 3 days | 0 | Discovery and SEO |
| 3 Route map | 2 to 3 days | 0, map API key | "Visualise the trip" |
| 4 Customiser | 3 days | 1 | Bigger, clearer requests |
| 5 Quotes | 4 to 5 days | 1, 4 | Saves the owner the most time |
| 5b Clients and invoices | 6 to 8 days | 5 | Owner runs the business from one place |
| 6 Deposits | 5 to 7 days | 5, Razorpay KYC | Real online bookings |
| 7 Polish | ongoing | any | Growth |

About 26 to 35 developer-days for phases 0 to 6, including 5b. Phases 2 and 3 don't depend on each other or on phase 1, so they can run in parallel if two people work on the site.

## Decisions needed from the client

1. Online deposits: yes or no, and the percentage.
2. Razorpay account: who applies, and the business details for KYC.
3. Budget bands and traveller types for the planner.
4. Map provider account (free tier is enough).
5. Cancellation and refund policy for paid deposits.
6. How prices show GST.
7. Which add-ons and stay levels to offer per trip, with prices.
8. Real photos for trips, destinations and experiences.
9. For invoices: legal business name, GSTIN, bank and UPI details, logo, and the accountant's sign-off on the tax setup.
10. Real reviews to publish (or wait for travellers to submit them).

## How each phase is checked

- Unit tests for logic that decides money or what people see: `lib/match.js`, `lib/price.js`, and the booking confirmation function.
- A Playwright smoke test per traveller flow: planner submit, quote open and accept, test-mode deposit.
- Hallmark sloplint on new CSS, and a mobile and desktop screenshot pass on each new page.
- Every new table gets RLS in the same migration, plus a check that the public anon key can't read leads, quotes or bookings.
