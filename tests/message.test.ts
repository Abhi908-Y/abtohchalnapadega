import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, whatsAppLink } from "@/lib/share/whatsappMessage";
import type { Constraints, Result } from "@/lib/types";
import type { TripOption } from "@/lib/schemas";

const option = (destination: string): TripOption => ({
  destination,
  state: "X",
  dates: { start: "2026-10-01", end: "2026-10-04" },
  days: 4,
  cost_breakdown: { travel: 4000, stay: 5000, food_activities: 3000, total: 12000 },
  why: "",
  per_person: [],
  weakest_for: { name: "", reason: "" },
});

const people = ["Riya", "Siddharth", "Karan", "Aisha", "Preethi"];
const constraints = (over: Partial<Constraints> = {}): Constraints => ({
  people,
  dates: { start: "2026-10-01", end: "2026-10-04", days: 4, included: people, leftOut: [], full: true, longEnough: true },
  tripLength: { min: 3, max: 4, included: people, leftOut: [], full: true },
  budget: { min: 10000, max: 15000, included: people, leftOut: [], full: true },
  dealbreakers: [],
  ...over,
});
const result = (c: Constraints): Result => ({
  id: "r",
  trip_id: "t",
  participant_count: 5,
  constraints: c,
  options: [option("Manali"), option("Mysore"), option("Goa")],
  what_changed: "",
  created_at: "",
});

describe("buildWhatsAppMessage", () => {
  it("matches the agreed format when everything overlaps", () => {
    const msg = buildWhatsAppMessage({
      tripName: "Diwali Escape",
      dashboardUrl: "https://x.app/t/abc",
      participants: [],
      result: result(constraints()),
    });
    expect(msg).toBe(
      [
        "🧳 *Ab Toh Chalna Padega — Diwali Escape*",
        "Based on preferences from 5 of us (Riya, Siddharth, Karan, Aisha, Preethi):",
        "",
        "🥇 Top pick: Manali",
        "🥈 Second: Mysore",
        "🥉 Third: Goa",
        "",
        "💰 Common budget: ₹10,000 – ₹15,000 per person",
        "📅 Dates that work for everyone: 1 Oct – 4 Oct",
        "",
        "See the full breakdown or add your preferences: https://x.app/t/abc",
      ].join("\n"),
    );
  });

  it("warns who's left out of dates and budget", () => {
    const c = constraints({
      dates: { start: "2026-10-08", end: "2026-10-12", days: 5, included: ["Riya", "Siddharth", "Aisha", "Preethi"], leftOut: ["Karan"], full: false, longEnough: true },
      budget: { min: 12000, max: 16000, included: ["Riya", "Siddharth", "Aisha", "Preethi"], leftOut: ["Karan"], full: false },
    });
    const msg = buildWhatsAppMessage({ tripName: "T", dashboardUrl: "u", participants: [], result: result(c) });
    expect(msg).toContain("📅 Best dates: 8 Oct – 12 Oct");
    expect(msg).toContain("⚠️ Dates work for 4 of 5 (Karan can't make it)");
    expect(msg).toContain("💰 Budget that works for most: ₹12,000 – ₹16,000 per person");
    expect(msg).toContain("⚠️ Budget works for 4 of 5 (Karan is outside it)");
  });

  it("invites people when there are no suggestions yet", () => {
    const msg = buildWhatsAppMessage({
      tripName: "T",
      dashboardUrl: "u",
      participants: [{ name: "Riya" } as never],
      result: null,
    });
    expect(msg).toContain("Riya has added preferences.");
    expect(msg).toContain("Add yours");
  });

  it("encodes the wa.me link", () => {
    expect(whatsAppLink("a b&c")).toBe("https://wa.me/?text=a%20b%26c");
  });
});
