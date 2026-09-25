// All option lists for the preference form live here. Edit freely —
// the form, validation and the AI prompt all read from this file.

export const HOME_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Kochi",
  "Indore",
  "Bhopal",
  "Nagpur",
  "Surat",
  "Coimbatore",
  "Visakhapatnam",
  "Guwahati",
  "Bhubaneswar",
  "Goa",
  "Other",
] as const;

export const TRAVEL_TIME_OPTIONS = [
  { value: 4, label: "Up to 4h" },
  { value: 8, label: "Up to 8h" },
  { value: 12, label: "Up to 12h" },
  { value: null, label: "Any, chalega" },
] as const;

// `scope` decides how a dealbreaker is applied:
//  - "travel": only affects how THAT person travels (e.g. they won't fly)
//  - "destination": applies to the whole group's destination choice
export const DEALBREAKERS = [
  { id: "no_flights", label: "No flights", emoji: "✈️", scope: "travel" },
  { id: "no_overnight_buses", label: "No overnight buses", emoji: "🚌", scope: "travel" },
  { id: "no_treks", label: "No treks", emoji: "🥾", scope: "destination" },
  { id: "needs_veg", label: "Needs vegetarian food", emoji: "🥗", scope: "destination" },
  { id: "no_party", label: "No party trips", emoji: "🪩", scope: "destination" },
  { id: "no_extreme_cold", label: "No extreme cold", emoji: "🥶", scope: "destination" },
  { id: "no_extreme_heat", label: "No extreme heat", emoji: "🥵", scope: "destination" },
] as const;

export const DESTINATION_TYPES = [
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "mountains", label: "Mountains", emoji: "🏔️" },
  { id: "valleys", label: "Valleys", emoji: "🌄" },
  { id: "city", label: "City", emoji: "🌆" },
  { id: "heritage", label: "Heritage", emoji: "🏰" },
  { id: "nature", label: "Nature / wildlife", emoji: "🐅" },
  { id: "offbeat", label: "Offbeat", emoji: "🧭" },
] as const;

export const VIBES = [
  { id: "relax", label: "Relax", emoji: "😌" },
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "culture", label: "Culture", emoji: "🛕" },
  { id: "mix", label: "Thoda sab kuch", emoji: "🎲" },
] as const;

export const PACES = [
  { id: "chill", label: "Chill", emoji: "🐢" },
  { id: "balanced", label: "Balanced", emoji: "⚖️" },
  { id: "packed", label: "Packed", emoji: "⚡" },
] as const;

export const STAY_STYLES = [
  { id: "hostel", label: "Hostel", emoji: "🛏️" },
  { id: "hotel", label: "Mid-range hotel", emoji: "🏨" },
  { id: "homestay", label: "Villa / homestay", emoji: "🏡" },
] as const;

// Budget per person, all-in, in INR.
export const BUDGET = {
  min: 3000,
  max: 60000,
  step: 500,
  defaultRange: [10000, 20000] as [number, number],
  presets: [
    { label: "Under ₹10k", range: [5000, 10000] as [number, number] },
    { label: "₹10k–15k", range: [10000, 15000] as [number, number] },
    { label: "₹15k–25k", range: [15000, 25000] as [number, number] },
    { label: "₹25k+", range: [25000, 40000] as [number, number] },
  ],
};

export const TRIP_DAYS = { min: 1, max: 14, defaultRange: [3, 5] as [number, number] };

export const FREE_TEXT_MAX = 500;
export const NAME_MAX = 40;

export type DealbreakerId = (typeof DEALBREAKERS)[number]["id"];
export type DestinationTypeId = (typeof DESTINATION_TYPES)[number]["id"];
export type VibeId = (typeof VIBES)[number]["id"];
export type PaceId = (typeof PACES)[number]["id"];
export type StayStyleId = (typeof STAY_STYLES)[number]["id"];
