export const BLOGS = [
  {
    id: 'blog-1',
    slug: 'sandakphu-trek-vs-land-rover',
    title: 'Sandakphu Trek vs. Vintage Land Rover: Which Experience is Right for You?',
    date: '2026-03-05',
    author: 'Tenzing Sherpa',
    read_time: '5 min read',
    category: 'Trip Planning',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    summary:
      'A candid comparison of walking the classic 7-day Singalila ridge route versus bouncing along historic boulder tracks in an iconic 1950s British Land Rover.',
    content: `Standing at 3,636 meters, Sandakphu is the crowning peak of West Bengal, offering an unbroken panorama of the Sleeping Buddha (Kangchenjunga) and Mount Everest. There are two ways to reach this ridge: trekking on foot or an iconic 4x4 Land Rover safari.

**The Vintage Land Rover Safari** is perfect for families with children or senior parents, photographers with heavy gear, and travelers with limited time (4–5 days). The 70-year-old vehicles navigate cobblestone tracks built during the British era — raw, rugged, and unforgettable.

**The Singalila Ridge Trek** suits trekkers seeking gradual acclimatization and mountain solitude, wildlife enthusiasts hoping to spot Red Pandas in Singalila National Park, and those who love arriving at ridge homestays after a rewarding 6-hour walk.

**Singolila Hills Recommendation**: If you have 6–7 days and moderate fitness, walk the ridge. For comfort, history, and vintage Himalayan expedition feel, choose our Land Rover package!`,
  },
  {
    id: 'blog-2',
    slug: 'sikkim-travel-permits-2026',
    title: 'Sikkim & Singalila Permits 2026: Complete Guide for Indian & Foreign Travelers',
    date: '2026-02-28',
    author: 'Pema Bhutia',
    read_time: '6 min read',
    category: 'Permits & Regulations',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    summary:
      'Everything you need to know about Inner Line Permits (ILP), Protected Area Permits (PAP), and army checkposts for North Sikkim, Zuluk, and Sandakphu in 2026.',
    content: `Because North Bengal and Sikkim border Nepal, Bhutan, and Tibet, certain security zones require strict permit documentation. At Singolila Hills we handle 100% of the paperwork.

**Singalila National Park & Sandakphu**: Indian nationals need Voter ID / Aadhaar + Singalila National Park forest entry pass (issued at Manebhanjan checkpost). Foreign nationals need a valid Passport + Indian Visa + special permit from the FRO in Darjeeling.

**East Sikkim (Silk Route / Zuluk) & North Sikkim (Gurudongmar / Yumthang)**: Protected Area Permit (PAP) mandatory for ALL travelers including Indians. Documents: 4 passport-size photos + original Voter ID or Passport. Note: PAN Card and Aadhaar are NOT accepted at military checkposts in North Sikkim.

**The Singolila Hills Hassle-Free Promise**: Send us scanned copies of your ID and 4 passport photos 48 hours before arrival. Our Siliguri operations hub pre-clears all checkposts before your plane lands at Bagdogra.`,
  },
  {
    id: 'blog-3',
    slug: 'best-tea-estate-stays-darjeeling',
    title: 'Top Offbeat Tea Estate Stays in Darjeeling: Beyond Standard Hotels',
    date: '2026-02-15',
    author: 'Ananya Roy',
    read_time: '4 min read',
    category: 'Stays & Culture',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    summary:
      'Why staying at a century-old planter\'s bungalow surrounded by misty Camellia Sinensis bushes will completely redefine your Darjeeling vacation.',
    content: `Real Darjeeling magic lies 45 minutes outside town, in sprawling bio-organic tea hills dating back to the 1850s.

Imagine waking at 6:30 AM to a freshly plucked cup of **Darjeeling First Flush — the Champagne of Teas** — served on fine bone china. You open teak French windows to see Mt. Kanchenjunga bathed in morning gold, with tea pluckers singing folk melodies across the emerald terraces below.

**Key Planter's Bungalow Highlights**:
- **Fireplace Dinners**: Wood-paneled halls warmed by cedar wood fires.
- **Private Factory Access**: Watch green leaves being withered, rolled, and oxidized into aromatic black gold.
- **Farm-to-Table Gastronomy**: Organic vegetables grown on estate garden patches served at every meal.

Book your heritage tea retreat with Singolila Hills for exclusive bungalow reservations not listed on public booking engines.`,
  },
];

export function getBlogBySlug(slug) {
  return BLOGS.find((b) => b.slug === slug) || null;
}
