import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { useRealGemini, useRealSupabase } from "@/lib/env";
import { geminiSuggester } from "@/lib/ai/gemini";
import { mockSuggester } from "@/lib/ai/mockSuggester";
import { createGenerator } from "@/lib/pipeline";
import { store } from "@/lib/store";
import type { TripView } from "@/lib/types";

export const generator = createGenerator({ store, suggester: useRealGemini ? geminiSuggester : mockSuggester });

export async function getTripView(slug: string): Promise<TripView | null> {
  const trip = await store.getTripBySlug(slug);
  if (!trip) return null;
  const [participants, result] = await Promise.all([store.listParticipants(trip.id), store.latestResult(trip.id)]);
  return { trip, participants, result, live: useRealSupabase ? "realtime" : "polling" };
}

export const newSlug = () => randomBytes(12).toString("base64url"); // 96 bits: unguessable
export const newEditToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
