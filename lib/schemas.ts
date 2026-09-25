import { z } from "zod";
import {
  BUDGET,
  DEALBREAKERS,
  DESTINATION_TYPES,
  FREE_TEXT_MAX,
  HOME_CITIES,
  NAME_MAX,
  PACES,
  STAY_STYLES,
  TRIP_DAYS,
  VIBES,
} from "@/config/preferences";

const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const dateRangeSchema = z
  .object({ start: isoDate, end: isoDate })
  .refine((r) => r.start <= r.end, "Range must end after it starts");

export const nameSchema = z.string().trim().min(1, "Naam toh batao").max(NAME_MAX);

export const preferencesSchema = z
  .object({
    homeCity: z.enum(HOME_CITIES),
    homeCityOther: z.string().trim().max(60).optional().default(""),
    dateRanges: z.array(dateRangeSchema).min(1, "Add at least one date range").max(6),
    tripDays: z.object({
      min: z.number().int().min(TRIP_DAYS.min).max(TRIP_DAYS.max),
      max: z.number().int().min(TRIP_DAYS.min).max(TRIP_DAYS.max),
    }),
    budget: z.object({
      min: z.number().int().min(BUDGET.min).max(BUDGET.max),
      max: z.number().int().min(BUDGET.min).max(BUDGET.max),
    }),
    maxTravelHours: z.union([z.literal(4), z.literal(8), z.literal(12), z.null()]),
    dealbreakers: z.array(z.enum(ids(DEALBREAKERS))).default([]),
    destinationTypesRanked: z.array(z.enum(ids(DESTINATION_TYPES))).min(1, "Rank at least one type"),
    vibe: z.enum(ids(VIBES)),
    pace: z.enum(ids(PACES)),
    stayStyle: z.enum(ids(STAY_STYLES)),
    placesWishlist: z.string().trim().max(FREE_TEXT_MAX).default(""),
    anythingElse: z.string().trim().max(FREE_TEXT_MAX).default(""),
  })
  .refine((p) => p.tripDays.min <= p.tripDays.max, { message: "Min days can't be more than max", path: ["tripDays"] })
  .refine((p) => p.budget.min <= p.budget.max, { message: "Min budget can't be more than max", path: ["budget"] })
  .refine((p) => p.homeCity !== "Other" || p.homeCityOther.length > 0, {
    message: "Which city?",
    path: ["homeCityOther"],
  });

export type Preferences = z.infer<typeof preferencesSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;

export const createTripSchema = z
  .object({
    name: z.string().trim().min(1, "Trip ka naam?").max(80),
    coordinatorName: nameSchema,
    windowStart: isoDate,
    windowEnd: isoDate,
  })
  .refine((t) => t.windowStart <= t.windowEnd, { message: "Window must end after it starts", path: ["windowEnd"] });

export const participantInputSchema = z.object({
  name: nameSchema,
  preferences: preferencesSchema,
});

// ---- AI output (Step B) -------------------------------------------------

export const optionSchema = z.object({
  destination: z.string().min(1),
  state: z.string().min(1),
  dates: z.object({ start: isoDate, end: isoDate }),
  days: z.number().int().min(1).max(30),
  cost_breakdown: z.object({
    travel: z.number().nonnegative(),
    stay: z.number().nonnegative(),
    food_activities: z.number().nonnegative(),
    total: z.number().nonnegative(),
  }),
  why: z.string().min(1),
  per_person: z
    .array(
      z.object({
        name: z.string().min(1),
        score: z.number().min(0).max(100),
        reason: z.string().min(1),
      }),
    )
    .min(1),
  weakest_for: z.object({ name: z.string(), reason: z.string() }),
});

export const aiOutputSchema = z.object({
  options: z.array(optionSchema).length(3),
  what_changed: z.string(),
});

export type TripOption = z.infer<typeof optionSchema> & { flags?: string[] };
export type AiOutput = z.infer<typeof aiOutputSchema>;
