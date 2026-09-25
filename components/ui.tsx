import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const inrShort = (n: number) => (n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `₹${n}`);

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-3xl border border-line bg-paper p-4 shadow-[0_2px_0_#f0e2cf] sm:p-5", className)}>{children}</section>;
}

type Variant = "primary" | "ghost" | "whatsapp" | "soft";

export function buttonClass(variant: Variant = "primary", className?: string) {
  const styles = {
    primary: "bg-saffron text-white shadow-[0_3px_0_var(--saffron-deep)] active:translate-y-[2px] active:shadow-none",
    whatsapp: "bg-whatsapp text-white shadow-[0_3px_0_#1a9e4b] active:translate-y-[2px] active:shadow-none",
    soft: "bg-[#fff0dd] text-ink",
    ghost: "bg-transparent text-muted underline-offset-2 hover:underline",
  }[variant];
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    styles,
    className,
  );
}

export function Button({ variant, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function Chip({
  selected,
  onClick,
  children,
  badge,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "relative inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
        selected ? "border-saffron bg-saffron text-white" : "border-line bg-paper text-ink hover:border-saffron/50",
      )}
    >
      {badge != null && (
        <span className={cx("grid h-5 w-5 place-items-center rounded-full text-xs font-bold", selected ? "bg-white text-saffron" : "bg-line")}>
          {badge}
        </span>
      )}
      {children}
    </button>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "good" | "brand" }) {
  const t = {
    neutral: "bg-[#fbf1e3] text-ink",
    warn: "bg-[#fff1e6] text-[#b4480b]",
    good: "bg-[#e7f7ef] text-[#0f7a46]",
    brand: "bg-saffron/10 text-saffron-deep",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={cx("font-display font-extrabold leading-none tracking-tight text-ink", small ? "text-lg" : "text-3xl")}>
      Ab Toh <span className="text-saffron">Chalna</span> Padega <span aria-hidden>🛺</span>
    </span>
  );
}
