// Ranks trips against a traveller's plan. A simple points system, so the owner can predict and explain results.
//   goes to a chosen destination +3 | length fits +2 (within one day +1) | price in budget +2 (up to 15% over +1)
//   good month +1 | suits the travellers +1 | each matching interest +1 (max 2)
import { INTERESTS, LENGTHS, MONTH_NAMES, TRAVELLERS, monthNumber } from './planner.mjs';

export const MIN_SCORE = 3;
const num = (v) => (v === '' || v == null ? null : Number(v));
const inr = (n, cur = '₹') => `${cur}${Number(n).toLocaleString('en-IN')}`;

// Band prices are per person; the lower limit is inclusive, the upper limit is exclusive. A blank upper limit means no cap.
export function bandRange(band) {
  const min = num(band?.min);
  const max = num(band?.max);
  return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : Infinity };
}

export function scoreTrip(trip, plan, destinations = [], bands = []) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  const hit = destinations.find((d) => plan.destinations.includes(d.slug) && (d.circuits || []).includes(trip.slug));
  if (hit) {
    score += 3;
    reasons.push(`Goes to ${hit.name}`);
  }

  const len = LENGTHS.find((l) => l.id === plan.length);
  if (len && len.min != null) {
    const d = Number(trip.duration_days);
    if (d >= len.min && d <= len.max) {
      score += 2;
      reasons.push(`${d} days fits your plan`);
    } else if (d >= len.min - 1 && d <= len.max + 1) {
      score += 1;
    }
  }

  const band = plan.budget != null ? bands[plan.budget] : null;
  if (band) {
    const { min, max } = bandRange(band);
    const price = Number(trip.price);
    if (price >= min && price < max) {
      score += 2;
      reasons.push(`${inr(price, trip.currency)} per person is within your budget`);
    } else if (price >= max && price <= max * 1.15) {
      score += 1;
      warnings.push('A little above your budget');
    } else if (price > max * 1.15) {
      warnings.push('Above your budget');
    }
  }

  const m = monthNumber(plan.month);
  if (m && trip.months?.length) {
    if (trip.months.includes(m)) {
      score += 1;
      reasons.push(`A good time to go in ${MONTH_NAMES[m - 1]}`);
    } else {
      // roads close and views vanish out of season, so this must outweigh a matching region
      score -= 2;
      warnings.push(`Not the best season in ${MONTH_NAMES[m - 1]}`);
    }
  }

  const who = TRAVELLERS.find((t) => t.id === plan.travelling);
  if (who && trip.suitable_for?.includes(who.id)) {
    score += 1;
    reasons.push(`Suits ${who.suits}`);
  }

  const shared = plan.interests.filter((i) => trip.interests?.includes(i));
  if (shared.length) {
    score += Math.min(2, shared.length);
    reasons.push(`Matches ${shared.map((i) => INTERESTS.find((x) => x.id === i)?.label.toLowerCase()).filter(Boolean).join(' and ')}`);
  }

  return { trip, score, reasons, warnings };
}

export function rankTrips(trips, plan, destinations = [], bands = [], { limit = 3, minScore = MIN_SCORE } = {}) {
  return trips
    .map((t, i) => ({ ...scoreTrip(t, plan, destinations, bands), order: i }))
    .filter((r) => r.score >= minScore)
    // equal points: fewer warnings first, then the owner's own trip order
    .sort((a, b) => b.score - a.score || a.warnings.length - b.warnings.length || a.order - b.order)
    .slice(0, limit)
    .map(({ order, ...r }) => r);
}
