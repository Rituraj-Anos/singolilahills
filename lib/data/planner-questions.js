// The trip planner's questions as they are today. Used when the database has no planner_questions table yet,
// and copied into that table by migration 09 so the owner can edit them.
// `maps_to` ties a question to the trip matching (lib/match.mjs). Those questions keep their fixed choices,
// so matching keeps working; the owner can still change the wording, order, visibility and whether it is required.
// Questions without `maps_to` are the owner's own: their answers are saved with the enquiry but do not change the ranking.
// `with_previous` shows a question on the same screen as the one before it.
export const DEFAULT_QUESTIONS = [
  {
    id: 'pq-destinations',
    key: 'destinations',
    maps_to: 'destinations',
    type: 'destinations',
    title: 'Where do you want to go?',
    help: 'Pick one or more places. Skip this if you are not sure yet.',
  },
  { id: 'pq-month', key: 'month', maps_to: 'month', type: 'single', title: 'When are you thinking of travelling?', help: 'A rough month is enough.' },
  { id: 'pq-length', key: 'length', maps_to: 'length', type: 'single', title: 'How long?', with_previous: true },
  { id: 'pq-travelling', key: 'travelling', maps_to: 'travelling', type: 'single', title: 'Who is coming?', help: 'This helps us suggest the right pace and altitude.' },
  { id: 'pq-group', key: 'group', maps_to: 'group', type: 'number', title: 'How many of you?', with_previous: true },
  { id: 'pq-budget', key: 'budget', maps_to: 'budget', type: 'single', title: 'What is your budget per person?', help: 'It covers transport, stays, permits and most meals on the route.' },
  { id: 'pq-interests', key: 'interests', maps_to: 'interests', type: 'multi', title: 'What do you enjoy?', help: 'Pick as many as you like.' },
].map((q, i) => ({ required: false, with_previous: false, help: '', options: [], published: true, sort_order: i * 10, ...q }));
