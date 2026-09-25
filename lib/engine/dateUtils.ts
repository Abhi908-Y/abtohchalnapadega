// Dates are plain "YYYY-MM-DD" strings everywhere; all math is done in UTC
// so time zones never shift a day.

const DAY_MS = 86_400_000;

export function toDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return fromDay(toDay(iso) + n);
}

/** Inclusive number of days between two dates (same day = 1). */
export function daysInclusive(start: string, end: string): number {
  return toDay(end) - toDay(start) + 1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-01" -> "1 Oct" */
export function formatDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "1 Oct – 4 Oct" */
export function formatRange(start: string, end: string): string {
  return `${formatDay(start)} – ${formatDay(end)}`;
}

export function monthOf(iso: string): number {
  return Number(iso.split("-")[1]);
}
