// Describes every editable content type once. The admin list and editor screens are generated from this.
// Field types: text, textarea, markdown, number, boolean, image, images, list (one item per line),
// select (`options`), date, repeater (array of objects with `fields`), checkboxes (`options`),
// ref / refs (pick one or many rows of another table: `ref: { table, value, label }`), pin (a map pin { lat, lng }).
// `section` puts a collection under Website or Business in the admin menu.

import { ANSWER_TYPES, INTERESTS, MONTH_NAMES, TRAVELLERS } from '../planner.mjs';

const published = { name: 'published', label: 'Show on website', type: 'boolean', default: true };
const order = { name: 'sort_order', label: 'Order', type: 'number', hint: 'Lower numbers appear first.', default: 0 };

export const COLLECTIONS = {
  packages: {
    label: 'Trips',
    singular: 'trip',
    table: 'packages',
    titleField: 'title',
    order: ['sort_order', true],
    columns: ['title', 'category', 'price', 'published'],
    section: 'website',
    paths: (r) => ['/', '/packages', `/packages/${r.slug}`, `/packages/${r.slug}/itinerary`, '/book-a-trip', '/destinations', '/upcoming-trips'],
    groups: [
      {
        title: 'Basics',
        fields: [
          { name: 'title', label: 'Trip name', type: 'text', required: true },
          { name: 'slug', label: 'Web address', type: 'slug', from: 'title', required: true, hint: 'Used in the link: /packages/your-text. Lowercase words and dashes.' },
          { name: 'tagline', label: 'One-line summary', type: 'text', hint: 'Shown under the title and in Google results.' },
          { name: 'destination', label: 'Destination', type: 'text', required: true },
          { name: 'region', label: 'Region', type: 'text', required: true, hint: 'Used by the region filter on the trips page.' },
          { name: 'category', label: 'Travel style', type: 'text', required: true, hint: 'For example Ridge Trek or Wildlife Safari. Trips with the same style are grouped.' },
          { name: 'badge', label: 'Badge', type: 'text', hint: 'Optional short label, for example Signature Expedition.' },
          { name: 'featured', label: 'Feature on the home page', type: 'boolean' },
          published,
          order,
        ],
      },
      {
        title: 'Price and duration',
        fields: [
          { name: 'price', label: 'Price per person', type: 'number', required: true },
          { name: 'currency', label: 'Currency symbol', type: 'text', default: '₹' },
          { name: 'duration_days', label: 'Days', type: 'number', required: true },
          { name: 'duration_nights', label: 'Nights', type: 'number', required: true },
          { name: 'duration_label', label: 'Duration as shown', type: 'text', required: true, hint: 'For example 6 Days / 5 Nights.' },
        ],
      },
      {
        title: 'Key facts',
        fields: [
          { name: 'difficulty', label: 'Difficulty', type: 'text' },
          { name: 'best_season', label: 'Best season', type: 'text' },
          { name: 'max_altitude', label: 'Highest point', type: 'text', hint: 'For example 3,636 m / 11,930 ft.' },
          { name: 'pickup_drop', label: 'Pickup and drop', type: 'text' },
          { name: 'vehicle', label: 'Vehicle', type: 'text' },
          { name: 'permits_info', label: 'Permits', type: 'textarea' },
        ],
      },
      {
        title: 'Photos',
        fields: [
          { name: 'hero_image', label: 'Main photo', type: 'image', required: true },
          { name: 'gallery', label: 'Gallery', type: 'images' },
        ],
      },
      {
        title: 'Description',
        fields: [
          { name: 'overview', label: 'Overview', type: 'textarea', required: true },
          { name: 'highlights', label: 'Highlights', type: 'list' },
          { name: 'inclusions', label: 'Included', type: 'list' },
          { name: 'exclusions', label: 'Not included', type: 'list' },
        ],
      },
      {
        title: 'Itinerary',
        fields: [
          {
            name: 'itinerary',
            label: 'Days',
            type: 'repeater',
            itemLabel: (d, i) => `Day ${d.day || i + 1}${d.title ? `: ${d.title}` : ''}`,
            hint: 'Add an altitude like "2,970 m" to each day and the website draws the altitude chart automatically.',
            fields: [
              { name: 'day', label: 'Day', type: 'number' },
              { name: 'title', label: 'Title', type: 'text' },
              { name: 'altitude', label: 'Altitude', type: 'text' },
              { name: 'stay', label: 'Stay', type: 'text' },
              { name: 'meals', label: 'Meals', type: 'text' },
              { name: 'description', label: 'What happens', type: 'textarea' },
              { name: 'image', label: 'Photo for this day', type: 'image' },
              { name: 'place', label: 'Place on the map', type: 'text', hint: 'Where the traveller sleeps, or the main stop of the day. Shown beside the pin.' },
              { name: 'pin', label: 'Map pin', type: 'pin' },
            ],
          },
        ],
      },
      {
        title: 'Make it yours (price options)',
        fields: [
          {
            name: 'show_customiser',
            label: 'Show "Make it yours" on the trip page',
            type: 'boolean',
            hint: 'Check the prices below first. Travellers see a live estimate built from them.',
          },
          { name: 'child_price', label: 'Trip price per child', type: 'number', min: 0, hint: 'Leave empty to charge children the adult price.' },
          {
            name: 'stay_levels',
            label: 'Stay levels',
            type: 'repeater',
            itemLabel: (s) => (s.name ? `${s.name}${Number(s.price) ? ` (+₹${s.price} per person)` : ' (included)'}` : 'New stay level'),
            hint: 'The first one is picked at the start. Give it an extra of 0, so the trip price stays the starting point.',
            fields: [
              { name: 'name', label: 'Name', type: 'text' },
              { name: 'price', label: 'Extra per person (₹)', type: 'number' },
              { name: 'note', label: 'What it means', type: 'text' },
            ],
          },
          {
            name: 'addons',
            label: 'Add-ons',
            type: 'repeater',
            itemLabel: (a) => (a.name ? `${a.name} (₹${a.price || 0} ${a.per === 'group' ? 'per group' : 'per person'})` : 'New add-on'),
            fields: [
              { name: 'name', label: 'Name', type: 'text' },
              { name: 'price', label: 'Price (₹)', type: 'number' },
              {
                name: 'per',
                label: 'Charged',
                type: 'select',
                options: [
                  { value: 'person', label: 'Per person' },
                  { value: 'group', label: 'Once for the group' },
                ],
              },
              { name: 'child_price', label: 'Price per child (₹)', type: 'number', hint: 'Per-person add-ons only. Leave empty to charge the adult price.' },
              { name: 'note', label: 'Short note', type: 'text' },
            ],
          },
        ],
      },
      {
        title: 'Planner matching',
        fields: [
          { name: 'months', label: 'Good months to go', type: 'checkboxes', options: MONTH_NAMES.map((m, i) => ({ value: i + 1, label: m })), hint: 'The trip planner suggests this trip for these months and warns for the others.' },
          { name: 'suitable_for', label: 'Suits', type: 'checkboxes', options: TRAVELLERS.map((t) => ({ value: t.id, label: t.label })) },
          { name: 'interests', label: 'Matches these interests', type: 'checkboxes', options: INTERESTS.map((i) => ({ value: i.id, label: i.label })) },
        ],
      },
      {
        title: 'Questions and WhatsApp',
        fields: [
          {
            name: 'faqs',
            label: 'Trip questions',
            type: 'repeater',
            itemLabel: (f) => f.q || 'New question',
            fields: [
              { name: 'q', label: 'Question', type: 'text' },
              { name: 'a', label: 'Answer', type: 'textarea' },
            ],
          },
          { name: 'whatsapp_text', label: 'WhatsApp message', type: 'textarea', hint: 'Pre-filled text when a visitor taps Ask on WhatsApp.' },
        ],
      },
    ],
  },

  destinations: {
    label: 'Destinations',
    singular: 'destination',
    table: 'destinations',
    titleField: 'name',
    order: ['sort_order', true],
    columns: ['name', 'altitude', 'published'],
    section: 'website',
    paths: (r) => ['/', '/destinations', `/destinations/${r.slug}`],
    groups: [
      {
        title: 'Basics',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'slug', label: 'Web address', type: 'slug', from: 'name', required: true },
          { name: 'tagline', label: 'One-line summary', type: 'text' },
          { name: 'hero_image', label: 'Photo', type: 'image', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'best_time', label: 'Best time', type: 'text' },
          { name: 'altitude', label: 'Altitude', type: 'text' },
          { name: 'attractions', label: 'What you will see', type: 'list' },
          { name: 'circuits', label: 'Trips that go here', type: 'list', hint: 'One trip web address per line, for example sandakphu-vintage-land-rover.' },
          published,
          order,
        ],
      },
    ],
  },

  experiences: {
    label: 'Things to do',
    singular: 'thing to do',
    table: 'experiences',
    migration: '05_experiences.sql',
    section: 'website',
    titleField: 'title',
    order: ['sort_order', true],
    columns: ['title', 'destination', 'duration', 'published'],
    paths: (r) => ['/', '/destinations', r.destination && `/destinations/${r.destination}`].filter(Boolean),
    note: 'Shown on the destination page under "What you can do here", and on the home page, where visitors can filter them by interest.',
    groups: [
      {
        title: 'Thing to do',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true, hint: 'For example "Sleeping Buddha sunrise from Sandakphu".' },
          { name: 'slug', label: 'Web address', type: 'slug', from: 'title', required: true },
          { name: 'destination', label: 'Destination', type: 'ref', ref: { table: 'destinations', value: 'slug', label: 'name' }, required: true },
          { name: 'image', label: 'Photo', type: 'image', required: true },
          { name: 'summary', label: 'One or two sentences', type: 'textarea' },
          { name: 'duration', label: 'How long it takes', type: 'text', hint: 'For example "Early morning, 2 hours" or "Half day".' },
          { name: 'best_months', label: 'Best months', type: 'checkboxes', options: MONTH_NAMES.map((m, i) => ({ value: i + 1, label: m })) },
          { name: 'interests', label: 'Interests', type: 'checkboxes', options: INTERESTS.map((i) => ({ value: i.id, label: i.label })), hint: 'Visitors filter by these on the home page, the same ones as the trip planner.' },
          { name: 'trips', label: 'Trips that include it', type: 'refs', ref: { table: 'packages', value: 'slug', label: 'title' } },
          published,
          order,
        ],
      },
    ],
  },

  departures: {
    label: 'Departures',
    singular: 'departure',
    table: 'departures',
    migration: '09_planner_departures_popups.sql',
    section: 'website',
    titleField: 'start_date',
    order: ['start_date', false],
    columns: ['start_date', 'trip_slug', 'end_date', 'status', 'seats_left', 'published'],
    paths: (r) => ['/', '/upcoming-trips', '/book-a-trip', r.trip_slug && `/packages/${r.trip_slug}`].filter(Boolean),
    note: 'Fixed dates for a trip, such as "North Sikkim, 22 to 27 November". Open dates show on the trip page, on Upcoming trips and on the home page. Past, sold-out and cancelled dates hide by themselves.',
    validate: (r) => {
      const e = {};
      if (r.start_date && r.end_date && r.end_date < r.start_date) e.end_date = 'The last day is before the first day.';
      if (r.seats_left != null && r.seats_total != null && r.seats_left > r.seats_total) e.seats_left = 'Seats left can not be more than the total.';
      return e;
    },
    groups: [
      {
        title: 'Departure',
        fields: [
          { name: 'trip_slug', label: 'Trip', type: 'ref', ref: { table: 'packages', value: 'slug', label: 'title' }, required: true },
          { name: 'start_date', label: 'First day', type: 'date', required: true },
          { name: 'end_date', label: 'Last day', type: 'date', required: true },
          { name: 'price', label: 'Price per person (₹)', type: 'number', min: 0, hint: 'Leave empty to use the trip price.' },
          { name: 'seats_total', label: 'Seats in total', type: 'number', min: 1, max: 500 },
          { name: 'seats_left', label: 'Seats left', type: 'number', min: 0, max: 500, hint: 'Shown on the website as "5 seats left". Leave empty to not show a count. At 0 the date hides.' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            default: 'open',
            options: [
              { value: 'open', label: 'Open' },
              { value: 'filling', label: 'Filling fast' },
              { value: 'sold_out', label: 'Sold out (hidden)' },
              { value: 'cancelled', label: 'Cancelled (hidden)' },
            ],
          },
          { name: 'note', label: 'Short note', type: 'text', hint: 'For example "Includes pickup from NJP". Up to 200 characters.' },
          published,
        ],
      },
    ],
  },

  planner_questions: {
    label: 'Planner questions',
    singular: 'question',
    table: 'planner_questions',
    migration: '09_planner_departures_popups.sql',
    section: 'website',
    titleField: 'title',
    order: ['sort_order', true],
    columns: ['title', 'type', 'maps_to', 'required', 'published'],
    paths: () => ['/book-a-trip'],
    note: 'The questions on /book-a-trip, one screen each (tick "Same screen as the question before" to group two). The built-in questions marked "Used for matching" choose the suggested trips: you can reword, reorder, hide or require them, and rename their choices, but their choices stay fixed so the matching keeps working. Your own questions are saved with each enquiry but do not change which trips are suggested.',
    validate: (r) => {
      const e = {};
      if (!r.maps_to && ['single', 'multi'].includes(r.type) && !(r.options || []).some((o) => o?.label)) e.options = 'Add at least one choice.';
      return e;
    },
    groups: [
      {
        title: 'Question',
        fields: [
          { name: 'title', label: 'Question', type: 'text', required: true },
          { name: 'key', label: 'Short name', type: 'slug', from: 'title', required: true, hint: 'Saved with each answer. Lowercase words and dashes. Do not change it on the built-in questions.' },
          { name: 'help', label: 'Helper text', type: 'textarea', hint: 'One short line under the question.' },
          {
            name: 'type',
            label: 'Answer type',
            type: 'select',
            required: true,
            default: 'single',
            options: ANSWER_TYPES,
            hint: 'Ignored on the built-in matching questions, which keep their own type.',
          },
          {
            name: 'maps_to',
            label: 'Used for matching',
            type: 'select',
            options: [
              { value: 'destinations', label: 'Destinations' },
              { value: 'month', label: 'Travel month' },
              { value: 'length', label: 'Trip length' },
              { value: 'travelling', label: 'Who is travelling' },
              { value: 'group', label: 'Number of adults and children' },
              { value: 'budget', label: 'Budget (choices are in Site settings)' },
              { value: 'interests', label: 'Interests' },
            ],
            hint: 'Only set on the built-in questions. Leave it on "Choose" for your own questions.',
          },
          { name: 'required', label: 'Travellers must answer', type: 'boolean' },
          { name: 'with_previous', label: 'Same screen as the question before', type: 'boolean' },
          {
            name: 'options',
            label: 'Choices',
            type: 'repeater',
            itemLabel: (o) => o.label || 'New choice',
            hint: 'For one or several choices. On the built-in questions, add a choice whose value is a built-in one to rename it or give it a photo: length short, medium, long, flexible; who solo, couple, family, friends, seniors; interests snow, trekking, heritage, wildlife, photography, relaxed.',
            fields: [
              { name: 'label', label: 'Label', type: 'text' },
              { name: 'value', label: 'Value', type: 'text', hint: 'Optional. Made from the label if empty.' },
              { name: 'image', label: 'Photo', type: 'image' },
              { name: 'trips', label: 'Trips this choice suits', type: 'refs', ref: { table: 'packages', value: 'slug', label: 'title' }, hint: 'Shown to you with the enquiry; does not change the suggested trips.' },
              { name: 'tags', label: 'Tags', type: 'list', hint: 'One per line, for your own sorting.' },
            ],
          },
          published,
          order,
        ],
      },
    ],
  },

  popups: {
    label: 'Pop-ups',
    singular: 'pop-up',
    table: 'popups',
    migration: '09_planner_departures_popups.sql',
    section: 'website',
    titleField: 'title',
    order: ['sort_order', true],
    columns: ['title', 'badge', 'starts_on', 'ends_on', 'published'],
    paths: () => ['/', '/packages', '/destinations', '/upcoming-trips', '/book-a-trip', '/about', '/blog'],
    note: 'A window that opens over the website to announce a new trip or an offer. Only one shows at a time: the first live one (lowest Order) for that page. Visitors can always close it, and it never appears in the admin or for visitors without JavaScript. Trip, destination and story pages pick up a change within 5 minutes.',
    validate: (r) => {
      const e = {};
      if (r.starts_on && r.ends_on && r.ends_on < r.starts_on) e.ends_on = 'The end date is before the start date.';
      if (r.link_type === 'trip' && !r.link_trip) e.link_trip = 'Choose the trip.';
      if (r.link_type === 'departure' && !r.link_departure) e.link_departure = 'Choose the departure.';
      if (r.link_type === 'url' && r.link_url && !/^(https?:\/\/|\/)/.test(r.link_url)) e.link_url = 'Start with https:// or with / for a page on this website.';
      if (r.pages === 'chosen' && !(r.page_paths || []).length) e.page_paths = 'Add at least one page.';
      return e;
    },
    groups: [
      {
        title: 'What it says',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'badge', label: 'Badge', type: 'text', hint: 'Short, for example "New" or "20% off".' },
          { name: 'text', label: 'Text', type: 'textarea', hint: 'Two or three short sentences.' },
          { name: 'image', label: 'Photo', type: 'image', hint: 'Shown across the top of the window. A wide photo works best.' },
        ],
      },
      {
        title: 'Button',
        fields: [
          { name: 'button_label', label: 'Button text', type: 'text', hint: 'For example "See the dates". Leave empty for no button.' },
          {
            name: 'link_type',
            label: 'Button goes to',
            type: 'select',
            required: true,
            default: 'url',
            options: [
              { value: 'trip', label: 'A trip' },
              { value: 'departure', label: 'A departure (opens the planner with the date filled in)' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'url', label: 'A link' },
            ],
          },
          { name: 'link_trip', label: 'Trip', type: 'ref', ref: { table: 'packages', value: 'slug', label: 'title' } },
          { name: 'link_departure', label: 'Departure', type: 'ref', ref: { table: 'departures', value: 'id', label: 'start_date', label2: 'trip_slug' } },
          { name: 'link_url', label: 'Link', type: 'text', hint: 'A page on this site such as /upcoming-trips, or a full link starting with https://' },
        ],
      },
      {
        title: 'When and where it shows',
        fields: [
          { name: 'starts_on', label: 'From', type: 'date', hint: 'Leave empty to start now.' },
          { name: 'ends_on', label: 'Until', type: 'date', hint: 'Leave empty to keep it on until you hide it.' },
          {
            name: 'pages',
            label: 'Pages',
            type: 'select',
            required: true,
            default: 'all',
            options: [
              { value: 'all', label: 'Every page' },
              { value: 'home', label: 'Home page only' },
              { value: 'chosen', label: 'Pages I choose' },
            ],
          },
          { name: 'page_paths', label: 'Pages I choose', type: 'list', hint: 'One per line, for example /packages/north-sikkim-gurudongmar-yumthang. End with * for a whole section: /packages/*' },
          { name: 'delay_seconds', label: 'Wait before showing (seconds)', type: 'number', min: 0, max: 120, default: 3 },
          {
            name: 'frequency',
            label: 'How often',
            type: 'select',
            required: true,
            default: 'daily',
            options: [
              { value: 'every', label: 'Every visit (once per browser session)' },
              { value: 'daily', label: 'Once a day' },
              { value: 'once', label: 'Only once' },
            ],
            hint: 'Closing it counts. A visitor who closed it is not shown it again until this allows.',
          },
          { ...published, default: false },
          { ...order, label: 'Order (priority)', hint: 'When several are live for the same page, the lowest number shows.' },
        ],
      },
    ],
  },

  invoice_items: {
    label: 'Invoice items',
    singular: 'invoice item',
    table: 'invoice_catalog',
    migration: '08_clients_invoices.sql',
    section: 'business',
    titleField: 'name',
    order: ['sort_order', true],
    columns: ['name', 'unit_price', 'tax_rate'],
    paths: () => [],
    note: 'Lines you use often, such as "Sandakphu trip, per person". In the invoice builder they are one click.',
    groups: [
      {
        title: 'Item',
        fields: [
          { name: 'name', label: 'Name on the invoice', type: 'text', required: true },
          { name: 'description', label: 'Extra detail', type: 'text' },
          { name: 'unit_price', label: 'Price (₹)', type: 'number', min: 0, required: true },
          { name: 'tax_rate', label: 'Tax %', type: 'number', min: 0, max: 100, default: 0, hint: 'Ask your accountant which GST rate applies.' },
          { ...published, label: 'Show in the invoice builder' },
          order,
        ],
      },
    ],
  },

  posts: {
    label: 'Journal',
    singular: 'story',
    table: 'posts',
    section: 'website',
    titleField: 'title',
    order: ['published_at', false],
    columns: ['title', 'category', 'published_at', 'published'],
    paths: (r) => ['/', '/blog', `/blog/${r.slug}`],
    groups: [
      {
        title: 'Story',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'slug', label: 'Web address', type: 'slug', from: 'title', required: true },
          { name: 'summary', label: 'Summary', type: 'textarea', hint: 'Two sentences for the card and Google.' },
          { name: 'image', label: 'Cover photo', type: 'image' },
          { name: 'content', label: 'Text', type: 'markdown', required: true },
          { name: 'category', label: 'Category', type: 'text' },
          { name: 'author', label: 'Author', type: 'text' },
          { name: 'read_time', label: 'Read time', type: 'text', hint: 'For example 5 min read.' },
          { name: 'published_at', label: 'Date', type: 'date', required: true },
          published,
        ],
      },
    ],
  },

  reviews: {
    label: 'Reviews',
    singular: 'review',
    table: 'reviews',
    section: 'website',
    titleField: 'author',
    order: ['created_at', false],
    columns: ['author', 'circuit', 'rating', 'published'],
    paths: () => ['/'],
    note: 'Only add reviews from real travellers, with their permission. Reviews appear on the home page once at least one is shown.',
    groups: [
      {
        title: 'Review',
        fields: [
          { name: 'author', label: 'Traveller name', type: 'text', required: true },
          { name: 'location', label: 'From', type: 'text' },
          { name: 'circuit', label: 'Trip taken', type: 'text' },
          { name: 'rating', label: 'Stars (1 to 5)', type: 'number', min: 1, max: 5, default: 5 },
          { name: 'date', label: 'When', type: 'text', hint: 'For example February 2026.' },
          { name: 'comment', label: 'What they said', type: 'textarea', required: true },
          { ...published, default: false },
        ],
      },
    ],
  },

  reels: {
    label: 'Instagram reels',
    singular: 'reel',
    table: 'reels',
    section: 'website',
    titleField: 'title',
    order: ['sort_order', true],
    columns: ['title', 'destination', 'published'],
    paths: () => ['/', '/packages'],
    note: 'Reels show on trip pages whose destination matches the reel destination.',
    groups: [
      {
        title: 'Reel',
        fields: [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'destination', label: 'Destination', type: 'text', required: true },
          { name: 'reel_url', label: 'Instagram link', type: 'url', required: true },
          { name: 'thumbnail', label: 'Cover image', type: 'image', required: true },
          { name: 'caption', label: 'Caption', type: 'textarea' },
          published,
          order,
        ],
      },
    ],
  },

  faqs: {
    label: 'FAQs',
    singular: 'question',
    table: 'faqs',
    section: 'website',
    titleField: 'question',
    order: ['sort_order', true],
    columns: ['question', 'published'],
    paths: () => ['/', '/about'],
    groups: [
      {
        title: 'Question',
        fields: [
          { name: 'question', label: 'Question', type: 'text', required: true },
          { name: 'answer', label: 'Answer', type: 'textarea', required: true },
          published,
          order,
        ],
      },
    ],
  },
};

