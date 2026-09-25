import { DESTINATION_TYPES, VIBES, type StayStyleId } from "@/config/preferences";
import type { Preferences, TripOption } from "@/lib/schemas";
import { addDays, formatRange, monthOf } from "@/lib/engine/dateUtils";
import { CITY_COORDS, DESTINATIONS, type Destination } from "./destinations";
import type { SuggestInput, Suggester } from "./types";

// MOCK MODE stand-in for Gemini. A small, deterministic ranker over a fixed
// list of destinations, so the demo behaves believably without an API key.
// It returns the same JSON shape Gemini is asked for.

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const round100 = (n: number) => Math.round(n / 100) * 100;
const typeLabel = (id: string) => DESTINATION_TYPES.find((t) => t.id === id)?.label.toLowerCase() ?? id;
const vibeLabel = (id: string) => VIBES.find((v) => v.id === id)?.label.toLowerCase() ?? id;

function distanceKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

interface Travel {
  mode: "train/bus" | "flight";
  hours: number;
  roundTrip: number;
  feasible: boolean;
}

function travelFor(p: Preferences, d: Destination): Travel {
  const home = CITY_COORDS[p.homeCity] ?? CITY_COORDS.Nagpur; // "Other" → assume central India
  const km = distanceKm(home, [d.lat, d.lon]) * 1.3;
  const ground: Travel = {
    mode: "train/bus",
    hours: Math.max(1, km / 55 + 0.5),
    roundTrip: 2 * Math.max(400, km * 1.4),
    feasible: true,
  };
  const canFly = !p.dealbreakers.includes("no_flights") && km > 400;
  const flight: Travel | null = canFly
    ? { mode: "flight", hours: 2.5 + km / 750 + d.airportTransferH, roundTrip: 2 * (2500 + km * 1.2 + 600), feasible: true }
    : null;
  const cap = p.maxTravelHours ?? 16;
  if (ground.hours <= cap) return ground;
  if (flight && flight.hours <= cap) return flight;
  const fastest = flight && flight.hours < ground.hours ? flight : ground;
  return { ...fastest, feasible: p.maxTravelHours === null };
}

