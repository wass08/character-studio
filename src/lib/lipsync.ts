"use client";

import { Lipsync } from "wawa-lipsync";

let instance: Lipsync | null = null;

/**
 * Singleton Lipsync. We reuse one AudioContext across audio elements so the
 * browser doesn't choke on repeated context creation, and so any frame loop
 * inside the canvas can poll it safely.
 */
export const getLipsync = (): Lipsync | null => {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new Lipsync();
  return instance;
};
