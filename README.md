# Ab Toh Chalna Padega 🛺

A live trip dashboard for friend groups who can't agree on a trip in WhatsApp.

The coordinator creates a trip and shares **one link**. Everyone fills a 3-minute preference form, and the dashboard shows the **3 best-fit destinations** for the group. For each option it shows who's happy and who's compromising, and it keeps a ready-made message to paste back into the WhatsApp group. Everything updates live as people join or edit.

- **Stack:** Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Realtime), Google Gemini (`@google/genai`), deployed on Vercel.
- **No accounts.** Access is by link only.
- **Mock mode.** With no keys, it runs fully on your machine: a local JSON store, a built-in ranker instead of Gemini, and polling instead of Realtime.

---

## 1. Local setup (mock mode, no keys needed)

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000, create a trip and fill the form.

### Watch the demo

With `npm run dev` running, open a second terminal:

```bash
npm run demo
```

This creates a "Diwali Escape" trip and prints its link. Five friends then join 12 seconds apart: Riya (Mumbai), Siddharth (Delhi), Karan (Bengaluru), Aisha (Hyderabad) and Preethi (Chennai). Their preferences conflict: budgets run from ₹8k to ₹25k, dates only partly overlap, and each has different dealbreakers. Open the link and watch the top 3, the "What changed" note and the WhatsApp message change as each person joins.

Change the pace with `DEMO_DELAY_SECONDS=5 npm run demo`.

### Tests

```bash
npm test
```

The tests cover date overlap, trip length, common budget, merged dealbreakers, output validation, the retry, the one-run-at-a-time lock and the WhatsApp message.

Mock-mode data lives in `.data/db.json`, which is gitignored. Delete it to start fresh.

---

## 2. Get your keys

### Gemini (Google AI Studio)
1. Go to https://aistudio.google.com/apikey and sign in.
2. Click **Create API key** and copy it.

The default model is `gemini-3.8-flash`, the current Flash model in [Google's model list](https://ai.google.dev/gemini-api/docs/models). To use a different one, set `GEMINI_MODEL`.

### Supabase
1. Create a project at https://supabase.com/dashboard.
2. Go to **Project Settings → API Keys** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key (or the *publishable* key) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (or the *secret* key) → `SUPABASE_SERVICE_ROLE_KEY`

The service role key bypasses all security rules. Keep it server-side only, and never put it in a `NEXT_PUBLIC_` variable.

## 3. Add the keys to `.env.local`

```bash
cp .env.example .env.local
```

Then fill it in:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=            # optional
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Restart `npm run dev` after changing env vars. Each service switches on as soon as its keys are present:

| Keys present | Storage + live updates | Suggestions |
|---|---|---|
| none | local JSON file, polling every 5s | built-in mock ranker |
| Gemini only | local JSON file, polling | **Gemini** |
| Supabase only (all 3) | **Supabase + Realtime** | built-in mock ranker |
| all | **Supabase + Realtime** | **Gemini** |

`.env.local` is gitignored. Only the two `NEXT_PUBLIC_` values ever reach the browser.

## 4. Set up the database

1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It's safe to run again.

This creates `trips`, `participants`, `participant_secrets` and `results`. It also enables RLS with read-only policies, creates the generation-lock functions, and adds `participants`, `results` and `trips` to the `supabase_realtime` publication.

3. **Check Realtime is on.** Go to **Database → Publications → supabase_realtime** and confirm the three tables are toggled on. The script does this for you; this step just confirms it.

To confirm it's working, open the same trip on two devices and submit on one. The other should update within about a second without a refresh.

## 5. Deploy to Vercel

1. Push the repo to GitHub.
2. In https://vercel.com/new, import the repo. The framework is detected as Next.js, so keep the defaults.
3. Under **Settings → Environment Variables**, add these for Production (and Preview if you want):

   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | optional, e.g. `gemini-3.8-flash` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role / secret key |

4. Deploy. If you change env vars later, redeploy so they take effect.

In production you need the Supabase keys. Vercel's filesystem is read-only, so mock storage would only live in memory and would be lost between requests.

---

## How it works

```
submit/edit ─▶ POST/PUT /api/trips/[slug]/participants
                 │  (response returns immediately; the rest runs via after())
                 ▼
           claim_generation(trip)      ← one run per trip; a mid-run submit queues ONE rerun
                 ▼
  Step A  lib/engine/*           deterministic: date overlap, trip length, common budget,
                                 merged dealbreakers, who's left out
  Step B  lib/ai/gemini.ts       Gemini structured JSON (or lib/ai/mockSuggester.ts),
                                 given constraints + all submissions + CURRENT top 3
  Step C  lib/ai/validate.ts     zod parse; flag options outside dates/budget/length;
                                 retry once with the problems as feedback
                 ▼
           insert into results  ─▶ Realtime ─▶ every open dashboard refetches
           finish_generation(trip) → rerun if something arrived meanwhile
```

- **Stability.** Gemini is told to keep the current top 3 unless a replacement is clearly better. The mock ranker gives current options a small bonus.
- **Edits.** Joining returns a random edit token. The browser keeps it in `localStorage`, and the server stores only its SHA-256 hash, in `participant_secrets`, which the browser can never read.
- **Access.** No logins means the database can't know who was invited. The link is the key: slugs contain 96 random bits, the browser has read-only access, and every write goes through server routes that use the service role key.

## Where to change things

| What | Where |
|---|---|
| Form options (cities, dealbreakers, types, vibes, budget range…) | `config/preferences.ts` |
| Gemini rules / prompt | `lib/ai/prompt.ts` |
| Constraint maths | `lib/engine/` |
| WhatsApp message format | `lib/share/whatsappMessage.ts` |
| Mock destinations | `lib/ai/destinations.ts` |
| Colours / theme | `app/globals.css` |

Out of scope for v1: voting, locking a decision, auto-sending messages, bookings, payments, live prices, login.
