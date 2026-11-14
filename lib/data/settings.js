// Default site copy. Once Supabase is connected, the admin "Site settings" page overrides every field here.
// Photos are library stand-ins (Unsplash) until the client uploads his own in the admin.
export const DEFAULT_SETTINGS = {
  brand_name: 'Singalila Hills',
  brand_tagline: 'Himalayan journeys and stays',
  phone: '',
  whatsapp: '',
  email: '',
  address: 'Darjeeling, West Bengal',
  office_hours: 'Every day, 9am to 8pm IST',
  instagram: '',
  facebook: '',
  youtube: '',

  hero_badge: 'Small groups and private trips across the Eastern Himalaya',
  hero_title: 'The Himalaya, planned by people who live here.',
  hero_text: 'Darjeeling, Sikkim, Sandakphu and the Dooars, with local drivers, ridge homestays and every permit handled.',
  hero_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80',

  statement:
    'Six circuits across North Bengal and Sikkim. Vintage Land Rovers on the Singalila Ridge, tea estate bungalows, glacial lakes at seventeen thousand feet, and a team that answers on WhatsApp.',

  intro_title: 'Planned and run from Darjeeling.',
  intro_text:
    'We grew up under these ridges. We know which homestay keeps the bukhari burning, which pass closes first in winter and which morning the Sleeping Buddha shows itself.',
  intro_image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80',
  intro_note: 'Park, inner line and protected area permits are arranged before you arrive.',
  facts: [
    { label: 'Highest point on our routes', value: '5,425 m' },
    { label: 'Pickup', value: 'NJP or Bagdogra' },
    { label: 'Permits arranged', value: 'All of them' },
    { label: 'Regions we run', value: '4' },
  ],

  steps: [
    { title: 'Send your dates and group', text: 'Use the trip planner or message us on WhatsApp with the places, month and number of travellers.' },
    { title: 'Get a day-by-day route and a price', text: 'Stays, drives and altitudes for each day, with one price per person. Change anything before you confirm.' },
    { title: 'Meet your driver at NJP or Bagdogra', text: 'Permits, homestays and meals on the ridge are already arranged when you land.' },
  ],
  steps_image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80',

  included: [
    { title: 'Driver and guide throughout', text: 'From the first pickup to the last drop at the station or airport.' },
    { title: 'Homestays and estate bungalows', text: 'Ridge homestays, tea estate bungalows and family-run hotels.' },
    { title: 'Land Rovers on the ridge', text: 'SUVs on the plains and every transfer booked in advance.' },
    { title: 'Every permit, arranged', text: 'Inner line, protected area and park permits sorted before you arrive.' },
  ],
  included_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80',

  cta_title: 'Plan your Himalayan trip with us.',
  cta_text: 'Send a rough idea, your dates and group size. We reply with a first route and a price per person.',
  cta_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80',

  newsletter_title: 'Road and season notes',
  newsletter_text: 'An occasional note with new departures, quiet-season ideas and road conditions on the ridge.',

  about_title: 'A Darjeeling team that plans the trips it would take itself.',
  about_text:
    'Singalila Hills plans journeys across Darjeeling, Sikkim, Sandakphu and the Dooars.\n\nWe work with ridge homestays, tea estate bungalows and local drivers we have known for years, so the trip runs the way it should even when the weather changes.\n\nAsk us anything on WhatsApp before you book. A real person answers.',
  about_image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80',

  privacy_text:
    'This page explains what we collect when you use this website and why.\n\n**What we collect**\n\nWhen you send an enquiry we store your name, phone number, email (if given), the trip you asked about, your travel month, group size and your message. When you subscribe we store your email address.\n\n**Why**\n\nOnly to reply to you and plan your trip, or to send the newsletter you asked for. We do not sell or share your details.\n\n**How long**\n\nEnquiries are kept for up to two years. You can ask us to delete your details at any time.\n\n**Contact**\n\nWrite to us using the details on the contact page.',
  terms_text:
    'These terms apply to trips booked with Singalila Hills.\n\n**Booking**\n\nA trip is confirmed once we receive the advance payment and send a written confirmation.\n\n**Prices**\n\nPrices are per person unless stated and include what is listed on the trip page.\n\n**Changes and cancellations**\n\nMountain roads and weather can change a route. We will always offer the safest alternative.\n\n**Permits**\n\nTravellers must carry the identity documents listed on the trip page.',

  // Trip planner: the budget choices travellers see. Prices are per person; leave "up to" empty for no upper limit.
  budget_bands: [
    { label: 'Under ₹16,000', min: 0, max: 16000 },
    { label: '₹16,000 to ₹20,000', min: 16000, max: 20000 },
    { label: '₹20,000 to ₹25,000', min: 20000, max: 25000 },
    { label: 'Over ₹25,000', min: 25000, max: '' },
  ],

  seo_title: 'Singalila Hills — Himalayan journeys from Darjeeling',
  seo_description:
    'Small-group and private trips across Darjeeling, Sikkim, Sandakphu and the Dooars. Vintage Land Rover safaris, ridge treks, tea estate stays and wildlife circuits.',
  og_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
};

export const FAQS = [
  { id: 'faq-1', question: 'Do you run shared or private trips?', answer: 'Most trips run privately for your own group. Shared departures are kept small so everyone fits in one or two vehicles.', sort_order: 1 },
  { id: 'faq-2', question: 'Where do trips start?', answer: 'Almost every trip starts and ends at NJP railway station or Bagdogra airport. We can pick you up from Siliguri or Darjeeling too.', sort_order: 2 },
  { id: 'faq-3', question: 'Do you arrange permits?', answer: 'Yes. Send us your ID copies and passport photos before arrival and we arrange the park, inner line and protected area permits.', sort_order: 3 },
  { id: 'faq-4', question: 'What is the best time to go?', answer: 'October to December for clear mountain views, March to May for rhododendrons. Each trip page lists its own best season.', sort_order: 4 },
  { id: 'faq-5', question: 'Is it suitable for children or older parents?', answer: 'The Land Rover and road trips need no trekking. Tell us who is travelling and we will suggest the right pace and altitude.', sort_order: 5 },
  { id: 'faq-6', question: 'Can you plan around our own list of places?', answer: 'Yes. Pick the places you want and we will put the route, stays and price together for you.', sort_order: 6 },
];
