import { formatRange } from "@/lib/engine/dateUtils";
import type { Participant } from "@/lib/types";
import { Card, Tag, inrShort } from "../ui";

const AVATAR_COLORS = ["#ff7a1a", "#0e9f8e", "#e0457b", "#6d5dfc", "#d4a017", "#2f80ed", "#9b51e0"];
export const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

export function Avatar({ name, index, size = 36 }: { name: string; index: number; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-display font-bold text-white"
      style={{ background: avatarColor(index), width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function PeopleStrip({
  participants,
  coordinatorName,
  meId,
}: {
  participants: Participant[];
  coordinatorName: string;
  meId: string | null;
}) {
  const n = participants.length;
  return (
    <Card>
      <h2 className="font-display text-xl font-bold">
        {n} {n === 1 ? "person has" : "people have"} joined
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {participants.map((p, i) => {
          const pr = p.preferences;
          const city = pr.homeCity === "Other" ? pr.homeCityOther || "Other" : pr.homeCity;
          return (
            <li key={p.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar name={p.name} index={i} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.id === meId && <Tag tone="brand">you</Tag>}
                  {p.name === coordinatorName && <Tag>organiser</Tag>}
                  <span className="text-sm text-muted">· {city}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Tag>
                    💰 {inrShort(pr.budget.min)}–{inrShort(pr.budget.max)}
                  </Tag>
                  {pr.dateRanges.map((r, j) => (
                    <Tag key={j}>📅 {formatRange(r.start, r.end)}</Tag>
                  ))}
                  <Tag>
                    ⏱ {pr.tripDays.min === pr.tripDays.max ? pr.tripDays.min : `${pr.tripDays.min}–${pr.tripDays.max}`} days
                  </Tag>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
