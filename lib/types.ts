import type { Preferences, TripOption } from "@/lib/schemas";

export type GenStatus = "idle" | "running";

export interface Trip {
  id: string;
  slug: string;
  name: string;
  coordinator_name: string;
  window_start: string;
  window_end: string;
  created_at: string;
  gen_status: GenStatus;
  gen_pending: boolean;
  gen_started_at: string | null;
  gen_error: string | null;
}

// Participant as the browser sees it — never includes the edit token hash.
export interface Participant {
  id: string;
  trip_id: string;
  name: string;
  preferences: Preferences;
  created_at: string;
  updated_at: string;
}

export interface PersonCoverage {
  /** Names that fit this constraint. */
  included: string[];
  /** Names that don't fit (empty when everyone fits). */
  leftOut: string[];
  /** True when everyone fits. */
  full: boolean;
}

export interface DateConstraint extends PersonCoverage {
  start: string;
  end: string;
  days: number;
  /** False if even the best window is shorter than the group's minimum trip length. */
  longEnough: boolean;
}

export interface LengthConstraint extends PersonCoverage {
  min: number;
  max: number;
}

export interface BudgetConstraint extends PersonCoverage {
  min: number;
  max: number;
}

export interface MergedDealbreaker {
  id: string;
  label: string;
  scope: "travel" | "destination";
  by: string[];
}

export interface Constraints {
  people: string[];
  dates: DateConstraint | null;
  tripLength: LengthConstraint;
  budget: BudgetConstraint;
  dealbreakers: MergedDealbreaker[];
}

export interface Result {
  id: string;
  trip_id: string;
  participant_count: number;
  constraints: Constraints;
  options: TripOption[];
  what_changed: string;
  created_at: string;
}

export interface TripView {
  trip: Trip;
  participants: Participant[];
  result: Result | null;
  live: "realtime" | "polling";
}
