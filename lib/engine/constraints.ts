import { DEALBREAKERS } from "@/config/preferences";
import type { Preferences } from "@/lib/schemas";
import type { Constraints, MergedDealbreaker } from "@/lib/types";
import { computeBudget } from "./budget";
import { computeDateOverlap, computeTripLength } from "./dates";

export interface ConstraintPerson {
  name: string;
  preferences: Preferences;
}

export function mergeDealbreakers(people: ConstraintPerson[]): MergedDealbreaker[] {
  return DEALBREAKERS.flatMap((d) => {
    const by = people.filter((p) => p.preferences.dealbreakers.includes(d.id)).map((p) => p.name);
    return by.length ? [{ id: d.id, label: d.label, scope: d.scope, by }] : [];
  });
}

/** Step A: everything we can work out without AI. */
export function computeConstraints(
  people: ConstraintPerson[],
  window: { start: string; end: string },
): Constraints {
  const flat = people.map((p) => ({ name: p.name, ...p.preferences }));
  const tripLength = computeTripLength(flat);
  return {
    people: people.map((p) => p.name),
    tripLength,
    dates: computeDateOverlap(flat, window, tripLength.min),
    budget: computeBudget(flat),
    dealbreakers: mergeDealbreakers(people),
  };
}
