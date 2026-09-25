import { computeConstraints } from "@/lib/engine/constraints";
import { validateOutput, type ValidationResult } from "@/lib/ai/validate";
import type { SuggestInput, Suggester } from "@/lib/ai/types";
import type { Store } from "@/lib/store/types";
import type { Participant, Result } from "@/lib/types";

// Generation pipeline: Step A (constraints) → Step B (suggester) → Step C
// (validation, one retry) → save. Dependencies are injected so it can be
// unit-tested without a database or API key.

export function describeChanges(participants: Participant[], prev: Result | null): string[] {
  const recentFirst = [...participants].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  if (!prev) return recentFirst.map((p) => `${p.name} joined`);
  const before = new Set(prev.constraints.people);
  const since = Date.parse(prev.created_at);
  return recentFirst.flatMap((p) => {
    if (!before.has(p.name)) return [`${p.name} joined`];
    if (Date.parse(p.updated_at) > since) return [`${p.name} edited their answers`];
    return [];
  });
}

export function createGenerator(deps: { store: Store; suggester: Suggester; log?: (msg: string) => void }) {
  const { store, suggester } = deps;
  const log = deps.log ?? ((m) => console.error(m));

  async function attempt(input: SuggestInput, feedback?: string[]): Promise<ValidationResult> {
    try {
      const raw = await suggester(input, feedback);
      return validateOutput(raw, input.constraints, input.participants.map((p) => p.name));
    } catch (e) {
      return { ok: false, problems: [`Model call failed: ${e instanceof Error ? e.message : String(e)}`] };
    }
  }

  async function runOnce(tripId: string): Promise<Result | null> {
    const trip = await store.getTripById(tripId);
    if (!trip) return null;
    const participants = await store.listParticipants(tripId);
    if (participants.length < 2) return null; // dashboard shows "waiting for a second person"

    const prev = await store.latestResult(tripId);
    const constraints = computeConstraints(participants, { start: trip.window_start, end: trip.window_end });
    const input: SuggestInput = {
      trip: { name: trip.name, window_start: trip.window_start, window_end: trip.window_end },
      constraints,
      participants: participants.map((p) => ({ name: p.name, preferences: p.preferences })),
      currentTop3: prev?.options ?? null,
      changes: describeChanges(participants, prev),
    };

    let result = await attempt(input);
    if (!result.ok || result.problems.length) {
      log(`[generate] retrying after: ${result.problems.join(" | ")}`);
      const second = await attempt(input, result.problems);
      // Prefer the retry unless it's worse.
      if (second.ok && (!result.ok || second.problems.length <= result.problems.length)) result = second;
    }
    if (!result.ok) throw new Error(`Suggestions were invalid twice: ${result.problems.join(" | ")}`);

    return store.insertResult({
      trip_id: tripId,
      participant_count: participants.length,
      constraints,
      options: result.value.options,
      what_changed: result.value.what_changed,
    });
  }

  /**
   * One run per trip at a time. If someone submits mid-run, claim() queues a
   * single rerun; finish() hands it back to whoever holds the lock.
   */
  async function requestGeneration(tripId: string): Promise<void> {
    if (!(await store.claimGeneration(tripId))) return;
    let again = true;
    while (again) {
      let error: string | null = null;
      try {
        await runOnce(tripId);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        log(`[generate] ${error}`);
      }
      again = await store.finishGeneration(tripId, error ? "Couldn't refresh suggestions. Will try again on the next change." : null);
    }
  }

  return { runOnce, requestGeneration };
}
