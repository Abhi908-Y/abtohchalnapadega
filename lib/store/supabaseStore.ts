import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Participant, Result, Trip } from "@/lib/types";
import type { Store } from "./types";

// Server-side only: uses the service role key, which bypasses RLS.
let client: SupabaseClient | null = null;
const sb = () =>
  (client ??= createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

const TRIP_COLS = "id, slug, name, coordinator_name, window_start, window_end, created_at, gen_status, gen_pending, gen_started_at, gen_error";
const PARTICIPANT_COLS = "id, trip_id, name, preferences, created_at, updated_at";
const RESULT_COLS = "id, trip_id, participant_count, constraints, options, what_changed, created_at";

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Supabase ${what}: ${res.error.message}`);
  return res.data as T;
}

export const supabaseStore: Store = {
  async createTrip(t) {
    return must(await sb().from("trips").insert(t).select(TRIP_COLS).single(), "createTrip") as Trip;
  },

  async getTripBySlug(slug) {
    return must(await sb().from("trips").select(TRIP_COLS).eq("slug", slug).maybeSingle(), "getTrip") as Trip | null;
  },

  async getTripById(id) {
    return must(await sb().from("trips").select(TRIP_COLS).eq("id", id).maybeSingle(), "getTrip") as Trip | null;
  },

  async listParticipants(tripId) {
    return must(
      await sb().from("participants").select(PARTICIPANT_COLS).eq("trip_id", tripId).order("created_at"),
      "listParticipants",
    ) as Participant[];
  },

  async addParticipant(tripId, name, preferences, tokenHash) {
    const p = must(
      await sb().from("participants").insert({ trip_id: tripId, name, preferences }).select(PARTICIPANT_COLS).single(),
      "addParticipant",
    ) as Participant;
    const secret = await sb().from("participant_secrets").insert({ participant_id: p.id, edit_token_hash: tokenHash });
    if (secret.error) {
      await sb().from("participants").delete().eq("id", p.id);
      throw new Error(`Supabase addParticipant secret: ${secret.error.message}`);
    }
    return p;
  },

  async updateParticipant(tripId, participantId, tokenHash, name, preferences) {
    const secret = must(
      await sb().from("participant_secrets").select("edit_token_hash").eq("participant_id", participantId).maybeSingle(),
      "readSecret",
    ) as { edit_token_hash: string } | null;
    if (!secret || secret.edit_token_hash !== tokenHash) return null;
    return must(
      await sb()
        .from("participants")
        .update({ name, preferences, updated_at: new Date().toISOString() })
        .eq("id", participantId)
        .eq("trip_id", tripId)
        .select(PARTICIPANT_COLS)
        .maybeSingle(),
      "updateParticipant",
    ) as Participant | null;
  },

  async latestResult(tripId) {
    return must(
      await sb()
        .from("results")
        .select(RESULT_COLS)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "latestResult",
    ) as Result | null;
  },

  async insertResult(r) {
    return must(await sb().from("results").insert(r).select(RESULT_COLS).single(), "insertResult") as Result;
  },

  // The lock lives in Postgres functions (see supabase/schema.sql) so it holds
  // across serverless instances.
  async claimGeneration(tripId) {
    return must(await sb().rpc("claim_generation", { p_trip_id: tripId }), "claimGeneration") as boolean;
  },

  async finishGeneration(tripId, error) {
    return must(await sb().rpc("finish_generation", { p_trip_id: tripId, p_error: error }), "finishGeneration") as boolean;
  },
};
