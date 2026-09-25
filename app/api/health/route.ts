import { env, useRealGemini, useRealSupabase } from "@/lib/env";

// Setup check: which services this deployment can see. Never returns key values.
export async function GET() {
  return Response.json(
    {
      supabase: useRealSupabase,
      gemini: useRealGemini,
      geminiModel: env.geminiModel,
      // Which env var names are set (true/false), to debug hosting setup.
      vars: {
        GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY?.trim()),
        GEMINI_MODEL: Boolean(process.env.GEMINI_MODEL?.trim()),
        supabaseUrl: Boolean(env.supabaseUrl),
        supabaseAnonKey: Boolean(env.supabaseAnonKey),
        supabaseServiceKey: Boolean(env.supabaseServiceKey),
      },
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
