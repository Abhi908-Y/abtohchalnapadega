"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "./ui";

const input =
  "mt-1 block w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20";

export function CreateTripForm({ defaultWindow }: { defaultWindow: [string, string] }) {
  const router = useRouter();
  const [defStart, defEnd] = defaultWindow;
  const [name, setName] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [windowStart, setWindowStart] = useState(defStart);
  const [windowEnd, setWindowEnd] = useState(defEnd);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, coordinatorName, windowStart, windowEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(`/t/${data.slug}?new=1&me=${encodeURIComponent(coordinatorName.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Card className="pop-in">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Naya trip banao</h2>
        <label className="block text-sm font-semibold">
          Trip name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Escape 2026" required maxLength={80} />
        </label>
        <label className="block text-sm font-semibold">
          Your name
          <input className={input} value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} placeholder="Riya" required maxLength={40} />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">When could the trip happen?</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              From
              <input type="date" className={input} value={windowStart} onChange={(e) => setWindowStart(e.target.value)} required />
            </label>
            <label className="text-xs text-muted">
              To
              <input type="date" className={input} value={windowEnd} min={windowStart} onChange={(e) => setWindowEnd(e.target.value)} required />
            </label>
          </div>
        </fieldset>
        {error && <p className="rounded-xl bg-fit-low/10 px-3 py-2 text-sm text-fit-low">{error}</p>}
        <Button type="submit" className="w-full text-lg" disabled={busy}>
          {busy ? "Bana rahe hain…" : "Create trip & get the link →"}
        </Button>
      </form>
    </Card>
  );
}
