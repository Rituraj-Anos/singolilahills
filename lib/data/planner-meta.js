// Planner matching data for the bundled trips: good months, who each trip suits, and interests.
// Months come from each trip's best_season text. The "suitable for" and interests choices are a first
// draft for the owner to review: he can change all of this per trip in the admin under Trips > Planner matching.
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const PLANNER_META = {
  'sandakphu-vintage-land-rover': { months: [10, 11, 12, 1, 2, 3, 4, 5], suitable_for: ['couple', 'family', 'friends', 'seniors'], interests: ['snow', 'photography'] },
  'singalila-ridge-trek': { months: [10, 11, 12, 3, 4, 5], suitable_for: ['solo', 'couple', 'friends'], interests: ['trekking', 'wildlife', 'photography'] },
  'darjeeling-colonial-tea-retreat': { months: ALL, suitable_for: ['couple', 'family', 'seniors'], interests: ['heritage', 'relaxed', 'photography'] },
  'offbeat-silk-route-zuluk': { months: [10, 11, 12, 4, 5, 6], suitable_for: ['solo', 'couple', 'friends', 'family'], interests: ['photography', 'relaxed'] },
  'north-sikkim-gurudongmar-yumthang': { months: [10, 11, 12, 4, 5, 6], suitable_for: ['solo', 'couple', 'friends'], interests: ['snow', 'photography'] },
  'dooars-wildlife-rhino-safari': { months: [10, 11, 12, 1, 2, 3, 4, 5], suitable_for: ['couple', 'family', 'friends', 'seniors'], interests: ['wildlife', 'relaxed', 'photography'] },
};
