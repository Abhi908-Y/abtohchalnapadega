import { describe, expect, it } from "vitest";
import { computeBudget } from "@/lib/engine/budget";
import { computeDateOverlap, computeTripLength, type DatePerson } from "@/lib/engine/dates";
import { mergeDealbreakers } from "@/lib/engine/constraints";
import { daysInclusive, formatRange } from "@/lib/engine/dateUtils";
import type { Preferences } from "@/lib/schemas";

const WINDOW = { start: "2026-10-01", end: "2026-12-31" };
const person = (name: string, ranges: [string, string][], min = 3, max = 5): DatePerson => ({
  name,
  dateRanges: ranges.map(([start, end]) => ({ start, end })),
  tripDays: { min, max },
});

describe("date utils", () => {
  it("counts days inclusively and formats ranges", () => {
    expect(daysInclusive("2026-10-01", "2026-10-04")).toBe(4);
    expect(formatRange("2026-10-01", "2026-10-04")).toBe("1 Oct – 4 Oct");
  });
});

describe("computeTripLength", () => {
  it("uses highest min to lowest max when they overlap", () => {
    const r = computeTripLength([person("A", [], 3, 5), person("B", [], 4, 6)]);
    expect(r).toMatchObject({ min: 4, max: 5, full: true, leftOut: [] });
  });

  it("falls back to the length that suits most people", () => {
    const r = computeTripLength([person("A", [], 2, 3), person("B", [], 4, 6), person("C", [], 5, 7)]);
    expect(r.full).toBe(false);
    expect(r.included).toEqual(["B", "C"]);
    expect(r.leftOut).toEqual(["A"]);
    expect(r).toMatchObject({ min: 5, max: 6 });
  });
});

describe("computeDateOverlap", () => {
  it("finds the full overlap across everyone", () => {
    const r = computeDateOverlap(
      [person("A", [["2026-10-01", "2026-10-20"]]), person("B", [["2026-10-05", "2026-10-25"]])],
      WINDOW,
      3,
    );
    expect(r).toMatchObject({ start: "2026-10-05", end: "2026-10-20", days: 16, full: true, leftOut: [] });
  });

  it("handles multiple ranges per person", () => {
    const r = computeDateOverlap(
      [
        person("A", [["2026-10-01", "2026-10-03"], ["2026-11-10", "2026-11-20"]]),
        person("B", [["2026-11-15", "2026-11-30"]]),
      ],
      WINDOW,
      3,
    );
    expect(r).toMatchObject({ start: "2026-11-15", end: "2026-11-20", full: true });
  });

  it("clips ranges to the trip window", () => {
    const r = computeDateOverlap([person("A", [["2026-09-01", "2026-10-05"]])], WINDOW, 3);
    expect(r).toMatchObject({ start: "2026-10-01", end: "2026-10-05" });
  });

  it("names who's left out when the full group only overlaps for too short", () => {
    const r = computeDateOverlap(
      [
        person("Riya", [["2026-10-01", "2026-10-20"]]),
        person("Karan", [["2026-10-01", "2026-10-12"]]),
        person("Aisha", [["2026-10-06", "2026-10-09"]]),
        person("Preethi", [["2026-10-08", "2026-10-30"]]),
      ],
      WINDOW,
      4,
    );
    // All four only share 8–9 Oct (2 days < 4), so drop the one person blocking it.
    expect(r).toMatchObject({ start: "2026-10-08", end: "2026-10-12", full: false, leftOut: ["Aisha"], longEnough: true });
  });

  it("uses the window covering the most people when there's no overlap at all", () => {
    const r = computeDateOverlap(
      [
        person("A", [["2026-10-01", "2026-10-10"]]),
        person("B", [["2026-10-05", "2026-10-15"]]),
        person("C", [["2026-12-01", "2026-12-10"]]),
      ],
      WINDOW,
      3,
    );
    expect(r).toMatchObject({ start: "2026-10-05", end: "2026-10-10", leftOut: ["C"], full: false });
  });

  it("flags when no window is long enough for anyone", () => {
    const r = computeDateOverlap([person("A", [["2026-10-01", "2026-10-02"]])], WINDOW, 4);
    expect(r).toMatchObject({ days: 2, longEnough: false });
  });
});

describe("computeBudget", () => {
  const b = (name: string, min: number, max: number) => ({ name, budget: { min, max } });

  it("uses highest min to lowest max", () => {
    expect(computeBudget([b("A", 10000, 20000), b("B", 12000, 25000), b("C", 8000, 15000)])).toMatchObject({
      min: 12000,
      max: 15000,
      full: true,
    });
  });

  it("falls back to the range that fits the most people", () => {
    const r = computeBudget([
      b("Riya", 12000, 20000),
      b("Siddharth", 12000, 25000),
      b("Karan", 8000, 10000),
      b("Preethi", 10000, 16000),
    ]);
    expect(r).toMatchObject({ min: 12000, max: 16000, full: false, leftOut: ["Karan"] });
  });
});

describe("mergeDealbreakers", () => {
  it("combines everyone's dealbreakers and remembers who asked", () => {
    const p = (name: string, dealbreakers: string[]) => ({
      name,
      preferences: { dealbreakers } as unknown as Preferences,
    });
    const r = mergeDealbreakers([p("A", ["no_flights", "needs_veg"]), p("B", ["needs_veg"])]);
    expect(r.map((d) => [d.id, d.by])).toEqual([
      ["no_flights", ["A"]],
      ["needs_veg", ["A", "B"]],
    ]);
  });
});
