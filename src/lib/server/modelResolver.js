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

// Naive per-IP fixed-window rate limit. In-memory is fine for the current
// single-instance deployment; swap for something shared before scaling out.
// `scope` keeps independent counters per route family (model serving vs
// embed writes) so a busy wall page can't starve guest saves and vice versa.
const RATE_LIMIT = 120; // requests per window, default scope
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map();
export function requestIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
export function checkRateLimit(
  req,
  { limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS, scope = "models" } = {},
) {
  const key = `${scope}:${requestIp(req)}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    rateBuckets.set(key, { windowStart: now, count: 1 });
    if (rateBuckets.size > 10_000) {
      for (const [k, v] of rateBuckets) {
        if (now - v.windowStart > windowMs) rateBuckets.delete(k);
      }
    }
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((bucket.windowStart + windowMs - now) / 1000),
    };
  }
  return { ok: true };
}
