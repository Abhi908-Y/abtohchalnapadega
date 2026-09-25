import { aiOutputSchema, type TripOption } from "@/lib/schemas";
import { daysInclusive } from "@/lib/engine/dateUtils";
import type { Constraints } from "@/lib/types";

export interface Validated {
  options: TripOption[];
  what_changed: string;
}

export type ValidationResult =
  | { ok: true; value: Validated; problems: string[] }
  | { ok: false; problems: string[] };

/**
 * Step C. Parses the model's JSON with zod, then checks every option against
 * the Step A constraints. Options that break a constraint are kept but get
 * `flags` (and sink below clean options); `problems` lists them so the caller
 * can retry once with feedback.
 */
export function validateOutput(raw: unknown, constraints: Constraints, people: string[]): ValidationResult {
  const parsed = aiOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }

  const problems: string[] = [];
  const seen = new Set<string>();
  const options: TripOption[] = parsed.data.options.map((raw, idx) => {
    const o: TripOption = structuredClone(raw);
    const flags: string[] = [];
    const label = `options[${idx}] (${o.destination})`;

    // Small arithmetic slips are fixed, not rejected.
    if (o.dates.start <= o.dates.end) o.days = daysInclusive(o.dates.start, o.dates.end);
    const sum = o.cost_breakdown.travel + o.cost_breakdown.stay + o.cost_breakdown.food_activities;
    if (Math.abs(sum - o.cost_breakdown.total) > 1) o.cost_breakdown.total = sum;
    o.per_person = o.per_person.map((p) => ({ ...p, score: Math.round(p.score) }));

    const d = constraints.dates;
    if (o.dates.start > o.dates.end) flags.push("Dates are back to front");
    else if (d && (o.dates.start < d.start || o.dates.end > d.end)) flags.push("Outside the dates that work");
    if (d?.longEnough && (o.days < constraints.tripLength.min || o.days > constraints.tripLength.max)) {
      flags.push(`${o.days} days is outside the ${constraints.tripLength.min}–${constraints.tripLength.max} day range`);
    }
    if (o.cost_breakdown.total > constraints.budget.max) flags.push("Over the common budget");

    const key = o.destination.trim().toLowerCase();
    if (seen.has(key)) flags.push("Duplicate destination");
    seen.add(key);

    const missing = people.filter((n) => !o.per_person.some((p) => p.name === n));
    if (missing.length) problems.push(`${label}: per_person is missing ${missing.join(", ")}`);
    o.per_person = o.per_person.filter((p) => people.includes(p.name));

    flags.forEach((f) => problems.push(`${label}: ${f}`));
    if (flags.length) o.flags = flags;
    return o;
  });

  // Stable sort: clean options keep their rank, flagged ones sink.
  options.sort((a, b) => Number(Boolean(a.flags)) - Number(Boolean(b.flags)));
  return { ok: true, value: { options, what_changed: parsed.data.what_changed.trim() }, problems };
}