const repeat = (name, label, itemLabel, fields, hint) => ({ name, label, type: 'repeater', itemLabel, fields, hint });

export const SETTINGS = {
  label: 'Site settings',
  paths: () => ['/', '/packages', '/upcoming-trips', '/destinations', '/blog', '/about', '/book-a-trip', '/policies/privacy-policy', '/policies/terms-conditions'],
  groups: [
    {
      title: 'Business details',
      fields: [
        { name: 'brand_name', label: 'Business name', type: 'text', required: true },
        { name: 'brand_tagline', label: 'Short description', type: 'text' },
        { name: 'phone', label: 'Phone', type: 'text', hint: 'With country code, for example +91 98300 00000.' },
        { name: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'Country code and number. The WhatsApp buttons stay hidden until this is filled.' },
        { name: 'email', label: 'Email', type: 'text' },
        { name: 'address', label: 'Office location', type: 'text' },
        { name: 'office_hours', label: 'Hours', type: 'text' },
        { name: 'instagram', label: 'Instagram link', type: 'url' },
        { name: 'facebook', label: 'Facebook link', type: 'url' },
        { name: 'youtube', label: 'YouTube link', type: 'url' },
      ],
    },
    {
      title: 'Home page: top',
      fields: [
        { name: 'hero_badge', label: 'Small line above the headline', type: 'text' },
        { name: 'hero_title', label: 'Headline', type: 'text', required: true, hint: 'Keep it under about 8 words.' },
        { name: 'hero_text', label: 'Sentence under the headline', type: 'textarea' },
        { name: 'hero_image', label: 'Main photo', type: 'image', required: true },
        { name: 'statement', label: 'Big statement', type: 'textarea', hint: 'The large paragraph that fills in as visitors scroll.' },
      ],
    },
    {
      title: 'Home page: why us',
      fields: [
        { name: 'intro_title', label: 'Title', type: 'text' },
        { name: 'intro_text', label: 'Text', type: 'textarea' },
        { name: 'intro_image', label: 'Photo', type: 'image' },
        repeat('facts', 'Facts list', (f) => f.label || 'New fact', [
          { name: 'label', label: 'Label', type: 'text' },
          { name: 'value', label: 'Value', type: 'text' },
        ], 'Only true facts: altitudes, pickup points, years running. No made-up numbers.'),
        { name: 'intro_note', label: 'Note under the facts', type: 'text' },
      ],
    },
    {
      title: 'Home page: how it works and what is included',
      fields: [
        repeat('steps', 'Steps', (s, i) => `${i + 1}. ${s.title || 'New step'}`, [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'text', label: 'Text', type: 'textarea' },
        ]),
        { name: 'steps_image', label: 'Steps photo', type: 'image' },
        repeat('included', 'Always included', (s) => s.title || 'New item', [
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'text', label: 'Text', type: 'textarea' },
        ]),
        { name: 'included_image', label: 'Included photo', type: 'image' },
      ],
    },
    {
      title: 'Trip planner',
      fields: [
        { name: 'planner_title', label: 'Planner page heading', type: 'text', hint: 'The big heading on /book-a-trip. The questions themselves are under Planner questions.' },
        { name: 'planner_intro', label: 'Planner page intro', type: 'textarea' },
        repeat(
          'budget_bands',
          'Budget choices',
          (b) => b.label || 'New budget choice',
          [
            { name: 'label', label: 'Label shown to travellers', type: 'text' },
            { name: 'min', label: 'From (₹ per person)', type: 'number' },
            { name: 'max', label: 'Up to (₹ per person)', type: 'number' },
          ],
          'Prices are per person. Leave "Up to" empty for the top choice. A trip counts as inside a choice from the lower figure up to, but not including, the upper figure.'
        ),
      ],
    },
    {
      title: 'Closing banner and newsletter',
      fields: [
        { name: 'cta_title', label: 'Banner title', type: 'text' },
        { name: 'cta_text', label: 'Banner text', type: 'textarea' },
        { name: 'cta_image', label: 'Banner photo', type: 'image' },
        { name: 'newsletter_title', label: 'Newsletter title', type: 'text' },
        { name: 'newsletter_text', label: 'Newsletter text', type: 'textarea' },
      ],
    },
    {
      title: 'About page',
      fields: [
        { name: 'about_title', label: 'Title', type: 'text' },
        { name: 'about_text', label: 'Story', type: 'markdown' },
        { name: 'about_image', label: 'Photo', type: 'image' },
      ],
    },
    {
      title: 'Legal pages',
      fields: [
        { name: 'privacy_text', label: 'Privacy policy', type: 'markdown' },
        { name: 'terms_text', label: 'Terms and conditions', type: 'markdown' },
      ],
    },
    {
      title: 'Search and sharing',
      fields: [
        { name: 'seo_title', label: 'Home page title in Google', type: 'text' },
        { name: 'seo_description', label: 'Description in Google', type: 'textarea', hint: 'About 150 characters.' },
        { name: 'og_image', label: 'Image when shared on WhatsApp or social media', type: 'image' },
      ],
    },
  ],
};

