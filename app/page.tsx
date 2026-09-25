import { connection } from "next/server";
import { CreateTripForm } from "@/components/CreateTripForm";
import { Logo } from "@/components/ui";

const steps = [
  { emoji: "🔗", title: "One link", text: "Send it to the WhatsApp group. No app, no login." },
  { emoji: "📝", title: "3-minute form", text: "Dates, budget, dealbreakers, vibe. Mostly taps." },
  { emoji: "📊", title: "Live top 3", text: "Best-fit destinations update as each person joins." },
  { emoji: "💬", title: "Ready-made message", text: "Copy the summary straight back into the group." },
];

function defaultWindow(): [string, string] {
  // Next month through the end of the third month from now.
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 4, 0));
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

export default async function Home() {
  await connection(); // render per request so the default dates stay current
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16">
      <div className="bunting -mx-4" />
      <header className="pt-8 pb-6">
        <Logo />
        <p className="mt-3 text-lg text-muted">
          1,200 messages. Zero plans. <span className="font-semibold text-ink">Bas, ab toh chalna padega.</span>
        </p>
      </header>

      <CreateTripForm defaultWindow={defaultWindow()} />

      <ul className="mt-8 grid grid-cols-2 gap-3">
        {steps.map((s) => (
          <li key={s.title} className="rounded-2xl bg-paper/70 p-3">
            <div className="text-2xl" aria-hidden>
              {s.emoji}
            </div>
            <div className="mt-1 font-semibold">{s.title}</div>
            <div className="text-sm text-muted">{s.text}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
