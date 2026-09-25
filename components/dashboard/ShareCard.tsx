"use client";

import { useState } from "react";
import { whatsAppLink } from "@/lib/share/whatsappMessage";
import { Button, Card, buttonClass } from "../ui";

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the old-school way */
  }
  // Fallback for older phones / in-app browsers
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ShareCard({ message }: { message: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const ok = await copyText(message);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <Card className="border-whatsapp/30">
      <h2 className="font-display text-xl font-bold">Share with the group</h2>
      <p className="text-sm text-muted">Updates live. Nothing is sent until you paste or tap send yourself.</p>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#e7f7ef] p-3 font-sans text-[14px] leading-relaxed text-ink">
        {message}
      </pre>
      {state === "failed" && <p className="mt-2 text-sm text-fit-low">Couldn&apos;t copy automatically. Long-press the message above to copy it.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={copy}>
          {state === "copied" ? "Copied ✓" : "📋 Copy message"}
        </Button>
        <a href={whatsAppLink(message)} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp")}>
          Open in WhatsApp
        </a>
      </div>
    </Card>
  );
}