// Business details printed on invoices. Stored in the private business_profile table (admins only),
// not in Site settings, which anyone can read. Each invoice keeps a copy of them from the day it is issued.
export const BUSINESS = {
  groups: [
    {
      title: 'Your business on the invoice',
      fields: [
        { name: 'legal_name', label: 'Legal business name', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'gstin', label: 'GSTIN', type: 'text', hint: 'Leave empty if the business is not registered for GST.' },
        { name: 'phone', label: 'Phone', type: 'text' },
        { name: 'email', label: 'Email', type: 'text' },
        { name: 'logo', label: 'Logo', type: 'image' },
      ],
    },
    {
      title: 'Numbers, dates and tax',
      fields: [
        {
          name: 'invoice_prefix',
          label: 'Invoice number prefix',
          type: 'text',
          default: 'SH',
          hint: 'Letters and numbers only. Invoices are numbered PREFIX/2026-27/0001, one series per financial year (April to March). Ask your accountant before changing it once invoices are issued.',
        },
        { name: 'due_days', label: 'Days to pay', type: 'number', min: 0, max: 365, default: 7, hint: 'The due date is set this many days after the issue date, unless you set one yourself.' },
        { name: 'default_tax_rate', label: 'Usual tax %', type: 'number', min: 0, max: 100, default: 5, hint: 'Filled in on new lines. GST on tour packages depends on how the business is set up, so confirm the rate with your accountant.' },
        {
          name: 'tax_mode',
          label: 'Prices you type are',
          type: 'select',
          required: true,
          default: 'exclusive',
          options: [
            { value: 'exclusive', label: 'Before tax (tax added on top)' },
            { value: 'inclusive', label: 'Including tax' },
          ],
        },
      ],
    },
    {
      title: 'Payment details and terms',
      fields: [
        { name: 'payment_details', label: 'How to pay', type: 'textarea', hint: 'Bank name, account number, IFSC and UPI ID. Printed on every invoice.' },
        { name: 'terms', label: 'Terms', type: 'textarea', hint: 'For example the deposit and cancellation rules. Printed at the bottom of the invoice.' },
        { name: 'signatory', label: 'Signed by', type: 'text', hint: 'Name printed above "Authorised signatory".' },
      ],
    },
  ],
};

