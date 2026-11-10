export const DESTINATIONS = [
  {
    id: 'dest-sandakphu',
    slug: 'sandakphu-singalila',
    name: 'Sandakphu & Singalila',
    tagline: 'Top of Bengal — Where Everest Meets the Sleeping Buddha',
    hero_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
    description: 'Straddling the India-Nepal border at 11,930 ft, Sandakphu is the only viewpoint on Earth offering unobstructed panoramas of four of the five highest peaks: Everest, Kangchenjunga, Lhotse, and Makalu.',
    best_time: 'October to May',
    altitude: '3,636 m / 11,930 ft',
    attractions: ['Sleeping Buddha Sunrise', '1950s British Land Rover stone tracks', 'Singalila Red Panda Sanctuary', 'Tumling & Kalipokhri border villages', 'Phalut alpine plateau'],
    circuits: ['sandakphu-vintage-land-rover', 'singalila-ridge-trek'],
  },
  {
    id: 'dest-darjeeling',
    slug: 'darjeeling',
    name: 'Darjeeling & Kurseong',
    tagline: 'Queen of the Hills — Colonial Heritage & First Flush Tea',
    hero_image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=80',
    description: 'Steeped in colonial heritage, world-renowned tea estates, and the rhythmic whistle of the UNESCO steam Toy Train, Darjeeling offers a timeless Himalayan escape with commanding vistas of Kangchenjunga.',
    best_time: 'September to June',
    altitude: '2,134 m / 7,000 ft',
    attractions: ['Tiger Hill Sunrise', 'UNESCO Darjeeling Himalayan Railway (DHR)', 'Makaibari & Glenburn Tea Estates', 'Mall Road Chowrasta & Glenary\'s Bakery', 'Himalayan Mountaineering Institute (HMI)'],
    circuits: ['darjeeling-colonial-tea-retreat'],
  },
  {
    id: 'dest-sikkim',
    slug: 'sikkim',
    name: 'Sikkim & Silk Route',
    tagline: 'Sacred Glacial Lakes, Ancient Loops & Rhododendron Valleys',
    hero_image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
    description: 'From the dizzying 32 hairpins of Zuluk on the ancient Indo-Tibetan Silk Route to holy Gurudongmar Lake at 17,800 ft and Yumthang\'s floral carpets, Sikkim is the jewel of the Eastern Himalayas.',
    best_time: 'March to June & October to December',
    altitude: '1,650 m to 5,425 m',
    attractions: ['Gurudongmar Lake (17,800 ft)', 'Zuluk 32 hairpin loops', 'Yumthang Valley & Zero Point', 'Kupup Elephant Lake & Baba Mandir', 'Rumtek & Enchey Monasteries'],
    circuits: ['offbeat-silk-route-zuluk', 'north-sikkim-gurudongmar-yumthang'],
  },
  {
    id: 'dest-dooars',
    slug: 'dooars',
    name: 'Dooars & Foothills',
    tagline: 'Wild Rhinos, Sal Forests & Bhutan Border Rivers',
    hero_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    description: 'Where the Himalayas gently touch the floodplains. Dooars is a vast green expanse of Sal forests, misty tea gardens, and wildlife sanctuaries sheltering the one-horned rhinoceros, wild elephants, leopards, and rare hornbills.',
    best_time: 'October to May',
    altitude: '100 m to 400 m',
    attractions: ['Jaldapara Elephant Safari for Rhinos', 'Gorumara watchtowers (Jatraprasad & Medla)', 'Buxa Tiger Reserve & historical fort', 'Jayanti riverbed on Bhutan border', 'South Khayerbari Leopard Center'],
    circuits: ['dooars-wildlife-rhino-safari'],
  },
];

export function getDestinationBySlug(slug) {
  return DESTINATIONS.find((d) => d.slug === slug) || null;
}
