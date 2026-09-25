import { formatRange } from "@/lib/engine/dateUtils";
import type { Participant, Result } from "@/lib/types";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Builds the paste-into-WhatsApp message from the latest result. */
export function buildWhatsAppMessage(opts: {
  tripName: string;
  dashboardUrl: string;
  participants: Participant[];
  result: Result | null;
}): string {
  const { tripName, dashboardUrl, participants, result } = opts;
  const header = `🧳 *Ab Toh Chalna Padega — ${tripName}*`;
  const footer = `See the full breakdown or add your preferences: ${dashboardUrl}`;

  if (!result || result.options.length === 0) {
    const names = participants.map((p) => p.name);
    const who = names.length
      ? `${listNames(names)} ${names.length === 1 ? "has" : "have"} added preferences.`
      : "Nobody's added preferences yet.";
    return [header, `${who} Sab log aao, phir plan banega!`, "", `Add yours (takes 3 mins): ${dashboardUrl}`].join("\n");
  }

  const c = result.constraints;
  const n = c.people.length;
  const medals = ["🥇 Top pick", "🥈 Second", "🥉 Third"];
  const lines = [
    header,
    `Based on preferences from ${n} of us (${c.people.join(", ")}):`,
    "",
    ...result.options.slice(0, 3).map((o, i) => `${medals[i]}: ${o.destination}`),
    "",
    `💰 ${c.budget.full ? "Common budget" : "Budget that works for most"}: ${inr(c.budget.min)} – ${inr(c.budget.max)} per person`,
  ];

  if (c.dates) {
    lines.push(`📅 ${c.dates.full ? "Dates that work for everyone" : "Best dates"}: ${formatRange(c.dates.start, c.dates.end)}`);
  }

  const warnings: string[] = [];
  if (c.dates && !c.dates.full) {
    warnings.push(`⚠️ Dates work for ${c.dates.included.length} of ${n} (${listNames(c.dates.leftOut)} can't make it)`);
  }
  if (!c.budget.full) {
    const verb = c.budget.leftOut.length === 1 ? "is" : "are";
    warnings.push(`⚠️ Budget works for ${c.budget.included.length} of ${n} (${listNames(c.budget.leftOut)} ${verb} outside it)`);
  }
  if (!c.tripLength.full) {
    warnings.push(`⚠️ Trip length works for ${c.tripLength.included.length} of ${n} (${listNames(c.tripLength.leftOut)} wanted a different length)`);
  }
  lines.push(...warnings, "", footer);
  return lines.join("\n");
}

export const whatsAppLink = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;
