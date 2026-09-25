import { createTripSchema } from "@/lib/schemas";
import { newSlug } from "@/lib/server";
import { store } from "@/lib/store";

export async function POST(req: Request) {
  const parsed = createTripSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid trip" }, { status: 400 });

  const { name, coordinatorName, windowStart, windowEnd } = parsed.data;
  const readable = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const slug = `${readable ? `${readable}-` : ""}${newSlug()}`;

  const trip = await store.createTrip({
    slug,
    name,
    coordinator_name: coordinatorName,
    window_start: windowStart,
    window_end: windowEnd,
  });
  return Response.json({ slug: trip.slug }, { status: 201 });
}
