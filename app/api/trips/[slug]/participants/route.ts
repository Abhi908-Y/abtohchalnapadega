import { after } from "next/server";
import { z } from "zod";
import { participantInputSchema } from "@/lib/schemas";
import { generator, hashToken, newEditToken } from "@/lib/server";
import { store } from "@/lib/store";

// Generation runs after the response is sent; give it room on Vercel.
export const maxDuration = 60;

const editSchema = participantInputSchema.extend({ participantId: z.string().min(1), editToken: z.string().min(10) });

async function loadTrip(ctx: RouteContext<"/api/trips/[slug]/participants">) {
  const { slug } = await ctx.params;
  return store.getTripBySlug(slug);
}

function withinWindow(ranges: { start: string; end: string }[], start: string, end: string) {
  return ranges.every((r) => r.start >= start && r.end <= end);
}

const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Join a trip. Returns the edit token once; the browser keeps it in localStorage. */
export async function POST(req: Request, ctx: RouteContext<"/api/trips/[slug]/participants">) {
  const trip = await loadTrip(ctx);
  if (!trip) return bad("Trip not found", 404);
  const parsed = participantInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid preferences");
  const { name, preferences } = parsed.data;
  if (!withinWindow(preferences.dateRanges, trip.window_start, trip.window_end)) {
    return bad("Dates must be inside the trip window");
  }

  const existing = await store.listParticipants(trip.id);
  if (existing.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return bad(`"${name}" has already joined. Use a nickname or your full name.`, 409);
  }

  const editToken = newEditToken();
  const participant = await store.addParticipant(trip.id, name, preferences, hashToken(editToken));
  after(() => generator.requestGeneration(trip.id));
  return Response.json({ participant, editToken }, { status: 201 });
}

/** Edit your own answers, proven by the edit token. */
export async function PUT(req: Request, ctx: RouteContext<"/api/trips/[slug]/participants">) {
  const trip = await loadTrip(ctx);
  if (!trip) return bad("Trip not found", 404);
  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid preferences");
  const { participantId, editToken, name, preferences } = parsed.data;
  if (!withinWindow(preferences.dateRanges, trip.window_start, trip.window_end)) {
    return bad("Dates must be inside the trip window");
  }

  const others = (await store.listParticipants(trip.id)).filter((p) => p.id !== participantId);
  if (others.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return bad(`Someone else is already called "${name}".`, 409);
  }

  const participant = await store.updateParticipant(trip.id, participantId, hashToken(editToken), name, preferences);
  if (!participant) return bad("This browser can't edit that submission", 403);
  after(() => generator.requestGeneration(trip.id));
  return Response.json({ participant });
}