export const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'closed', label: 'Closed' },
];

export const allFields = (groups) => groups.flatMap((g) => g.fields);
const ARRAY_TYPES = ['list', 'images', 'repeater', 'checkboxes', 'refs'];

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Turns form state into a DB row and returns { row, errors }.
export function toRow(groups, values) {
  const row = {};
  const errors = {};
  for (const f of allFields(groups)) {
    let v = values[f.name];
    if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
    if (f.type === 'boolean') v = Boolean(v);
    if (f.type === 'list') v = Array.isArray(v) ? v : String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (f.type === 'checkboxes' || f.type === 'refs') v = Array.isArray(v) ? v.filter((x) => x !== '' && x != null) : [];
    if (f.type === 'images') v = Array.isArray(v) ? v.filter(Boolean) : [];
    if (f.type === 'repeater') v = Array.isArray(v) ? v : [];
    if (typeof v === 'string') v = v.trim();
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    if (f.required && empty) errors[f.name] = `${f.label} is required.`;
    if (f.type === 'number' && v != null && Number.isNaN(v)) errors[f.name] = `${f.label} must be a number.`;
    if (f.type === 'number' && v != null && ((f.min != null && v < f.min) || (f.max != null && v > f.max)))
      errors[f.name] = `${f.label} must be between ${f.min} and ${f.max}.`;
    if (f.type === 'slug' && v && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) errors[f.name] = 'Use lowercase letters, numbers and dashes only.';
    if (f.type === 'url' && v && !/^https?:\/\/\S+$/.test(v)) errors[f.name] = 'Enter a full link starting with https://';
    row[f.name] = empty && !ARRAY_TYPES.includes(f.type) && f.type !== 'boolean' ? null : v;
  }
  return { row, errors };
}

export function defaults(groups) {
  return Object.fromEntries(allFields(groups).map((f) => [f.name, f.default ?? (ARRAY_TYPES.includes(f.type) ? [] : f.type === 'boolean' ? false : '')]));
}
