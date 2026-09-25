import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Participant, Result, Trip } from "@/lib/types";
import { STALE_RUN_MS, type NewResult, type NewTrip, type Store } from "./types";

// Mock-mode store: one JSON file on disk, kept in memory. Every operation is
// synchronous inside a single Node process, so claim/finish are atomic.
// Local development only — Vercel's filesystem is read-only.

interface Db {
  trips: Trip[];
  participants: (Participant & { edit_token_hash: string })[];
  results: Result[];
}

const FILE = path.join(process.cwd(), ".data", "db.json");

function load(): Db {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as Db;
  } catch {
    return { trips: [], participants: [], results: [] };
  }
}

// Survive Next.js hot reloads: keep one copy per process.
const g = globalThis as unknown as { __atcpDb?: Db };
const db = (): Db => (g.__atcpDb ??= load());

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(db(), null, 2));
  } catch (e) {
    // e.g. deployed without Supabase keys: keep working in memory, but say so.
    console.warn("[mock store] couldn't write .data/db.json; data is in memory only.", e);
  }
}

const now = () => new Date().toISOString();
const clone = <T>(x: T): T => structuredClone(x);
const publicParticipant = (row: Db["participants"][number]): Participant => {
  const { edit_token_hash, ...p } = row;
  void edit_token_hash;
  return clone(p);
};

export const jsonStore: Store = {
  async createTrip(t: NewTrip) {
    const trip: Trip = {
      ...t,
      id: randomUUID(),
      created_at: now(),
      gen_status: "idle",
      gen_pending: false,
      gen_started_at: null,
      gen_error: null,
    };
    db().trips.push(trip);
    save();
    return clone(trip);
  },

  async getTripBySlug(slug) {
    const t = db().trips.find((x) => x.slug === slug);
    return t ? clone(t) : null;
  },

  async getTripById(id) {
    const t = db().trips.find((x) => x.id === id);
    return t ? clone(t) : null;
  },

  async listParticipants(tripId) {
    return db()
      .participants.filter((p) => p.trip_id === tripId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(publicParticipant);
  },

  async addParticipant(tripId, name, preferences, tokenHash) {
    const ts = now();
    const p = { id: randomUUID(), trip_id: tripId, name, preferences, created_at: ts, updated_at: ts, edit_token_hash: tokenHash };
    db().participants.push(p);
    save();
    return publicParticipant(p);
  },

  async updateParticipant(tripId, participantId, tokenHash, name, preferences) {
    const p = db().participants.find((x) => x.id === participantId && x.trip_id === tripId);
    if (!p || p.edit_token_hash !== tokenHash) return null;
    Object.assign(p, { name, preferences, updated_at: now() });
    save();
    return publicParticipant(p);
  },

  async latestResult(tripId) {
    const rs = db().results.filter((r) => r.trip_id === tripId);
    return rs.length ? clone(rs[rs.length - 1]) : null;
  },

  async insertResult(r: NewResult) {
    const row: Result = { ...clone(r), id: randomUUID(), created_at: now() };
    db().results.push(row);
    save();
    return clone(row);
  },

  async claimGeneration(tripId) {
    const t = db().trips.find((x) => x.id === tripId);
    if (!t) return false;
    const busy =
      t.gen_status === "running" && t.gen_started_at !== null && Date.now() - Date.parse(t.gen_started_at) < STALE_RUN_MS;
    if (busy) {
      t.gen_pending = true;
    } else {
      Object.assign(t, { gen_status: "running", gen_pending: false, gen_started_at: now() });
    }
    save();
    return !busy;
  },

  async finishGeneration(tripId, error) {
    const t = db().trips.find((x) => x.id === tripId);
    if (!t) return false;
    const rerun = t.gen_pending;
    Object.assign(t, {
      gen_status: rerun ? "running" : "idle",
      gen_started_at: rerun ? now() : t.gen_started_at,
      gen_pending: false,
      gen_error: error,
    });
    save();
    return rerun;
  },
};
