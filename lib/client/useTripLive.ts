"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TripView } from "@/lib/types";

// Only the public URL + anon/publishable key ever reach the browser; the
// server hands them over in the trip view.
let browserClient: SupabaseClient | null = null;
function getBrowserSupabase(cfg: TripView["realtime"]): SupabaseClient | null {
  if (!cfg?.url || !cfg.anonKey) return null;
  return (browserClient ??= createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } }));
}

/**
 * Keeps the dashboard in sync for everyone:
 *  - real mode: Supabase Realtime on participants/results/trips for this trip
 *  - mock mode: polls every 5s (every 2s while suggestions are updating)
 */
export function useTripLive(slug: string, initial: TripView) {
  const [view, setView] = useState(initial);
  const inFlight = useRef(false);
  const tripId = initial.trip.id;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/trips/${slug}`, { cache: "no-store" });
      if (res.ok) setView((await res.json()) as TripView);
    } catch {
      /* offline for a moment; next tick will catch up */
    } finally {
      inFlight.current = false;
    }
  }, [slug]);

  const updating = view.trip.gen_status === "running";

  // Polling (mock mode, or a slow safety net in real mode)
  useEffect(() => {
    const ms = view.live === "polling" ? (updating ? 2000 : 5000) : 30000;
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [view.live, updating, refresh]);

  // Realtime
  useEffect(() => {
    if (view.live !== "realtime") return;
    const sb = getBrowserSupabase(initial.realtime);
    if (!sb) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 250); // coalesce bursts of events
    };
    const channel = sb
      .channel(`trip-${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `trip_id=eq.${tripId}` }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "results", filter: `trip_id=eq.${tripId}` }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, soon)
      // Catch anything that changed between the server render and the socket connecting.
      .subscribe((status) => status === "SUBSCRIBED" && soon());
    return () => {
      clearTimeout(timer);
      sb.removeChannel(channel);
    };
  }, [view.live, tripId, refresh, initial.realtime]);

  // Phones background the tab when you switch to WhatsApp; catch up on return.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return { view, refresh };
}
