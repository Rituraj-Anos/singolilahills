// Describes every editable content type once. The admin list and editor screens are generated from this.
// Field types: text, textarea, markdown, number, boolean, image, images, list (one item per line),
// select, date, repeater (array of objects with `fields`).

import { INTERESTS, MONTH_NAMES, TRAVELLERS } from '../planner.mjs';

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
    paths: (r) => ['/', '/packages', `/packages/${r.slug}`, '/book-a-trip', '/destinations'],
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

  posts: {
    label: 'Journal',
    singular: 'story',
    table: 'posts',
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
  paths: () => ['/', '/packages', '/destinations', '/blog', '/about', '/book-a-trip', '/policies/privacy-policy', '/policies/terms-conditions'],
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

export const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'closed', label: 'Closed' },
];

export const allFields = (groups) => groups.flatMap((g) => g.fields);

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
    if (f.type === 'checkboxes') v = Array.isArray(v) ? v : [];
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
    row[f.name] = empty && !['boolean', 'list', 'images', 'repeater', 'checkboxes'].includes(f.type) ? null : v;
  }
  return { row, errors };
}

export function defaults(groups) {
  return Object.fromEntries(
    allFields(groups).map((f) => [f.name, f.default ?? (['list', 'images', 'repeater', 'checkboxes'].includes(f.type) ? [] : f.type === 'boolean' ? false : '')])
  );
}
