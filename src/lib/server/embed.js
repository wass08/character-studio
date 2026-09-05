// Server side of the embed contract: guest-owned characters and the claim
// funnel. Guests never talk to PocketBase directly — every write goes through
// /api/embed/* with a guest token, and this module validates the payload,
// enforces ownership via a stored token hash, and uses the superuser client.
// Server-only (imports superuser credentials).

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { enqueueCharacterBake } from "@/lib/bakeJobs";
import {
  EMBED_GENDERS,
  GUEST_TOKEN_HEADER,
  GUEST_TOKEN_PATTERN,
} from "@/lib/embed/contract";
import { getSuperuserPb } from "./modelResolver";

const CHARACTERS = "CharacterStudioCharacters";
export const CLAIM_CODE_TTL_MS = 15 * 60 * 1000;
const CLAIM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CLAIM_CODE_LENGTH = 10;

const NAME_MAX = 60;
const POSE_MAX = 80;
const CUSTOMIZATION_MAX_SLOTS = 40;
const MORPH_MAX_KEYS = 256;
const THUMBNAIL_MAX_BYTES = 3 * 1024 * 1024;
const RECORD_ID = /^[a-z0-9]{15}$/;
const HEX_COLOR = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i;

export class EmbedError extends Error {
  constructor(status, message, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function hashSecret(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// Route handlers buffer multipart bodies in memory; refuse oversized uploads
// before parsing (thumbnail ≤ 3 MB + a few KB of JSON is the legitimate max).
const MAX_BODY_BYTES = 4 * 1024 * 1024;
export function assertBodySize(req) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    throw new EmbedError(413, "Request body is too large", "payload_too_large");
  }
}

/** The guest token from the request header, validated for shape. */
export function guestTokenFrom(req) {
  const token = req.headers.get(GUEST_TOKEN_HEADER)?.trim();
  if (!token || !GUEST_TOKEN_PATTERN.test(token)) {
    throw new EmbedError(
      401,
      "Missing or malformed guest token",
      "unauthorized",
    );
  }
  return token;
}

/** Load a guest character and prove the caller owns it. */
export async function loadOwnedGuestCharacter(pb, characterId, token) {
  if (!RECORD_ID.test(characterId)) {
    throw new EmbedError(404, "Character not found", "not_found");
  }
  let record;
  try {
    record = await pb.collection(CHARACTERS).getOne(characterId, {
      requestKey: null,
    });
  } catch {
    throw new EmbedError(404, "Character not found", "not_found");
  }
  if (
    !record.guest ||
    !safeEqualHex(record.guestTokenHash, hashSecret(token))
  ) {
    throw new EmbedError(
      403,
      "This character belongs to someone else",
      "forbidden",
    );
  }
  return record;
}

// --- payload validation ------------------------------------------------------

function parseJsonField(formData, name) {
  const raw = formData.get(name);
  if (raw == null || raw === "") return undefined;
  if (typeof raw !== "string")
    throw new EmbedError(400, `${name} must be JSON`);
  try {
    return JSON.parse(raw);
  } catch {
    throw new EmbedError(400, `${name} is not valid JSON`);
  }
}

function validateCustomization(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EmbedError(400, "customization must be an object");
  }
  const entries = Object.entries(value);
  if (entries.length > CUSTOMIZATION_MAX_SLOTS) {
    throw new EmbedError(400, "customization has too many slots");
  }
  const out = {};
  for (const [category, slot] of entries) {
    if (typeof category !== "string" || category.length > 60) {
      throw new EmbedError(400, "customization has an invalid category name");
    }
    const assetId = slot?.assetId ?? null;
    if (
      assetId !== null &&
      !(typeof assetId === "string" && RECORD_ID.test(assetId))
    ) {
      throw new EmbedError(400, `customization.${category}.assetId is invalid`);
    }
    const color = slot?.color ?? null;
    if (
      color !== null &&
      !(typeof color === "string" && HEX_COLOR.test(color))
    ) {
      throw new EmbedError(400, `customization.${category}.color is invalid`);
    }
    const colors = {};
    for (const [key, hex] of Object.entries(slot?.colors || {})) {
      if (
        typeof key !== "string" ||
        key.length > 60 ||
        typeof hex !== "string" ||
        !HEX_COLOR.test(hex)
      ) {
        throw new EmbedError(
          400,
          `customization.${category}.colors is invalid`,
        );
      }
      colors[key] = hex;
    }
    out[category] = { assetId, color, colors };
  }
  return out;
}

