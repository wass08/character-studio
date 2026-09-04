// Server-side helpers for the parametric model-serving routes
// (/api/models/c/[id] and /api/models/b/[bakeId]). Server-only: uses
// PocketBase superuser credentials — never import from client code.

import PocketBase from "pocketbase";
import { variantObjectKey } from "@/lib/bake/params";

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
};

// Superuser client for SWR enqueues and externallyDelivered marking. Reads of
// characters/bakes would pass on public rules, but one privileged client
// keeps the route logic uniform. Cached per server process; re-authed lazily.
let superuserPb = null;
let superuserAuthPromise = null;
export async function getSuperuserPb() {
  if (!superuserPb) {
    superuserPb = new PocketBase(required("NEXT_PUBLIC_POCKETBASE_URL"));
    superuserPb.autoCancellation(false);
  }
  if (!superuserPb.authStore.isValid) {
    superuserAuthPromise ??= superuserPb
      .collection("_superusers")
      .authWithPassword(
        required("POCKETBASE_EMAIL"),
        required("POCKETBASE_PASSWORD"),
      )
      .finally(() => {
        superuserAuthPromise = null;
      });
    await superuserAuthPromise;
  }
  return superuserPb;
}

export function publicR2Url(key) {
  let base = required("R2_PUBLIC_URL").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/${key}`;
}

/** URL for a variant if the bake record says it exists, else null. */
export function variantUrl(bake, variantKey) {
  if (!bake || bake.status !== "ready") return null;
  const variant = bake.variants?.[variantKey];
  if (!variant) return null;
  return publicR2Url(variant.key || variantObjectKey(bake.bakeId, variantKey));
}

/**
 * Cold-path hold-open: poll `fetchBake` until it returns a bake containing
 * the variant, or time out. DB-polling instead of a direct worker RPC keeps
 * the resolver decoupled from worker deployment (they only share PocketBase).
 * ~20s ceiling per the serving contract — GLTFLoader callers just see a slow
 * response, never a 202/polling dance.
 */
export async function waitForVariant(
  fetchBake,
  variantKey,
  { timeoutMs = 20000, intervalMs = 1500 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const bake = await fetchBake().catch(() => null);
    const url = variantUrl(bake, variantKey);
    if (url) return { bake, url };
    if (Date.now() + intervalMs > deadline)
      return { bake: bake || null, url: null };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// Naive per-IP sliding-window rate limit. In-memory is fine for the current
// single-instance deployment; swap for something shared before scaling out.
const RATE_LIMIT = 120; // requests
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map();
export function checkRateLimit(req) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
    if (rateBuckets.size > 10_000) {
      for (const [k, v] of rateBuckets) {
        if (now - v.windowStart > RATE_WINDOW_MS) rateBuckets.delete(k);
      }
    }
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    return {
      ok: false,
      retryAfter: Math.ceil((bucket.windowStart + RATE_WINDOW_MS - now) / 1000),
    };
  }
  return { ok: true };
}
