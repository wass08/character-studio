"use client";

import { toast as sonnerToast } from "sonner";

/**
 * Thin re-export shim — the previous bespoke implementation built a
 * custom Zustand store on top of Radix Toast. Sonner's `toast` API
 * matches the call-site contract exactly (`toast(message)`,
 * `toast.success(message)`, `toast.error(message)`, plus an optional
 * `opts` second argument), so callers keep importing from this path
 * and get sonner under the hood.
 *
 * The `Toaster` (portal mount) lives in `src/app/layout.js` via
 * `@/components/ui/sonner`. The previous `ToastProvider` wrapper is
 * gone — the layout mounts the Toaster as a sibling instead.
 */
export const toast = sonnerToast;