function validateMorphValues(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EmbedError(400, "morphValues must be an object");
  }
  const entries = Object.entries(value);
  if (entries.length > MORPH_MAX_KEYS) {
    throw new EmbedError(400, "morphValues has too many keys");
  }
  const out = {};
  for (const [key, weight] of entries) {
    if (
      typeof key !== "string" ||
      key.length > 80 ||
      typeof weight !== "number" ||
      !Number.isFinite(weight)
    ) {
      throw new EmbedError(400, "morphValues contains an invalid entry");
    }
    out[key] = Math.min(2, Math.max(-1, weight));
  }
  return out;
}

/**
 * Validate the multipart body the store sends (same fields as a logged-in
 * save) and return { fields, thumbnail }. `partial` allows omitting fields on
 * update; a create needs gender + customization.
 */
export function parseCharacterForm(formData, { partial = false } = {}) {
  const fields = {};

  const name = formData.get("name");
  if (name != null && name !== "") {
    if (typeof name !== "string") throw new EmbedError(400, "name is invalid");
    fields.name = name.trim().slice(0, NAME_MAX) || "Untitled";
  } else if (!partial) {
    fields.name = "Untitled";
  }

  const gender = formData.get("gender");
  if (gender != null && gender !== "") {
    if (!EMBED_GENDERS.includes(gender))
      throw new EmbedError(400, "gender is invalid");
    fields.gender = gender;
  } else if (!partial) {
    throw new EmbedError(400, "gender is required");
  }

  const height = formData.get("height");
  if (height != null && height !== "") {
    const parsed = Number(height);
    if (!Number.isFinite(parsed))
      throw new EmbedError(400, "height is invalid");
    fields.height = Math.min(2, Math.max(0.5, parsed));
  }

  const pose = formData.get("pose");
  if (pose != null && pose !== "") {
    if (typeof pose !== "string" || pose.length > POSE_MAX)
      throw new EmbedError(400, "pose is invalid");
    fields.pose = pose;
  }

  const customization = validateCustomization(
    parseJsonField(formData, "customization"),
  );
  if (customization) fields.customization = customization;
  else if (!partial) throw new EmbedError(400, "customization is required");

  const morphValues = validateMorphValues(
    parseJsonField(formData, "morphValues"),
  );
  if (morphValues) fields.morphValues = morphValues;

  let thumbnail = null;
  const file = formData.get("thumbnail");
  if (
    file &&
    typeof file === "object" &&
    typeof file.arrayBuffer === "function"
  ) {
    if (file.size > THUMBNAIL_MAX_BYTES)
      throw new EmbedError(400, "thumbnail is too large");
    if (file.type && !/^image\/(png|jpeg|webp)$/.test(file.type)) {
      throw new EmbedError(400, "thumbnail must be a PNG, JPEG or WebP image");
    }
    thumbnail = file;
  }

  return { fields, thumbnail };
}

// --- persistence -------------------------------------------------------------

function toPocketBaseForm(fields, thumbnail, extra) {
  const body = new FormData();
  for (const [key, value] of Object.entries({ ...fields, ...extra })) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) body.append(key, "");
      for (const item of value) body.append(key, item);
    } else if (value !== null && typeof value === "object") {
      body.append(key, JSON.stringify(value));
    } else {
      body.append(key, String(value));
    }
  }
  if (thumbnail) body.append("thumbnail", thumbnail, `thumb_${Date.now()}.png`);
  return body;
}

function usedAssetsOf(customization) {
  return [
    ...new Set(
      Object.values(customization || {})
        .map((slot) => slot?.assetId)
        .filter(Boolean),
    ),
  ];
}

/** Public projection of a character record for embed responses. */
export function publicCharacter(record) {
  return {
    id: record.id,
    name: record.name,
    gender: record.gender,
    height: record.height,
    pose: record.pose,
    guest: !!record.guest,
    latestBake: record.latestBake || null,
    bakeStale: !!record.bakeStale,
    created: record.created,
    updated: record.updated,
  };
}

export async function createGuestCharacter({ token, fields, thumbnail }) {
  const pb = await getSuperuserPb();
  const body = toPocketBaseForm(fields, thumbnail, {
    guest: true,
    guestTokenHash: hashSecret(token),
    usedAssets: usedAssetsOf(fields.customization),
    bakeStale: true,
    hidden: false,
  });
  const record = await pb
    .collection(CHARACTERS)
    .create(body, { requestKey: null });
  // Eager default bake so the host gets a URL within seconds of "Done".
  enqueueCharacterBake(pb, record.id);
  return record;
}

