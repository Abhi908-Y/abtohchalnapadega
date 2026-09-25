"use client";

import { useState } from "react";
import {
  BUDGET,
  DEALBREAKERS,
  DESTINATION_TYPES,
  FREE_TEXT_MAX,
  HOME_CITIES,
  PACES,
  STAY_STYLES,
  TRAVEL_TIME_OPTIONS,
  TRIP_DAYS,
  VIBES,
} from "@/config/preferences";
import { formatRange } from "@/lib/engine/dateUtils";
import type { Preferences } from "@/lib/schemas";
import { Button, Chip, cx, inr } from "./ui";

const field =
  "mt-1 block w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20";

const STEPS = [
  { title: "Tum kaun ho?", sub: "Name and where you'd start from" },
  { title: "Kab free ho?", sub: "Add every stretch that works" },
  { title: "Paisa aur safar", sub: "All-in budget per person, and how far you'll go" },
  { title: "Dealbreakers", sub: "Hard no's. We'll never suggest these." },
  { title: "Kya pasand hai?", sub: "Tap types in order of love" },
  { title: "Kuch aur?", sub: "Optional, but helps a lot" },
];

function defaults(window: { start: string; end: string }): Preferences {
  return {
    homeCity: "Mumbai",
    homeCityOther: "",
    dateRanges: [{ start: window.start, end: window.end }],
    tripDays: { min: TRIP_DAYS.defaultRange[0], max: TRIP_DAYS.defaultRange[1] },
    budget: { min: BUDGET.defaultRange[0], max: BUDGET.defaultRange[1] },
    maxTravelHours: 12,
    dealbreakers: [],
    destinationTypesRanked: [],
    vibe: "mix",
    pace: "balanced",
    stayStyle: "hotel",
    placesWishlist: "",
    anythingElse: "",
  };
}

