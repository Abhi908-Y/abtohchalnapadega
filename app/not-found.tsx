import Link from "next/link";
import { Logo, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <Logo />
      <p className="mt-8 text-5xl" aria-hidden>
        🗺️
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold">Yeh trip toh mila hi nahi</h1>
      <p className="text-muted">Check the link from the WhatsApp group, or start a new trip.</p>
      <Link href="/" className={buttonClass("primary", "mt-6")}>
        Start a trip
      </Link>
    </main>
  );
}
