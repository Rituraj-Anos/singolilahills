// Example stay levels and add-ons for the "Make it yours" panel. The prices are placeholders the owner
// must check, so every trip starts with the panel switched off (show_customiser: false). He turns it on per
// trip in the admin once the prices are right.
const STAYS = (comfort, premium) => [
  { name: 'Standard', price: 0, note: 'Homestays and family-run hotels, as listed in the day plan.' },
  { name: 'Comfort', price: comfort, note: 'Better rooms where the route allows, with attached bathrooms.' },
  { name: 'Premium', price: premium, note: 'The best stay at each stop, including heritage hotels in Darjeeling or Gangtok.' },
];

export const TRIP_OPTIONS = {
  'sandakphu-vintage-land-rover': {
    child_price: 12500,
    stay_levels: STAYS(2500, 6000),
    addons: [
      { name: 'Extra night in Darjeeling', price: 3500, per: 'person', child_price: 2000 },
      { name: 'Tiger Hill sunrise drive', price: 1200, per: 'group' },
      { name: 'Toy train joy ride', price: 1600, per: 'person', child_price: 1600 },
    ],
  },
  'singalila-ridge-trek': {
    child_price: 11000,
    stay_levels: STAYS(2000, 4500),
    addons: [
      { name: 'Porter for the whole trek', price: 6000, per: 'group' },
      { name: 'Extra night in Darjeeling', price: 3500, per: 'person', child_price: 2000 },
    ],
  },
  'darjeeling-colonial-tea-retreat': {
    child_price: 15000,
    stay_levels: STAYS(4000, 9000),
    addons: [
      { name: 'Private car for the whole trip', price: 7000, per: 'group' },
      { name: 'Extra night on the tea estate', price: 5500, per: 'person', child_price: 3000 },
    ],
  },
  'offbeat-silk-route-zuluk': {
    child_price: 10000,
    stay_levels: STAYS(2000, 4500),
    addons: [{ name: 'Private car for the whole trip', price: 6500, per: 'group' }],
  },
  'north-sikkim-gurudongmar-yumthang': {
    child_price: 14000,
    stay_levels: STAYS(3000, 7000),
    addons: [
      { name: 'Private car for the whole trip', price: 9000, per: 'group' },
      { name: 'Extra night in Gangtok', price: 3000, per: 'person', child_price: 1800 },
    ],
  },
  'dooars-wildlife-rhino-safari': {
    child_price: 11000,
    stay_levels: STAYS(2500, 6000),
    addons: [
      { name: 'Extra jeep safari', price: 3500, per: 'group' },
      { name: 'Extra night in the forest', price: 3000, per: 'person', child_price: 1800 },
    ],
  },
};
