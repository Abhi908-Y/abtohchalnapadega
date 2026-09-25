import type { BudgetConstraint } from "@/lib/types";

export interface BudgetPerson {
  name: string;
  budget: { min: number; max: number };
}

/**
 * Common budget = highest minimum to lowest maximum.
 * If nobody's ranges overlap for everyone, use the range that fits the most
 * people and name who's outside it.
 */
export function computeBudget(people: BudgetPerson[]): BudgetConstraint {
  const names = people.map((p) => p.name);
  const lo = Math.max(...people.map((p) => p.budget.min));
  const hi = Math.min(...people.map((p) => p.budget.max));
  if (lo <= hi) return { min: lo, max: hi, included: names, leftOut: [], full: true };

  // The best-covered amount is always one of the range endpoints.
  const points = [...new Set(people.flatMap((p) => [p.budget.min, p.budget.max]))].sort((a, b) => a - b);
  let best: BudgetPerson[] = [];
  for (const x of points) {
    const fits = people.filter((p) => p.budget.min <= x && x <= p.budget.max);
    // Ties go to the higher amount: more room to plan a decent trip.
    if (fits.length >= best.length) {
      best = fits;
    }
  }
  return {
    min: Math.max(...best.map((p) => p.budget.min)),
    max: Math.min(...best.map((p) => p.budget.max)),
    included: best.map((p) => p.name),
    leftOut: people.filter((p) => !best.includes(p)).map((p) => p.name),
    full: false,
  };
}
