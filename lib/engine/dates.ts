import type { DateRange } from "@/lib/schemas";
import type { DateConstraint, LengthConstraint } from "@/lib/types";
import { fromDay, toDay } from "./dateUtils";

export interface DatePerson {
  name: string;
  dateRanges: DateRange[];
  tripDays: { min: number; max: number };
}

/**
 * Trip length the group can agree on: highest minimum to lowest maximum.
 * If that's empty, pick the length that suits the most people.
 */
export function computeTripLength(people: DatePerson[]): LengthConstraint {
  const names = people.map((p) => p.name);
  const lo = Math.max(...people.map((p) => p.tripDays.min));
  const hi = Math.min(...people.map((p) => p.tripDays.max));
  if (lo <= hi) return { min: lo, max: hi, included: names, leftOut: [], full: true };

  const absMin = Math.min(...people.map((p) => p.tripDays.min));
  const absMax = Math.max(...people.map((p) => p.tripDays.max));
  let best: { len: number; fits: DatePerson[] } | null = null;
  for (let len = absMin; len <= absMax; len++) {
    const fits = people.filter((p) => p.tripDays.min <= len && len <= p.tripDays.max);
    if (!best || fits.length > best.fits.length) best = { len, fits };
  }
  const fits = best!.fits;
  const min = Math.max(...fits.map((p) => p.tripDays.min));
  const max = Math.min(...fits.map((p) => p.tripDays.max));
  return {
    min,
    max,
    included: fits.map((p) => p.name),
    leftOut: people.filter((p) => !fits.includes(p)).map((p) => p.name),
    full: false,
  };
}

/**
 * Find the best block of consecutive days inside the trip window.
 *
 * Preference order:
 *  1. The most people available on every day of the block
 *  2. Block at least `minDays` long (the group's minimum trip length)
 *  3. Longest block, then earliest
 *
 * The returned block is the whole shared window, which may be longer than the
 * trip itself; the suggester picks the actual dates inside it.
 */
export function computeDateOverlap(
  people: DatePerson[],
  window: { start: string; end: string },
  minDays: number,
): DateConstraint | null {
  const w0 = toDay(window.start);
  const w1 = toDay(window.end);
  const n = people.length;
  if (n === 0 || w1 < w0) return null;
  const span = w1 - w0 + 1;

  // avail[i][d] = person i is free on window day d
  const avail = people.map((p) => {
    const row = new Array<boolean>(span).fill(false);
    for (const r of p.dateRanges) {
      const a = Math.max(toDay(r.start), w0);
      const b = Math.min(toDay(r.end), w1);
      for (let d = a; d <= b; d++) row[d - w0] = true;
    }
    return row;
  });

  type Cand = { s: number; e: number; members: number[] };
  let best: Cand | null = null;
  const better = (c: Cand, b: Cand | null) => {
    if (!b) return true;
    const cLong = c.e - c.s + 1 >= minDays;
    const bLong = b.e - b.s + 1 >= minDays;
    // A block long enough for the trip beats a bigger group that can't fit the trip.
    if (cLong !== bLong) return cLong;
    if (c.members.length !== b.members.length) return c.members.length > b.members.length;
    const cl = c.e - c.s;
    const bl = b.e - b.s;
    if (cl !== bl) return cl > bl;
    return c.s < b.s;
  };

  for (let s = 0; s < span; s++) {
    let members = people.map((_, i) => i).filter((i) => avail[i][s]);
    if (members.length === 0) continue;
    for (let e = s; e < span; e++) {
      members = members.filter((i) => avail[i][e]);
      if (members.length === 0) break;
      const c = { s, e, members };
      if (better(c, best)) best = c;
    }
  }
  if (!best) return null;

  const included = best.members.map((i) => people[i].name);
  const days = best.e - best.s + 1;
  return {
    start: fromDay(w0 + best.s),
    end: fromDay(w0 + best.e),
    days,
    included,
    leftOut: people.filter((_, i) => !best!.members.includes(i)).map((p) => p.name),
    full: best.members.length === n,
    longEnough: days >= minDays,
  };
}
