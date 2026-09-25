import type { Preferences, TripOption } from "@/lib/schemas";
import type { Constraints, Participant, Result, Trip } from "@/lib/types";

export interface NewTrip {
  slug: string;
  name: string;
  coordinator_name: string;
  window_start: string;
  window_end: string;
}

export interface NewResult {
  trip_id: string;
  participant_count: number;
  constraints: Constraints;
  options: TripOption[];
  what_changed: string;
}

/** Same interface for the local JSON store (mock mode) and Supabase. */
export interface Store {
  createTrip(t: NewTrip): Promise<Trip>;
  getTripBySlug(slug: string): Promise<Trip | null>;
  getTripById(id: string): Promise<Trip | null>;

  listParticipants(tripId: string): Promise<Participant[]>;
  addParticipant(tripId: string, name: string, prefs: Preferences, tokenHash: string): Promise<Participant>;
  /** Returns null when the token doesn't match. */
  updateParticipant(
    tripId: string,
    participantId: string,
    tokenHash: string,
    name: string,
    prefs: Preferences,
  ): Promise<Participant | null>;

  latestResult(tripId: string): Promise<Result | null>;
  insertResult(r: NewResult): Promise<Result>;

  /**
   * Atomically try to start a generation run. Returns true if this caller
   * owns the run; false if one is already running (in which case a rerun is
   * queued).
   */
  claimGeneration(tripId: string): Promise<boolean>;
  /**
   * Atomically finish a run. Returns true if a rerun was queued meanwhile —
   * the caller still owns the lock and should run again.
   */
  finishGeneration(tripId: string, error: string | null): Promise<boolean>;
}

/** A run older than this is treated as crashed and can be taken over. */
export const STALE_RUN_MS = 3 * 60 * 1000;