export function PreferenceForm(props: {
  window: { start: string; end: string };
  initialName?: string;
  initial?: Preferences;
  isEdit?: boolean;
  onSubmit: (name: string, prefs: Preferences) => Promise<string | null>;
  onClose: () => void;
}) {
  const { window: win } = props;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(props.initialName ?? "");
  const [p, setP] = useState<Preferences>(() => props.initial ?? defaults(win));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => {
    setError(null);
    setP((x) => ({ ...x, [k]: v }));
  };

  function stepError(i: number): string | null {
    if (i === 0) {
      if (!name.trim()) return "Naam toh batao!";
      if (p.homeCity === "Other" && !p.homeCityOther.trim()) return "Which city?";
    }
    if (i === 1) {
      if (!p.dateRanges.length) return "Add at least one date range";
      for (const r of p.dateRanges) {
        if (!r.start || !r.end || r.start > r.end) return "Each range needs a start before its end";
        if (r.start < win.start || r.end > win.end) return `Keep dates within ${formatRange(win.start, win.end)}`;
      }
      if (p.tripDays.min > p.tripDays.max) return "Min days can't be more than max";
    }
    if (i === 2 && p.budget.min > p.budget.max) return "Min budget can't be more than max";
    if (i === 4 && !p.destinationTypesRanked.length) return "Tap at least one destination type";
    return null;
  }

  async function next() {
    const err = stepError(step);
    setError(err);
    if (err) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    const submitErr = await props.onSubmit(name.trim(), p);
    setBusy(false);
    if (submitErr) setError(submitErr);
  }

  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream sm:items-center sm:justify-center sm:bg-ink/40 sm:p-6">
      <div className="flex h-full w-full flex-col bg-cream sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl sm:shadow-2xl">
        {/* Header + progress */}
        <div className="border-b border-line px-4 pt-4 pb-3">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              Step {step + 1} of {STEPS.length} · {step >= 4 ? "almost done!" : `~${Math.max(1, 3 - step)} min left`}
            </span>
            <button onClick={props.onClose} className="-mr-2 rounded-full px-3 py-1 text-ink hover:bg-line" aria-label="Close form">
              ✕
            </button>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-saffron transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight">{STEPS[step].title}</h2>
          <p className="text-sm text-muted">{STEPS[step].sub}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5" key={step}>
          <div className="pop-in space-y-5">
            {step === 0 && (
              <>
                <label className="block text-sm font-semibold">
                  Your name
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Karan" autoFocus={!props.isEdit} />
                </label>
                <label className="block text-sm font-semibold">
                  Home city
                  <select className={field} value={p.homeCity} onChange={(e) => set("homeCity", e.target.value as Preferences["homeCity"])}>
                    {HOME_CITIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                {p.homeCity === "Other" && (
                  <label className="block text-sm font-semibold">
                    Which city?
                    <input className={field} value={p.homeCityOther} maxLength={60} onChange={(e) => set("homeCityOther", e.target.value)} placeholder="e.g. Mangaluru" />
                  </label>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-3">
                  <p className="text-sm text-muted">Trip window: {formatRange(win.start, win.end)}</p>
                  {p.dateRanges.map((r, i) => (
                    <div key={i} className="flex items-end gap-2 rounded-2xl bg-paper p-3">
                      <label className="flex-1 text-xs text-muted">
                        From
                        <input
                          type="date"
                          className={field}
                          min={win.start}
                          max={win.end}
                          value={r.start}
                          onChange={(e) => set("dateRanges", p.dateRanges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                        />
                      </label>
                      <label className="flex-1 text-xs text-muted">
                        To
                        <input
                          type="date"
                          className={field}
                          min={r.start || win.start}
                          max={win.end}
                          value={r.end}
                          onChange={(e) => set("dateRanges", p.dateRanges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                        />
                      </label>
                      {p.dateRanges.length > 1 && (
                        <button
                          type="button"
                          aria-label="Remove range"
                          className="mb-2 h-10 w-10 shrink-0 rounded-full text-muted hover:bg-line"
                          onClick={() => set("dateRanges", p.dateRanges.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {p.dateRanges.length < 6 && (
                    <Button variant="soft" type="button" className="w-full" onClick={() => set("dateRanges", [...p.dateRanges, { start: win.start, end: win.end }])}>
                      + Add another range
                    </Button>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">Trip length</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <Stepper label="Min days" value={p.tripDays.min} onChange={(v) => set("tripDays", { ...p.tripDays, min: v })} />
                    <Stepper label="Max days" value={p.tripDays.max} onChange={(v) => set("tripDays", { ...p.tripDays, max: v })} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">Budget per person, all-in</span>
                    <span className="font-display text-xl font-bold text-saffron-deep">
                      {inr(p.budget.min)} – {inr(p.budget.max)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BUDGET.presets.map((b) => (
                      <Chip
                        key={b.label}
                        selected={p.budget.min === b.range[0] && p.budget.max === b.range[1]}
                        onClick={() => set("budget", { min: b.range[0], max: b.range[1] })}
                      >
                        {b.label}
                      </Chip>
                    ))}
                  </div>
                  <RangeSlider label="Minimum" value={p.budget.min} onChange={(v) => set("budget", { min: v, max: Math.max(v, p.budget.max) })} />
                  <RangeSlider label="Maximum" value={p.budget.max} onChange={(v) => set("budget", { max: v, min: Math.min(v, p.budget.min) })} />
                  <p className="mt-1 text-xs text-muted">Travel + stay + food + activities. Be honest, the plan only works if the numbers are real.</p>
                </div>
                <div>
                  <div className="text-sm font-semibold">Max one-way travel time</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TRAVEL_TIME_OPTIONS.map((t) => (
                      <Chip key={t.label} selected={p.maxTravelHours === t.value} onClick={() => set("maxTravelHours", t.value)}>
                        {t.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="flex flex-wrap gap-2">
                {DEALBREAKERS.map((d) => (
                  <Chip key={d.id} selected={p.dealbreakers.includes(d.id)} onClick={() => set("dealbreakers", toggle(p.dealbreakers, d.id))}>
                    <span aria-hidden>{d.emoji}</span> {d.label}
                  </Chip>
                ))}
                <p className="w-full pt-2 text-sm text-muted">
                  {p.dealbreakers.length ? `${p.dealbreakers.length} selected.` : "None? Sab chalega. Nice."}
                </p>
              </div>
            )}

            {step === 4 && (
              <>
                <div>
                  <div className="text-sm font-semibold">Destination types, ranked</div>
                  <p className="text-xs text-muted">Tap in order: first tap = favourite. Tap again to remove.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DESTINATION_TYPES.map((t) => {
                      const rank = p.destinationTypesRanked.indexOf(t.id);
                      return (
                        <Chip
                          key={t.id}
                          selected={rank >= 0}
                          badge={rank >= 0 ? rank + 1 : undefined}
                          onClick={() => set("destinationTypesRanked", toggle(p.destinationTypesRanked, t.id))}
                        >
                          <span aria-hidden>{t.emoji}</span> {t.label}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
                <ChipGroup label="Vibe" options={VIBES} value={p.vibe} onChange={(v) => set("vibe", v)} />
                <ChipGroup label="Pace" options={PACES} value={p.pace} onChange={(v) => set("pace", v)} />
                <ChipGroup label="Stay style" options={STAY_STYLES} value={p.stayStyle} onChange={(v) => set("stayStyle", v)} />
              </>
            )}

            {step === 5 && (
              <>
                <label className="block text-sm font-semibold">
                  Places you&apos;d love to go
                  <textarea
                    className={cx(field, "min-h-24")}
                    maxLength={FREE_TEXT_MAX}
                    value={p.placesWishlist}
                    onChange={(e) => set("placesWishlist", e.target.value)}
                    placeholder="Gokarna, Spiti, that café in Kasol…"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Anything else
                  <textarea
                    className={cx(field, "min-h-24")}
                    maxLength={FREE_TEXT_MAX}
                    value={p.anythingElse}
                    onChange={(e) => set("anythingElse", e.target.value)}
                    placeholder="Allergies, a wedding on the 15th, I get motion sick…"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-cream px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {error && <p className="mb-2 rounded-xl bg-fit-low/10 px-3 py-2 text-sm text-fit-low">{error}</p>}
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="soft" type="button" onClick={() => (setError(null), setStep(step - 1))}>
                ← Back
              </Button>
            )}
            <Button type="button" className="flex-1 text-lg" onClick={next} disabled={busy}>
              {step < STEPS.length - 1 ? "Next →" : busy ? "Saving…" : props.isEdit ? "Save changes ✓" : "Done, count me in! 🎉"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(TRIP_DAYS.min, Math.min(TRIP_DAYS.max, v));
  return (
    <div className="rounded-2xl bg-paper p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-center justify-between">
        <button type="button" className="h-10 w-10 rounded-full bg-line text-xl font-bold" onClick={() => onChange(clamp(value - 1))} aria-label={`Decrease ${label}`}>
          −
        </button>
        <span className="font-display text-2xl font-bold">{value}</span>
        <button type="button" className="h-10 w-10 rounded-full bg-line text-xl font-bold" onClick={() => onChange(clamp(value + 1))} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

function RangeSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mt-3 block text-xs text-muted">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-semibold text-ink">{inr(value)}</span>
      </span>
      <input
        type="range"
        className="mt-1 w-full"
        min={BUDGET.min}
        max={BUDGET.max}
        step={BUDGET.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string; emoji: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.id} selected={value === o.id} onClick={() => onChange(o.id)}>
            <span aria-hidden>{o.emoji}</span> {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
