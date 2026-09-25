import type { DestinationTypeId, StayStyleId, VibeId } from "@/config/preferences";

// Rough data for MOCK MODE only. The real Gemini model uses its own knowledge.
// Costs are per person in INR, stay assumes two people sharing a room.

export interface Destination {
  name: string;
  state: string;
  lat: number;
  lon: number;
  types: DestinationTypeId[];
  vibes: VibeId[];
  /** Hours from the nearest airport to the destination. */
  airportTransferH: number;
  stayPerNight: Record<StayStyleId, number>;
  foodActivitiesPerDay: number;
  trekCentric?: boolean;
  partyCentric?: boolean;
  hardForVeg?: boolean;
  coldMonths?: number[];
  hotMonths?: number[];
  hook: string;
}

export const DESTINATIONS: Destination[] = [
  { name: "Goa", state: "Goa", lat: 15.3, lon: 74.12, types: ["beach"], vibes: ["party", "relax", "mix"], airportTransferH: 0.7, stayPerNight: { hostel: 800, hotel: 2200, homestay: 1900 }, foodActivitiesPerDay: 1500, partyCentric: true, hotMonths: [4, 5], hook: "beaches, shacks and nightlife sorted" },
  { name: "Gokarna", state: "Karnataka", lat: 14.55, lon: 74.32, types: ["beach", "offbeat"], vibes: ["relax", "adventure", "mix"], airportTransferH: 3, stayPerNight: { hostel: 600, hotel: 1600, homestay: 1400 }, foodActivitiesPerDay: 900, hotMonths: [4, 5], hook: "quiet beaches with a beach-to-beach walk" },
  { name: "Pondicherry", state: "Puducherry", lat: 11.94, lon: 79.81, types: ["beach", "heritage", "city"], vibes: ["relax", "culture", "mix"], airportTransferH: 3, stayPerNight: { hostel: 700, hotel: 2000, homestay: 1800 }, foodActivitiesPerDay: 1100, hotMonths: [4, 5, 6], hook: "French Quarter cafés plus the sea" },
  { name: "Varkala", state: "Kerala", lat: 8.73, lon: 76.72, types: ["beach", "offbeat"], vibes: ["relax", "party", "mix"], airportTransferH: 1.5, stayPerNight: { hostel: 700, hotel: 1800, homestay: 1600 }, foodActivitiesPerDay: 1100, hotMonths: [4, 5], hook: "cliff-top cafés over the Arabian Sea" },
  { name: "Alibaug", state: "Maharashtra", lat: 18.64, lon: 72.87, types: ["beach"], vibes: ["relax", "mix"], airportTransferH: 2.5, stayPerNight: { hostel: 900, hotel: 2500, homestay: 2800 }, foodActivitiesPerDay: 1200, hotMonths: [4, 5], hook: "easy villa weekend by the beach" },
  { name: "Manali", state: "Himachal Pradesh", lat: 32.24, lon: 77.19, types: ["mountains", "valleys"], vibes: ["adventure", "party", "mix"], airportTransferH: 2.5, stayPerNight: { hostel: 600, hotel: 1800, homestay: 1500 }, foodActivitiesPerDay: 1200, coldMonths: [12, 1, 2], hook: "snow views, cafés in Old Manali, Solang adventure" },
  { name: "Kasol", state: "Himachal Pradesh", lat: 32.01, lon: 77.31, types: ["valleys", "mountains", "offbeat"], vibes: ["adventure", "party"], airportTransferH: 3, stayPerNight: { hostel: 500, hotel: 1400, homestay: 1200 }, foodActivitiesPerDay: 900, trekCentric: true, partyCentric: true, coldMonths: [12, 1, 2], hook: "Parvati valley treks and riverside cafés" },
  { name: "Spiti Valley", state: "Himachal Pradesh", lat: 32.25, lon: 78.03, types: ["mountains", "offbeat", "valleys"], vibes: ["adventure"], airportTransferH: 10, stayPerNight: { hostel: 800, hotel: 1800, homestay: 1500 }, foodActivitiesPerDay: 1000, trekCentric: true, coldMonths: [10, 11, 12, 1, 2, 3, 4], hook: "high-altitude desert, monasteries, epic roads" },
  { name: "Rishikesh", state: "Uttarakhand", lat: 30.09, lon: 78.27, types: ["mountains", "nature"], vibes: ["adventure", "culture", "mix"], airportTransferH: 1, stayPerNight: { hostel: 500, hotel: 1600, homestay: 1400 }, foodActivitiesPerDay: 1000, hotMonths: [5, 6], hook: "rafting, Ganga aarti and all-veg food" },
  { name: "Darjeeling", state: "West Bengal", lat: 27.04, lon: 88.26, types: ["mountains"], vibes: ["relax", "culture"], airportTransferH: 3, stayPerNight: { hostel: 600, hotel: 1800, homestay: 1600 }, foodActivitiesPerDay: 1000, coldMonths: [12, 1, 2], hook: "toy train, tea estates and Kanchenjunga sunrise" },
  { name: "Shillong & Cherrapunji", state: "Meghalaya", lat: 25.57, lon: 91.88, types: ["nature", "offbeat", "valleys"], vibes: ["adventure", "mix"], airportTransferH: 3, stayPerNight: { hostel: 700, hotel: 2000, homestay: 1800 }, foodActivitiesPerDay: 1000, hardForVeg: true, hook: "living root bridges and waterfalls" },
  { name: "Udaipur", state: "Rajasthan", lat: 24.59, lon: 73.71, types: ["heritage", "city"], vibes: ["culture", "relax", "mix"], airportTransferH: 0.7, stayPerNight: { hostel: 700, hotel: 2200, homestay: 2500 }, foodActivitiesPerDay: 1100, hotMonths: [4, 5, 6], hook: "lake palaces and rooftop dinners" },
  { name: "Jaipur", state: "Rajasthan", lat: 26.91, lon: 75.79, types: ["heritage", "city"], vibes: ["culture", "mix"], airportTransferH: 0.5, stayPerNight: { hostel: 600, hotel: 2000, homestay: 2200 }, foodActivitiesPerDay: 1000, hotMonths: [4, 5, 6], hook: "forts, bazaars and dal baati" },
  { name: "Jaisalmer", state: "Rajasthan", lat: 26.92, lon: 70.91, types: ["heritage", "offbeat"], vibes: ["culture", "adventure"], airportTransferH: 5, stayPerNight: { hostel: 600, hotel: 1800, homestay: 2000 }, foodActivitiesPerDay: 1100, hotMonths: [4, 5, 6, 7, 8, 9], hook: "golden fort and a desert camp night" },
  { name: "Hampi", state: "Karnataka", lat: 15.34, lon: 76.46, types: ["heritage", "offbeat"], vibes: ["culture", "adventure", "mix"], airportTransferH: 4, stayPerNight: { hostel: 500, hotel: 1500, homestay: 1400 }, foodActivitiesPerDay: 700, hotMonths: [3, 4, 5, 6], hook: "boulders, ruins and sunset at Hemakuta" },
  { name: "Mysore", state: "Karnataka", lat: 12.3, lon: 76.64, types: ["heritage", "city"], vibes: ["culture", "relax"], airportTransferH: 3, stayPerNight: { hostel: 600, hotel: 1600, homestay: 1500 }, foodActivitiesPerDay: 800, hook: "palace, markets and an easy Coorg-side detour" },
  { name: "Coorg", state: "Karnataka", lat: 12.34, lon: 75.81, types: ["nature", "valleys", "mountains"], vibes: ["relax", "mix"], airportTransferH: 4.5, stayPerNight: { hostel: 700, hotel: 2000, homestay: 1800 }, foodActivitiesPerDay: 1100, hook: "coffee-estate homestays and misty hills" },
  { name: "Munnar", state: "Kerala", lat: 10.09, lon: 77.06, types: ["mountains", "nature", "valleys"], vibes: ["relax", "mix"], airportTransferH: 4, stayPerNight: { hostel: 700, hotel: 1900, homestay: 1700 }, foodActivitiesPerDay: 1000, hook: "tea gardens and cool, slow days" },
  { name: "Wayanad", state: "Kerala", lat: 11.69, lon: 76.13, types: ["nature", "valleys"], vibes: ["relax", "adventure", "mix"], airportTransferH: 3, stayPerNight: { hostel: 700, hotel: 1800, homestay: 1700 }, foodActivitiesPerDay: 1000, hook: "jungle stays, waterfalls and easy hikes" },
  { name: "Lonavala", state: "Maharashtra", lat: 18.75, lon: 73.41, types: ["valleys", "nature"], vibes: ["relax", "mix"], airportTransferH: 1.5, stayPerNight: { hostel: 800, hotel: 2200, homestay: 2600 }, foodActivitiesPerDay: 1000, hook: "a short-hop villa trip with viewpoints" },
];

export const CITY_COORDS: Record<string, [number, number]> = {
  Mumbai: [19.08, 72.88],
  Delhi: [28.61, 77.21],
  Bengaluru: [12.97, 77.59],
  Hyderabad: [17.39, 78.49],
  Chennai: [13.08, 80.27],
  Kolkata: [22.57, 88.36],
  Pune: [18.52, 73.86],
  Ahmedabad: [23.02, 72.57],
  Jaipur: [26.91, 75.79],
  Lucknow: [26.85, 80.95],
  Chandigarh: [30.73, 76.78],
  Kochi: [9.93, 76.27],
  Indore: [22.72, 75.86],
  Bhopal: [23.26, 77.41],
  Nagpur: [21.15, 79.09],
  Surat: [21.17, 72.83],
  Coimbatore: [11.02, 76.96],
  Visakhapatnam: [17.69, 83.22],
  Guwahati: [26.14, 91.74],
  Bhubaneswar: [20.3, 85.82],
  Goa: [15.49, 73.83],
};
