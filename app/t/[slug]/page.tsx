import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripDashboard } from "@/components/dashboard/TripDashboard";
import { getTripView } from "@/lib/server";

export async function generateMetadata({ params }: PageProps<"/t/[slug]">): Promise<Metadata> {
  const view = await getTripView((await params).slug);
  return {
    title: view ? `${view.trip.name} · Ab Toh Chalna Padega` : "Trip not found",
    description: "Add your preferences. 3 minutes. Then the trip finally happens.",
  };
}

export default async function TripPage({ params }: PageProps<"/t/[slug]">) {
  const { slug } = await params;
  const view = await getTripView(slug);
  if (!view) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <Suspense>
      <TripDashboard initial={view} origin={`${proto}://${host}`} />
    </Suspense>
  );
}
