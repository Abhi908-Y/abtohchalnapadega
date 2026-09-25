import { getTripView } from "@/lib/server";

export async function GET(_req: Request, ctx: RouteContext<"/api/trips/[slug]">) {
  const { slug } = await ctx.params;
  const view = await getTripView(slug);
  if (!view) return Response.json({ error: "Trip not found" }, { status: 404 });
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