export async function updateGuestCharacter({
  token,
  characterId,
  fields,
  thumbnail,
}) {
  const pb = await getSuperuserPb();
  const existing = await loadOwnedGuestCharacter(pb, characterId, token);
  const customization = fields.customization ?? existing.customization;
  const body = toPocketBaseForm(fields, thumbnail, {
    usedAssets: usedAssetsOf(customization),
    bakeStale: true,
  });
  const record = await pb.collection(CHARACTERS).update(existing.id, body, {
    requestKey: null,
  });
  enqueueCharacterBake(pb, record.id);
  return record;
}

// --- claim funnel ------------------------------------------------------------

export function generateClaimCode() {
  const bytes = randomBytes(CLAIM_CODE_LENGTH);
  return Array.from(
    bytes,
    (b) => CLAIM_CODE_ALPHABET[b % CLAIM_CODE_ALPHABET.length],
  ).join("");
}

export function normalizeClaimCode(code) {
  const normalized = String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (normalized.length !== CLAIM_CODE_LENGTH) {
    throw new EmbedError(400, "Claim code is invalid", "invalid_code");
  }
  return normalized;
}

/** Mint a single-use claim code for a guest character the caller owns. */
export async function issueClaimCode({ token, characterId }) {
  const pb = await getSuperuserPb();
  const record = await loadOwnedGuestCharacter(pb, characterId, token);
  const code = generateClaimCode();
  const expires = new Date(Date.now() + CLAIM_CODE_TTL_MS);
  await pb
    .collection(CHARACTERS)
    .update(
      record.id,
      { claimCodeHash: hashSecret(code), claimExpires: expires.toISOString() },
      { requestKey: null },
    );
  return { code, expiresAt: expires.toISOString(), characterId: record.id };
}

/** Resolve the signed-in user behind a PocketBase auth token. */
export async function userFromAuthHeader(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token)
    throw new EmbedError(401, "Sign in to claim a character", "unauthorized");
  const userPb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
  userPb.autoCancellation(false);
  userPb.authStore.save(token, null);
  try {
    const auth = await userPb
      .collection("users")
      .authRefresh({ requestKey: null });
    return auth.record;
  } catch {
    throw new EmbedError(
      401,
      "Your session has expired, sign in again",
      "unauthorized",
    );
  }
}

/** Attach the guest character behind `code` to `user`. Single use. */
export async function claimCharacter({ code, user }) {
  const pb = await getSuperuserPb();
  const normalized = normalizeClaimCode(code);
  let record;
  try {
    record = await pb.collection(CHARACTERS).getFirstListItem(
      pb.filter("claimCodeHash = {:hash} && guest = true", {
        hash: hashSecret(normalized),
      }),
      { requestKey: null },
    );
  } catch {
    throw new EmbedError(
      404,
      "This claim code is invalid or was already used",
      "invalid_code",
    );
  }
  if (
    !record.claimExpires ||
    new Date(record.claimExpires).getTime() < Date.now()
  ) {
    throw new EmbedError(
      410,
      "This claim code has expired, generate a new one from the creator",
      "expired_code",
    );
  }
  const updated = await pb.collection(CHARACTERS).update(
    record.id,
    {
      user: user.id,
      guest: false,
      guestTokenHash: "",
      claimCodeHash: "",
      claimExpires: "",
    },
    { requestKey: null },
  );
  return updated;
}

// --- HTTP helpers for the /api/embed routes ----------------------------------

export const EMBED_RATE_LIMITS = Object.freeze({
  create: { limit: 10, scope: "embed-create" },
  write: { limit: 60, scope: "embed" },
});

export function embedJson(body, status = 200, headers = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function embedError(error) {
  if (error instanceof EmbedError) {
    return embedJson({ error: error.message, code: error.code }, error.status);
  }
  // PocketBase validation errors carry field details worth surfacing.
  const detail = error?.response?.data
    ? Object.entries(error.response.data)
        .map(([field, info]) => `${field}: ${info?.message || "invalid"}`)
        .join("; ")
    : null;
  console.error("[embed] unexpected error", error);
  return embedJson(
    { error: detail || "Something went wrong", code: "internal" },
    detail ? 400 : 500,
  );
}

export function rateLimited(limit) {
  return embedJson({ error: "Too many requests", code: "rate_limited" }, 429, {
    "Retry-After": String(limit.retryAfter),
  });
}
