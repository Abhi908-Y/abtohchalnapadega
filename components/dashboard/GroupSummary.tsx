import { formatRange } from "@/lib/engine/dateUtils";
import type { Constraints } from "@/lib/types";
import { Card, Tag, inr } from "../ui";

function Row({ icon, label, value, warn }: { icon: string; label: string; value: string; warn?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="font-semibold">{value}</div>
        {warn && <div className="text-sm text-[#b4480b]">⚠️ {warn}</div>}
      </div>
    </div>
  );
}

const names = (list: string[]) => list.join(", ");

export function GroupSummary({ c }: { c: Constraints }) {
  const n = c.people.length;
  return (
    <Card>
      <h2 className="font-display text-xl font-bold">Group ka scene</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Row
          icon="💰"
          label={c.budget.full ? "Common budget" : "Budget that works for most"}
          value={`${inr(c.budget.min)} – ${inr(c.budget.max)} per person`}
          warn={c.budget.full ? undefined : `Works for ${c.budget.included.length} of ${n}. ${names(c.budget.leftOut)} outside it`}
        />
        <Row
          icon="📅"
          label={c.dates?.full ? "Dates that work for everyone" : "Best dates"}
          value={c.dates ? `${formatRange(c.dates.start, c.dates.end)} (${c.dates.days} days)` : "No overlap yet"}
          warn={
            c.dates && !c.dates.full
              ? `Works for ${c.dates.included.length} of ${n}. ${names(c.dates.leftOut)} can't make it`
              : c.dates && !c.dates.longEnough
                ? `Shorter than the ${c.tripLength.min}-day minimum`
                : undefined
          }
        />
        <Row
          icon="⏱"
          label="Trip length"
          value={c.tripLength.min === c.tripLength.max ? `${c.tripLength.min} days` : `${c.tripLength.min}–${c.tripLength.max} days`}
          warn={c.tripLength.full ? undefined : `${names(c.tripLength.leftOut)} wanted a different length`}
        />
        <div className="flex gap-3">
          <span className="text-xl" aria-hidden>
            🚫
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Dealbreakers</div>
            {c.dealbreakers.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {c.dealbreakers.map((d) => (
                  <Tag key={d.id}>
                    {d.label} <span className="text-muted">· {names(d.by)}</span>
                  </Tag>
                ))}
              </div>
            ) : (
              <div className="font-semibold">None. Sab chalega!</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
