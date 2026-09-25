import { describe, expect, it } from "vitest";
import { validateOutput } from "@/lib/ai/validate";
import { mockSuggester } from "@/lib/ai/mockSuggester";
import type { Suggester } from "@/lib/ai/types";
import { computeConstraints } from "@/lib/engine/constraints";
import { createGenerator } from "@/lib/pipeline";
import type { NewResult, Store } from "@/lib/store/types";
import type { Participant, Result, Trip } from "@/lib/types";
import { prefs } from "./helpers";

const WINDOW = { start: "2026-10-01", end: "2026-12-31" };

function memoryStore(participants: Participant[]) {
  const trip: Trip = {
    id: "t1", slug: "s", name: "Trip", coordinator_name: "Riya", window_start: WINDOW.start, window_end: WINDOW.end,
    created_at: "", gen_status: "idle", gen_pending: false, gen_started_at: null, gen_error: null,
  };
  const results: Result[] = [];
  const store: Store = {
    createTrip: async () => trip,
    getTripBySlug: async () => trip,
    getTripById: async () => trip,
    listParticipants: async () => participants,
    addParticipant: async () => { throw new Error("n/a"); },
    updateParticipant: async () => null,
    latestResult: async () => results.at(-1) ?? null,
    insertResult: async (r: NewResult) => {
      const row = { ...r, id: String(results.length), created_at: new Date().toISOString() };
      results.push(row);
      return row;
    },
    claimGeneration: async () => {
      if (trip.gen_status === "running") { trip.gen_pending = true; return false; }
      trip.gen_status = "running";
      return true;
    },
    finishGeneration: async (_id, error) => {
      trip.gen_error = error;
      const rerun = trip.gen_pending;
      trip.gen_pending = false;
      if (!rerun) trip.gen_status = "idle";
      return rerun;
    },
  };
  return { store, trip, results };
}

const participant = (name: string, p = prefs()): Participant => ({
  id: name, trip_id: "t1", name, preferences: p, created_at: "2026-09-25T00:00:00Z", updated_at: "2026-09-25T00:00:00Z",
});

const goodOption = (destination: string) => ({
  destination, state: "S", dates: { start: "2026-10-02", end: "2026-10-05" }, days: 4,
  cost_breakdown: { travel: 4000, stay: 4000, food_activities: 3000, total: 11000 },
  why: "Nice", per_person: [{ name: "A", score: 80, reason: "r" }, { name: "B", score: 60, reason: "r" }],
  weakest_for: { name: "B", reason: "r" },
});

describe("validateOutput", () => {
  const people = [participant("A"), participant("B")];
  const c = computeConstraints(people, WINDOW);

  it("accepts a clean answer and fixes small arithmetic slips", () => {
    const o = goodOption("Goa");
    o.cost_breakdown.total = 999;
    o.days = 9;
    const r = validateOutput({ options: [o, goodOption("Gokarna"), goodOption("Coorg")], what_changed: "x" }, c, ["A", "B"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.problems).toEqual([]);
    expect(r.value.options[0].cost_breakdown.total).toBe(11000);
    expect(r.value.options[0].days).toBe(4);
  });

  it("rejects malformed JSON shapes", () => {
    const r = validateOutput({ options: [goodOption("Goa")], what_changed: "x" }, c, ["A", "B"]);
    expect(r.ok).toBe(false);
  });

  it("flags options outside the dates or budget and sinks them", () => {
    const pricey = goodOption("Maldives-ish");
    pricey.cost_breakdown = { travel: 20000, stay: 5000, food_activities: 5000, total: 30000 };
    const late = goodOption("Late");
    late.dates = { start: "2026-10-19", end: "2026-10-23" };
    const r = validateOutput({ options: [pricey, late, goodOption("Coorg")], what_changed: "x" }, c, ["A", "B"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.options.map((o) => o.destination)).toEqual(["Coorg", "Maldives-ish", "Late"]);
    expect(r.value.options[1].flags).toContain("Over the common budget");
    expect(r.value.options[2].flags).toContain("Outside the dates that work");
    expect(r.problems.length).toBe(2);
  });
});

describe("generator", () => {
  it("does nothing with only one person", async () => {
    const { store, results } = memoryStore([participant("A")]);
    await createGenerator({ store, suggester: mockSuggester }).requestGeneration("t1");
    expect(results).toHaveLength(0);
  });

  it("retries once with feedback when the first answer is invalid", async () => {
    const { store, results } = memoryStore([participant("A"), participant("B")]);
    const calls: (string[] | undefined)[] = [];
    const suggester: Suggester = async (_input, feedback) => {
      calls.push(feedback);
      return calls.length === 1 ? { nope: true } : { options: [goodOption("Goa"), goodOption("Gokarna"), goodOption("Coorg")], what_changed: "ok" };
    };
    await createGenerator({ store, suggester, log: () => {} }).requestGeneration("t1");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.length).toBeGreaterThan(0);
    expect(results).toHaveLength(1);
  });

  it("keeps the last result and records an error if both attempts fail", async () => {
    const { store, results, trip } = memoryStore([participant("A"), participant("B")]);
    await createGenerator({ store, suggester: async () => ({}), log: () => {} }).requestGeneration("t1");
    expect(results).toHaveLength(0);
    expect(trip.gen_error).toBeTruthy();
    expect(trip.gen_status).toBe("idle");
  });

  it("runs one at a time and reruns once for submissions that arrive mid-run", async () => {
    const { store, results } = memoryStore([participant("A"), participant("B")]);
    let running = 0;
    let maxConcurrent = 0;
    const suggester: Suggester = async () => {
      running++;
      maxConcurrent = Math.max(maxConcurrent, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return { options: [goodOption("Goa"), goodOption("Gokarna"), goodOption("Coorg")], what_changed: "ok" };
    };
    const g = createGenerator({ store, suggester });
    // Three submissions land while the first run is going.
    await Promise.all([g.requestGeneration("t1"), g.requestGeneration("t1"), g.requestGeneration("t1")]);
    expect(maxConcurrent).toBe(1);
    expect(results).toHaveLength(2); // the original run + one collapsed rerun
  });
});

describe("mockSuggester", () => {
  it("produces valid, constraint-respecting output for a conflicting group", async () => {
    const people = [
      participant("Riya", prefs({ homeCity: "Mumbai" })),
      participant("Karan", prefs({ homeCity: "Bengaluru", budget: { min: 8000, max: 12000 }, dealbreakers: ["no_flights"] })),
      participant("Preethi", prefs({ homeCity: "Chennai", dealbreakers: ["no_party"], destinationTypesRanked: ["nature"] })),
    ];
    const constraints = computeConstraints(people, WINDOW);
    const raw = await mockSuggester({
      trip: { name: "T", window_start: WINDOW.start, window_end: WINDOW.end },
      constraints,
      participants: people,
      currentTop3: null,
      changes: ["Preethi joined"],
    });
    const r = validateOutput(raw, constraints, people.map((p) => p.name));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.problems).toEqual([]);
    expect(r.value.options.map((o) => o.destination)).not.toContain("Goa"); // Preethi: no party trips
    expect(r.value.options[0].per_person).toHaveLength(3);
  });
});
