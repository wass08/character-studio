// The embed contract shared by the iframe (client), the host-facing docs and
// the server routes. Client-safe: no server imports.
//
// Host page  <--postMessage--  /embed iframe
//   cs.v1.ready                { type, version }
//   cs.v1.character.exported   { type, characterId, bakeId, name, gender,
//                                glbUrl, characterUrl, animationsUrl, manifestUrl }
//   cs.v1.error                { type, code, message }
//
// These three shapes are the only thing hosts depend on. Add fields freely;
// never rename or remove one without bumping the "cs.v1" prefix.

export const EMBED_CONTRACT_VERSION = "1";

export const EMBED_EVENTS = Object.freeze({
  ready: "cs.v1.ready",
  exported: "cs.v1.character.exported",
  error: "cs.v1.error",
});

export const EMBED_ERROR_CODES = Object.freeze({
  saveFailed: "save_failed",
  bakeTimeout: "bake_timeout",
  rateLimited: "rate_limited",
});

// Guests identify themselves to /api/embed/* with a self-issued random token
// sent in this header. The server stores a hash; the token itself only lives
// in the iframe's sessionStorage (partitioned per host by the browser).
export const GUEST_TOKEN_HEADER = "x-cs-guest-token";
export const GUEST_TOKEN_STORAGE_KEY = "cs.embed.guestToken";
export const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export const EMBED_GENDERS = Object.freeze(["man", "woman"]);

export function createGuestToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Where the iframe is allowed to post messages. Hosts pass their own origin
 * as `?origin=`; without it (or with garbage) we fall back to "*" — the
 * payload is public data (URLs), so the cost of a wildcard is only that a
 * nested iframe could observe it.
 */
export function resolveHostOrigin(originParam) {
  if (!originParam) return "*";
  try {
    const url = new URL(originParam);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "*";
    return url.origin;
  } catch {
    return "*";
  }
}

export function postToHost(targetOrigin, message) {
  if (typeof window === "undefined" || window.parent === window) return false;
  window.parent.postMessage(message, targetOrigin || "*");
  return true;
}
