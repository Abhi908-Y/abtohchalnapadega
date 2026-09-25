import { formatRange } from "@/lib/engine/dateUtils";
import type { TripOption } from "@/lib/schemas";
import { Card, Tag, cx, inr } from "../ui";
import { Avatar } from "./People";

const MEDALS = ["🥇", "🥈", "🥉"];

function tier(score: number) {
  if (score >= 75) return { color: "var(--fit-high)", face: "😍", label: "happy" };
  if (score >= 55) return { color: "var(--fit-mid)", face: "🙂", label: "okay" };
  if (score >= 40) return { color: "var(--fit-mid)", face: "😐", label: "compromising" };
  return { color: "var(--fit-low)", face: "😬", label: "compromising" };
}

export function OptionCard({
  option,
  rank,
  order,
}: {
  option: TripOption;
  rank: number;
  /** Participant names in join order, so fit rows line up across cards. */
  order: string[];
}) {
  const c = option.cost_breakdown;
  const parts = [
    { key: "Travel", v: c.travel, color: "var(--teal)" },
    { key: "Stay", v: c.stay, color: "var(--saffron)" },
    { key: "Food & fun", v: c.food_activities, color: "var(--berry)" },
  ];
  const fits = [...option.per_person].sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const happy = fits.filter((f) => f.score >= 55).length;
  const compromising = fits.length - happy;

  return (
    <Card className={cx("pop-in", rank === 0 && "border-saffron/40 ring-2 ring-saffron/15")}>
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none" aria-label={`Rank ${rank + 1}`}>
          {MEDALS[rank]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-bold leading-tight">{option.destination}</h3>
          <div className="text-sm text-muted">{option.state}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-bold leading-tight">{inr(c.total)}</div>
          <div className="text-xs text-muted">per person</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag tone="brand">
          📅 {formatRange(option.dates.start, option.dates.end)} · {option.days} {option.days === 1 ? "day" : "days"}
        </Tag>
        <Tag tone="good">😊 {happy} happy</Tag>
        {compromising > 0 && <Tag tone="warn">😬 {compromising} compromising</Tag>}
      </div>

      {option.flags?.length ? (
        <div className="mt-3 rounded-2xl bg-fit-low/10 px-3 py-2 text-sm text-fit-low">⚠️ {option.flags.join(" · ")}</div>
      ) : null}

      {/* Cost breakdown */}
      <div className="mt-4">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
          {parts.map((p) => (
            <div key={p.key} style={{ width: `${(p.v / Math.max(1, c.total)) * 100}%`, background: p.color }} />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {parts.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.key} <span className="font-semibold text-ink">{inr(p.v)}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed">{option.why}</p>

      {/* Fit rows: the most important part */}
      <div className="mt-4 rounded-2xl bg-cream p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Kaun kitna khush?</div>
        <ul className="space-y-3">
          {fits.map((f) => {
            const t = tier(f.score);
            const idx = order.indexOf(f.name);
            return (
              <li key={f.name}>
                <div className="flex items-center gap-2">
                  <Avatar name={f.name} index={idx < 0 ? 0 : idx} size={24} />
                  <span className="w-20 truncate text-sm font-semibold sm:w-24">{f.name}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.score}%`, background: t.color }} />
                  </div>
                  <span className="w-8 text-right font-display text-lg font-bold tabular-nums" style={{ color: t.color }}>
                    {f.score}
                  </span>
                  <span className="w-6 text-center text-lg" title={t.label} aria-label={t.label}>
                    {t.face}
                  </span>
                </div>
                <p className="mt-0.5 pl-8 text-[13px] leading-snug text-muted">{f.reason}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {option.weakest_for?.name && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Sabse bada compromise: {option.weakest_for.name}</span>
          <span className="text-muted">. {option.weakest_for.reason}</span>
        </p>
      )}
    </Card>
  );
}

export function OptionSkeleton() {
  return (
    <Card>
      <div className="shimmer h-7 w-2/3 rounded-xl" />
      <div className="shimmer mt-3 h-4 w-1/2 rounded-xl" />
      <div className="shimmer mt-5 h-24 rounded-2xl" />
    </Card>
  );
}
