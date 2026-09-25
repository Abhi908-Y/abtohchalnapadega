import type { Preferences, TripOption } from "@/lib/schemas";
import type { Constraints } from "@/lib/types";

export interface SuggestInput {
  trip: { name: string; window_start: string; window_end: string };
  constraints: Constraints;
  participants: { name: string; preferences: Preferences }[];
  /** The top 3 currently on the dashboard, if any. Keep them unless clearly beaten. */
  currentTop3: TripOption[] | null;
  /** Human-readable list of what happened since the last result, e.g. "Karan joined". */
  changes: string[];
}

/**
 * A suggester returns raw JSON (not yet trusted). `feedback` carries
 * validation errors from a previous attempt so it can fix them.
 */
export type Suggester = (input: SuggestInput, feedback?: string[]) => Promise<unknown>;
