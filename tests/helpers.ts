import type { Preferences } from "@/lib/schemas";

export function prefs(over: Partial<Preferences> = {}): Preferences {
  return {
    homeCity: "Mumbai",
    homeCityOther: "",
    dateRanges: [{ start: "2026-10-01", end: "2026-10-20" }],
    tripDays: { min: 3, max: 5 },
    budget: { min: 10000, max: 20000 },
    maxTravelHours: 12,
    dealbreakers: [],
    destinationTypesRanked: ["beach", "mountains"],
    vibe: "mix",
    pace: "balanced",
    stayStyle: "hotel",
    placesWishlist: "",
    anythingElse: "",
    ...over,
  };
}
