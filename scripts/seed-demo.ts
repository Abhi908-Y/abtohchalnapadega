/**
 * Demo: 5 friends with conflicting preferences join one by one.
 *
 *   npm run dev      (in one terminal)
 *   npm run demo     (in another)
 *
 * Open the printed link and watch the suggestions and the WhatsApp message
 * change as each person joins. Works in mock mode and with real keys.
 *
 * Env: DEMO_BASE_URL (default http://localhost:3000), DEMO_DELAY_SECONDS (default 12)
 */

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const DELAY = Number(process.env.DEMO_DELAY_SECONDS ?? 12) * 1000;

const now = new Date();
const Y = now.getMonth() < 9 ? now.getFullYear() : now.getFullYear() + 1; // next Oct–Dec
const d = (m: number, day: number) => `${Y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const people = [
  {
    name: "Riya",
    preferences: {
      homeCity: "Mumbai",
      dateRanges: [{ start: d(10, 1), end: d(10, 20) }, { start: d(11, 10), end: d(11, 30) }],
      tripDays: { min: 3, max: 5 },
      budget: { min: 12000, max: 20000 },
      maxTravelHours: 12,
      dealbreakers: ["no_overnight_buses"],
      destinationTypesRanked: ["beach", "heritage", "mountains"],
      vibe: "mix",
      pace: "balanced",
      stayStyle: "hotel",
      placesWishlist: "Gokarna, Udaipur",
      anythingElse: "Please let's actually go this time 🙏",
    },
  },
  {
    name: "Siddharth",
    preferences: {
      homeCity: "Delhi",
      dateRanges: [{ start: d(10, 5), end: d(10, 25) }],
      tripDays: { min: 4, max: 6 },
      budget: { min: 12000, max: 25000 },
      maxTravelHours: null,
      dealbreakers: ["no_extreme_heat"],
      destinationTypesRanked: ["mountains", "offbeat", "valleys"],
      vibe: "adventure",
      pace: "packed",
      stayStyle: "hostel",
      placesWishlist: "Spiti, Kasol, anything with a trek",
      anythingElse: "Can only take leave around Dussehra",
    },
  },
  {
    name: "Karan",
    preferences: {
      homeCity: "Bengaluru",
      dateRanges: [{ start: d(10, 1), end: d(10, 12) }],
      tripDays: { min: 3, max: 4 },
      budget: { min: 8000, max: 10000 },
      maxTravelHours: 8,
      dealbreakers: ["no_flights"],
      destinationTypesRanked: ["beach", "nature", "city"],
      vibe: "party",
      pace: "chill",
      stayStyle: "hostel",
      placesWishlist: "Goa obviously",
      anythingElse: "Broke till the Diwali bonus 😅",
    },
  },
  {
    name: "Aisha",
    preferences: {
      homeCity: "Hyderabad",
      dateRanges: [{ start: d(10, 6), end: d(10, 9) }, { start: d(12, 1), end: d(12, 20) }],
      tripDays: { min: 3, max: 5 },
      budget: { min: 10000, max: 18000 },
      maxTravelHours: 12,
      dealbreakers: ["needs_veg", "no_treks"],
      destinationTypesRanked: ["heritage", "beach", "city"],
      vibe: "culture",
      pace: "balanced",
      stayStyle: "homestay",
      placesWishlist: "Hampi, Pondicherry",
      anythingElse: "",
    },
  },
  {
    name: "Preethi",
    preferences: {
      homeCity: "Chennai",
      dateRanges: [{ start: d(10, 8), end: d(10, 30) }],
      tripDays: { min: 4, max: 5 },
      budget: { min: 10000, max: 16000 },
      maxTravelHours: 8,
      dealbreakers: ["no_extreme_cold", "no_party"],
      destinationTypesRanked: ["nature", "valleys", "beach"],
      vibe: "relax",
      pace: "chill",
      stayStyle: "homestay",
      placesWishlist: "Coorg, Munnar",
      anythingElse: "Need at least one full lazy day",
    },
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${data.error ?? ""}`);
  return data;
}

async function main() {
  const { slug } = await post("/api/trips", {
    name: "Diwali Escape",
    coordinatorName: "Riya",
    windowStart: d(10, 1),
    windowEnd: d(12, 31),
  }).catch((e) => {
    console.error(`Couldn't reach ${BASE}. Is \`npm run dev\` running?\n`, e.message);
    process.exit(1);
  });

  console.log(`\n🧳 Demo trip created. Open this on your phone or browser:\n\n   ${BASE}/t/${slug}\n`);
  console.log(`People will join every ${DELAY / 1000}s…\n`);
  await sleep(Math.min(DELAY, 6000));

  for (const [i, p] of people.entries()) {
    await post(`/api/trips/${slug}/participants`, p);
    console.log(`  ${i + 1}/5  ${p.name} joined (${p.preferences.homeCity}, ₹${p.preferences.budget.min / 1000}k–${p.preferences.budget.max / 1000}k)`);
    if (i < people.length - 1) await sleep(DELAY);
  }
  console.log(`\n✅ Everyone's in. Dashboard: ${BASE}/t/${slug}\n`);
}

main();