function majority<T extends string>(values: T[]): T {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

interface Scored {
  dest: Destination;
  option: TripOption;
  groupScore: number;
  /** Why this destination can't be offered at all (hard constraint), if so. */
  blocked: string | null;
}

interface PersonFit {
  name: string;
  score: number;
  reason: string;
}

function scorePerson(
  name: string,
  p: Preferences,
  d: Destination,
  travel: Travel,
  groupCostExTravel: number,
  outOfDates: boolean,
  dates: string,
): PersonFit {
  let score = 50;
  const plus: [number, string][] = [];
  const minus: [number, string][] = [];

  const ranks = p.destinationTypesRanked;
  const weights = [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.1];
  let bestRank = -1;
  d.types.forEach((t) => {
    const i = ranks.indexOf(t);
    if (i >= 0 && (bestRank < 0 || i < bestRank)) bestRank = i;
  });
  if (bestRank >= 0) {
    score += 32 * weights[bestRank];
    plus.push([32 * weights[bestRank], bestRank === 0 ? `${typeLabel(ranks[0])} is your #1` : `${typeLabel(ranks[bestRank])} is on your list`]);
  } else {
    score -= 12;
    minus.push([12, `${typeLabel(d.types[0])} isn't really your thing`]);
  }

  if (d.vibes.includes(p.vibe)) {
    score += 12;
    plus.push([12, p.vibe === "mix" ? "has a bit of everything" : `the ${vibeLabel(p.vibe)} vibe fits`]);
  } else if (p.vibe === "mix") {
    score += 5;
  } else {
    score -= 8;
    minus.push([8, `not much of a ${vibeLabel(p.vibe)} place`]);
  }

  const wish = p.placesWishlist.toLowerCase();
  const destKey = d.name.toLowerCase().split(/[ &]/)[0];
  if (wish && wish.includes(destKey)) {
    score += 18;
    plus.push([25, `${d.name}'s on your wishlist`]);
  }

  const myTotal = groupCostExTravel + travel.roundTrip;
  if (myTotal > p.budget.max) {
    const over = myTotal - p.budget.max;
    const pen = Math.min(35, (over / p.budget.max) * 90);
    score -= pen;
    minus.push([pen + 5, `about ${inr(round100(over))} over your ${inr(p.budget.max)} cap`]);
  } else {
    score += 5;
  }

  if (!travel.feasible) {
    score -= 35;
    minus.push([40, `${Math.round(travel.hours)}h each way, past your limit`]);
  } else if (p.maxTravelHours && travel.hours <= p.maxTravelHours / 2) {
    score += 5;
    plus.push([4, `just ${Math.round(travel.hours)}h from ${p.homeCity === "Other" ? "home" : p.homeCity}`]);
  } else if (travel.hours > 12) {
    score -= 6;
    minus.push([6, `long ${Math.round(travel.hours)}h haul`]);
  }

  if (outOfDates) {
    score -= 30;
    minus.push([45, `can't make ${dates}`]);
  }

  if (p.dealbreakers.includes("needs_veg") && d.hardForVeg) {
    score -= 8;
    minus.push([9, "veg options are thin here"]);
  }

  score = Math.max(5, Math.min(98, Math.round(score)));
  if (outOfDates) score = Math.min(score, 25); // can't come = can't be happy
  plus.sort((a, b) => b[0] - a[0]);
  minus.sort((a, b) => b[0] - a[0]);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  let reason: string;
  if (minus.length && (minus[0][0] >= 15 || !plus.length)) {
    reason = plus.length ? `${cap(minus[0][1])}, though ${plus[0][1]}` : cap(minus[0][1]);
  } else if (plus.length > 1) {
    reason = `${cap(plus[0][1])} and ${plus[1][1]}`;
  } else {
    reason = plus.length ? cap(plus[0][1]) : "Works fine, nothing special";
  }
  return { name, score, reason };
}

function evaluate(input: SuggestInput, d: Destination): Scored {
  const { constraints: c, participants } = input;
  const window = c.dates ?? { start: input.trip.window_start, days: c.tripLength.max, leftOut: [] as string[] };
  const month = monthOf(window.start);
  const stayStyle = majority(participants.map((p) => p.preferences.stayStyle)) as StayStyleId;
  const pace = majority(participants.map((p) => p.preferences.pace));
  const paceMult = pace === "chill" ? 0.85 : pace === "packed" ? 1.25 : 1;
  const travels = participants.map((p) => travelFor(p.preferences, d));
  const avgTravel = travels.reduce((s, t) => s + t.roundTrip, 0) / travels.length;

  const costFor = (days: number) => {
    const stay = Math.max(1, days - 1) * d.stayPerNight[stayStyle];
    const food = days * d.foodActivitiesPerDay * paceMult;
    return { travel: round100(avgTravel), stay: round100(stay), food_activities: round100(food) };
  };
  let days = Math.max(1, Math.min(c.tripLength.max, window.days));
  let cost = costFor(days);
  const total = (x: typeof cost) => x.travel + x.stay + x.food_activities;
  while (total(cost) > c.budget.max && days > Math.min(c.tripLength.min, window.days)) {
    days--;
    cost = costFor(days);
  }
  const start = window.start;
  const end = addDays(start, days - 1);
  const dateText = formatRange(start, end);

  // Hard constraints
  const blockers: string[] = [];
  const has = (id: string) => c.dealbreakers.find((x) => x.id === id);
  const who = (id: string) => has(id)!.by.join(", ");
  if (total(cost) > c.budget.max) blockers.push(`${inr(total(cost))} is over the ${inr(c.budget.max)} common budget`);
  if (d.trekCentric && has("no_treks")) blockers.push(`it's a trek trip and ${who("no_treks")} said no treks`);
  if (d.partyCentric && has("no_party")) blockers.push(`${who("no_party")} said no party trips`);
  if (d.hardForVeg && has("needs_veg")) blockers.push(`${who("needs_veg")} needs vegetarian food`);
  if (d.coldMonths?.includes(month) && has("no_extreme_cold")) blockers.push(`too cold then for ${who("no_extreme_cold")}`);
  if (d.hotMonths?.includes(month) && has("no_extreme_heat")) blockers.push(`too hot then for ${who("no_extreme_heat")}`);
  participants.forEach((p, i) => {
    if (!travels[i].feasible) blockers.push(`too far for ${p.name}'s ${p.preferences.maxTravelHours}h travel limit`);
  });

  const exTravel = cost.stay + cost.food_activities;
  const fits = participants.map((p, i) =>
    scorePerson(p.name, p.preferences, d, travels[i], exTravel, window.leftOut.includes(p.name), dateText),
  );
  const scores = fits.map((f) => f.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  let groupScore = mean - 0.35 * (mean - min);
  if (input.currentTop3?.some((o) => o.destination === d.name)) groupScore += 4; // stability bonus

  const weakest = fits.reduce((a, b) => (b.score < a.score ? b : a));
  const topTypeFans = participants.filter((p) => d.types.some((t) => p.preferences.destinationTypesRanked.slice(0, 2).includes(t)));
  const flyers = participants.filter((_, i) => travels[i].mode === "flight").map((p) => p.name);
  const whyParts = [
    `${d.hook.charAt(0).toUpperCase()}${d.hook.slice(1)}`,
    topTypeFans.length
      ? `${d.types.map(typeLabel).slice(0, 2).join(" + ")} is a top-2 pick for ${topTypeFans.length} of ${participants.length}`
      : null,
    `about ${inr(total(cost))} all-in per person`,
    flyers.length ? `${flyers.join(", ")} would fly, the rest by train/bus` : "everyone can get there by train or bus",
  ].filter(Boolean);

  return {
    dest: d,
    groupScore,
    blocked: blockers[0] ?? null,
    option: {
      destination: d.name,
      state: d.state,
      dates: { start, end },
      days,
      cost_breakdown: { ...cost, total: total(cost) },
      why: whyParts.join("; ") + ".",
      per_person: fits,
      weakest_for: { name: weakest.name, reason: weakest.reason },
    },
  };
}

function describeChange(input: SuggestInput, ranked: Scored[], top: Scored[]): string {
  const prev = input.currentTop3?.map((o) => o.destination) ?? [];
  const next = top.map((s) => s.dest.name);
  const trigger = input.changes[0] ?? "Preferences updated";
  if (!prev.length) return `First suggestions are in — ${next[0]} leads for now.`;

  const dropped = prev.filter((n) => !next.includes(n));
  const added = next.filter((n) => !prev.includes(n));
  if (dropped.length) {
    const d = ranked.find((x) => x.dest.name === dropped[0])!;
    let why = d.blocked;
    if (!why) {
      // Whose happiness with this place fell the most? New joiners count against the old average.
      const before = input.currentTop3!.find((o) => o.destination === dropped[0])!.per_person;
      const avgBefore = before.reduce((t, f) => t + f.score, 0) / Math.max(1, before.length);
      const hurt = d.option.per_person
        .map((f) => ({ ...f, drop: (before.find((b) => b.name === f.name)?.score ?? avgBefore) - f.score }))
        .sort((x, y) => y.drop - x.drop)[0];
      const third = (r: string) => (r.charAt(0).toLowerCase() + r.slice(1)).replace(/your/g, "their").replace(/you/g, "they");
      why = hurt && hurt.drop > 0 ? `weak fit for ${hurt.name}, ${third(hurt.reason)}` : "others now fit the group better";
    }
    return `${dropped[0]} dropped: ${why}. ${added[0]} is in.`;
  }
  if (prev[0] !== next[0]) return `${next[0]} moved up to #1 after ${trigger}.`;
  return `${trigger} — top 3 held steady.`;
}

export const mockSuggester: Suggester = async (input) => {
  await new Promise((r) => setTimeout(r, 1500)); // feel like a real model call
  const ranked = DESTINATIONS.map((d) => evaluate(input, d)).sort((a, b) => b.groupScore - a.groupScore);
  const allowed = ranked.filter((s) => !s.blocked);
  // Hard constraints first; only if fewer than 3 survive do we show the best of the rest (they'll be flagged).
  const top = [...allowed, ...ranked.filter((s) => s.blocked)].slice(0, 3);
  return {
    options: top.map((s) => s.option),
    what_changed: describeChange(input, ranked, top),
  };
};
