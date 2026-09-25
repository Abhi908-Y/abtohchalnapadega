import { DEALBREAKERS } from "@/config/preferences";
import type { SuggestInput } from "./types";

export const SYSTEM_INSTRUCTION = `You plan group trips within India for friends living in different Indian cities.
You get: hard constraints already computed in code, every person's preferences, and the CURRENT top 3 options shown to the group.
Return exactly 3 ranked destination options as JSON matching the schema.

Rules:
1. Never break hard constraints:
   - Suggested dates must sit inside constraints.dates (start..end), and days must be within constraints.tripLength (min..max).
   - cost_breakdown.total (per person, all-in, INR) must be at or below constraints.budget.max.
   - Respect every merged dealbreaker. "travel" dealbreakers (no flights, no overnight buses) apply to how THAT person travels. "destination" dealbreakers apply to the whole group.
   - Respect each person's maxTravelHours (one-way, door to door); null means any.
2. All money is in INR, per person. cost_breakdown.travel is the average round-trip travel cost across the group, accounting for each person's home city and realistic mode (train, bus, flight). total = travel + stay + food_activities.
3. Account for travel time and cost from EACH person's home city in their personal score.
4. per_person must contain every participant by exact name: score 0-100 (how happy they'd be), and a one-line, specific reason. Be honest: if someone is a poor fit or compromising, give a low score and say why. Don't inflate.
5. weakest_for names the person with the lowest score and why.
6. Stability matters. Keep the current top 3 (same destinations, same order) unless the new preferences make a replacement CLEARLY better or a current option now breaks a hard constraint. Don't reshuffle for small differences.
7. what_changed: ONE short line explaining the change versus the current top 3, naming the person who caused it, e.g. "Goa dropped: Karan's budget cap is ₹10k" or "Karan joined — top 3 held steady". If there's no current top 3, say what leads.
8. People listed in constraints.*.leftOut are outside the common window/budget; still score them honestly.
9. Keep "why" to one or two sentences, friendly and concrete.`;

export function buildPrompt(input: SuggestInput, feedback?: string[]): string {
  const payload = {
    trip: input.trip,
    constraints: input.constraints,
    dealbreaker_labels: Object.fromEntries(DEALBREAKERS.map((d) => [d.id, `${d.label} (${d.scope})`])),
    participants: input.participants,
    current_top3: input.currentTop3?.map((o, i) => ({
      rank: i + 1,
      destination: o.destination,
      state: o.state,
      dates: o.dates,
      days: o.days,
      total_cost: o.cost_breakdown.total,
    })) ?? null,
    changes_since_last_result: input.changes,
  };
  let text = `Plan the top 3 for this group.\n\n${JSON.stringify(payload, null, 2)}`;
  if (feedback?.length) {
    text += `\n\nYour previous answer was rejected by validation. Fix these problems:\n- ${feedback.join("\n- ")}`;
  }
  return text;
}

// JSON Schema handed to Gemini's structured output.
export const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    options: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          destination: { type: "string" },
          state: { type: "string", description: "Indian state or UT" },
          dates: {
            type: "object",
            properties: {
              start: { type: "string", description: "YYYY-MM-DD" },
              end: { type: "string", description: "YYYY-MM-DD" },
            },
            required: ["start", "end"],
          },
          days: { type: "integer" },
          cost_breakdown: {
            type: "object",
            description: "Per person, INR",
            properties: {
              travel: { type: "number" },
              stay: { type: "number" },
              food_activities: { type: "number" },
              total: { type: "number" },
            },
            required: ["travel", "stay", "food_activities", "total"],
          },
          why: { type: "string" },
          per_person: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                score: { type: "integer", minimum: 0, maximum: 100 },
                reason: { type: "string" },
              },
              required: ["name", "score", "reason"],
            },
          },
          weakest_for: {
            type: "object",
            properties: { name: { type: "string" }, reason: { type: "string" } },
            required: ["name", "reason"],
          },
        },
        required: ["destination", "state", "dates", "days", "cost_breakdown", "why", "per_person", "weakest_for"],
      },
    },
    what_changed: { type: "string" },
  },
  required: ["options", "what_changed"],
} as const;
