"use client";

import { useMemo, useSyncExternalStore } from "react";

// Per-browser edit identity. localStorage can be unavailable (private mode,
// in-app browsers), so every access is guarded.

export interface Identity {
  participantId: string;
  editToken: string;
}

const key = (slug: string) => `atcp:trip:${slug}`;
const EVENT = "atcp-identity";

function read(slug: string): string | null {
  try {
    return localStorage.getItem(key(slug));
  } catch {
    return null;
  }
}

export function saveIdentity(slug: string, id: Identity) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(id));
  } catch {
    /* ignore: user just can't edit later from this browser */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** This browser's identity for a trip; null on the server and before joining. */
export function useIdentity(slug: string): Identity | null {
  const raw = useSyncExternalStore(subscribe, () => read(slug), () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Identity;
    } catch {
      return null;
    }
  }, [raw]);
}
