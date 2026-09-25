"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveIdentity, useIdentity } from "@/lib/client/identity";
import { useTripLive } from "@/lib/client/useTripLive";
import { formatRange } from "@/lib/engine/dateUtils";
import type { Preferences } from "@/lib/schemas";
import { buildWhatsAppMessage } from "@/lib/share/whatsappMessage";
import type { TripView } from "@/lib/types";
import { PreferenceForm } from "../PreferenceForm";
import { Button, Card, Logo } from "../ui";
import { GroupSummary } from "./GroupSummary";
import { OptionCard, OptionSkeleton } from "./OptionCard";
import { PeopleStrip } from "./People";
import { ShareCard, copyText } from "./ShareCard";

export function TripDashboard({ initial, origin }: { initial: TripView; origin: string }) {
  const slug = initial.trip.slug;
  const { view, refresh } = useTripLive(slug, initial);
  const { trip, participants, result } = view;
  const router = useRouter();
  const search = useSearchParams();
  const justCreated = search.get("new") === "1";
  const suggestedName = search.get("me") ?? "";

  const identity = useIdentity(slug);
  const [formOpen, setFormOpen] = useState(justCreated);
  const [linkCopied, setLinkCopied] = useState(false);
  // Set right after our own submit so "Updating…" shows before the server catches up.
  const [pending, setPending] = useState<{ resultId: string | null; ms: number } | null>(null);

  const me = participants.find((p) => p.id === identity?.participantId) ?? null;
  const dashboardUrl = `${origin}/t/${slug}`;
  const running = trip.gen_status === "running";

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), pending.ms);
    return () => clearTimeout(t);
  }, [pending]);
  const updating = running || (pending !== null && (result?.id ?? null) === pending.resultId);

  const message = useMemo(
    () => buildWhatsAppMessage({ tripName: trip.name, dashboardUrl, participants, result }),
    [trip.name, dashboardUrl, participants, result],
  );

  async function submit(name: string, preferences: Preferences): Promise<string | null> {
    const editing = Boolean(me && identity);
    const res = await fetch(`/api/trips/${slug}/participants`, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing ? { name, preferences, participantId: identity!.participantId, editToken: identity!.editToken } : { name, preferences },
      ),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error ?? "Couldn't save. Try again?";
    if (!editing) saveIdentity(slug, { participantId: data.participant.id, editToken: data.editToken });
    // With fewer than 2 people there's nothing to generate; otherwise wait for the new result (or give up after 30s).
    setPending({ resultId: result?.id ?? null, ms: participants.length + (editing ? 0 : 1) < 2 ? 2500 : 30000 });
    setFormOpen(false);
    if (justCreated) router.replace(`/t/${slug}`, { scroll: false });
    await refresh();
    return null;
  }

  async function copyLink() {
    if (await copyText(dashboardUrl)) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  const n = participants.length;
  const order = participants.map((p) => p.name);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-24">
      <div className="bunting -mx-4" />
      <header className="pt-5 pb-4">
        <Link href="/" className="inline-block">
          <Logo small />
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">{trip.name}</h1>
        <p className="text-sm text-muted">
          Organised by {trip.coordinator_name} · anytime {formatRange(trip.window_start, trip.window_end)}
        </p>
        <div className="mt-3 flex gap-2 whitespace-nowrap">
          {me ? (
            <Button variant="soft" onClick={() => setFormOpen(true)}>
              ✏️ Edit my answers
            </Button>
          ) : (
            <Button onClick={() => setFormOpen(true)} className="flex-1">
              ➕ Join the plan
            </Button>
          )}
          <Button variant="soft" onClick={copyLink} className={me ? "flex-1" : ""}>
            {linkCopied ? "Link copied ✓" : "🔗 Copy link"}
          </Button>
        </div>
      </header>

      {justCreated && n === 0 && (
        <Card className="pop-in mb-4 border-saffron/40 bg-[#fff3e4]">
          <p className="font-semibold">Trip ban gaya! 🎉</p>
          <p className="text-sm text-muted">Fill in your own preferences first, then drop the link in the WhatsApp group.</p>
        </Card>
      )}

      <div className="space-y-4">
        {n === 0 ? (
          <Card className="text-center">
            <div className="text-5xl" aria-hidden>
              🧳
            </div>
            <p className="mt-2 font-display text-2xl font-bold">Sab log aao, phir plan banega</p>
            <p className="text-sm text-muted">Nobody&apos;s added preferences yet. Be the first!</p>
          </Card>
        ) : (
          <PeopleStrip participants={participants} coordinatorName={trip.coordinator_name} meId={identity?.participantId ?? null} />
        )}

        {/* Status line */}
        {updating && n >= 2 ? (
          <div className="flex items-center gap-2 rounded-2xl bg-marigold/25 px-4 py-3 text-sm font-semibold" role="status">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-saffron border-t-transparent" aria-hidden />
            Updating suggestions…
          </div>
        ) : result?.what_changed ? (
          <div key={result.id} className="flash-note rounded-2xl bg-paper px-4 py-3 text-sm" role="status">
            <span className="font-semibold">What changed: </span>
            {result.what_changed}
          </div>
        ) : null}
        {trip.gen_error && !updating && (
          <div className="rounded-2xl bg-fit-low/10 px-4 py-3 text-sm text-fit-low">{trip.gen_error}</div>
        )}

        {n === 1 && (
          <Card className="text-center">
            <div className="text-4xl" aria-hidden>
              ⏳
            </div>
            <p className="mt-1 font-display text-xl font-bold">Suggestions appear when a second person joins</p>
            <p className="text-sm text-muted">Ek se kya hoga? Share the link!</p>
          </Card>
        )}

        {n >= 2 && result && (
          <>
            <h2 className="pt-2 font-display text-2xl font-bold">Top 3 for the group</h2>
            {result.participant_count < n && !updating && (
              <p className="text-sm text-muted">Based on {result.participant_count} of {n} people. Refreshing soon.</p>
            )}
            <div className={`space-y-4 transition-opacity ${updating ? "opacity-60" : ""}`}>
              {result.options.slice(0, 3).map((o, i) => (
                <OptionCard key={`${result.id}-${o.destination}`} option={o} rank={i} order={order} />
              ))}
            </div>
            <GroupSummary c={result.constraints} />
          </>
        )}
        {n >= 2 && !result && (
          <>
            <h2 className="pt-2 font-display text-2xl font-bold">Top 3 for the group</h2>
            <OptionSkeleton />
            <OptionSkeleton />
            <OptionSkeleton />
          </>
        )}

        <ShareCard message={message} />
      </div>

      {formOpen && (
        <PreferenceForm
          window={{ start: trip.window_start, end: trip.window_end }}
          initialName={me?.name ?? (justCreated ? suggestedName : "")}
          initial={me?.preferences}
          isEdit={Boolean(me)}
          onSubmit={submit}
          onClose={() => setFormOpen(false)}
        />
      )}
    </main>
  );
}
