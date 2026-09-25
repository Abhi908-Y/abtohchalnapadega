import "server-only";
import { useRealSupabase } from "@/lib/env";
import { jsonStore } from "./jsonStore";
import { supabaseStore } from "./supabaseStore";
import type { Store } from "./types";

export const store: Store = useRealSupabase ? supabaseStore : jsonStore;
export type { Store } from "./types";
