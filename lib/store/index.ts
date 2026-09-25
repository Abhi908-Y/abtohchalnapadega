import "server-only";
import { useRealSupabase } from "@/lib/env";
import { jsonStore } from "./jsonStore";
import { supabaseStore } from "./supabaseStore";
import type { Store } from "./types";

export const MISSING_SUPABASE_MESSAGE =
  "Server setup incomplete: Supabase keys are missing. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy.";

// Mock storage only works on a single long-running process (your laptop).
// On Vercel each request can hit a different instance, so trips would vanish:
// fail loudly instead.
const unavailable = new Proxy({} as Store, {
  get() {
    return async () => {
      throw new Error(MISSING_SUPABASE_MESSAGE);
    };
  },
});

export const store: Store = useRealSupabase ? supabaseStore : process.env.VERCEL ? unavailable : jsonStore;
export type { Store } from "./types";
