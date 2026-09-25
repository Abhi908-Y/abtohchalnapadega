import "server-only";

// Decides which services are real and which are mocked. Each service switches
// on by itself as soon as its keys are present in .env.local (or Vercel).

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s && !s.startsWith("your-") ? s : "";
};

export const env = {
  geminiApiKey: clean(process.env.GEMINI_API_KEY),
  // Latest stable Flash model per https://ai.google.dev/gemini-api/docs/models (checked Sep 2026).
  geminiModel: clean(process.env.GEMINI_MODEL) || "gemini-3.8-flash",
  // Also accept the names Vercel's Supabase integration creates.
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL) || clean(process.env.SUPABASE_URL),
  supabaseAnonKey:
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.SUPABASE_ANON_KEY),
  supabaseServiceKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.SUPABASE_SECRET_KEY),
};

export const useRealSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceKey);
export const useRealGemini = Boolean(env.geminiApiKey);
