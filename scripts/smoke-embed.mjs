// Round-trip smoke test for the embed contract against a running app:
// guest create → ownership checks → bake manifest → claim code → claim as a
// signed-in user (superuser impersonation) → cleanup.
//
//   npm run embed:smoke                       # against http://localhost:3000
//   BASE_URL=https://characterstudio.wawasensei.dev npm run embed:smoke
//
// Needs the superuser credentials from .env (impersonation + cleanup). It
// writes real records (a guest character and its bake) and deletes the
// character at the end; the bake stays, like any other immutable bake.

import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import PocketBase from "pocketbase";
import { GUEST_TOKEN_HEADER } from "../src/lib/embed/contract.js";

dotenv.config();

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const SEED_CHARACTER = process.env.SEED_CHARACTER || "o7kdxx5sgc46tqe";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const pb = new PocketBase(required("NEXT_PUBLIC_POCKETBASE_URL"));
pb.autoCancellation(false);
await pb
  .collection("_superusers")
  .authWithPassword(
    required("POCKETBASE_EMAIL"),
    required("POCKETBASE_PASSWORD"),
  );

// A real recipe to bake: borrow the seed character's customization.
const seed = await pb
  .collection("CharacterStudioCharacters")
  .getOne(SEED_CHARACTER, { requestKey: null });
const token = randomBytes(24).toString("hex");
const headers = { [GUEST_TOKEN_HEADER]: token };

const form = () => {
  const body = new FormData();
  body.append("name", "Embed smoke test");
  body.append("gender", seed.gender);
  body.append("height", String(seed.height ?? 1));
  body.append("pose", "Rig|Idle_Loop");
  body.append("customization", JSON.stringify(seed.customization));
  body.append("morphValues", JSON.stringify(seed.morphValues || {}));
  return body;
};

let characterId = null;
try {
  // 1. Guest create + ownership rules.
  const noToken = await fetch(`${BASE_URL}/api/embed/characters`, {
    method: "POST",
    body: form(),
  });
  check("create without a guest token is refused", noToken.status === 401);

  const created = await fetch(`${BASE_URL}/api/embed/characters`, {
    method: "POST",
    headers,
    body: form(),
  });
  const createdBody = await created.json();
  check(
    "guest create",
    created.status === 201 && createdBody.guest === true,
    `${created.status} ${createdBody.error || createdBody.id}`,
  );
  characterId = createdBody.id;
  if (!characterId) throw new Error("no character id, aborting");

  const wrong = await fetch(`${BASE_URL}/api/embed/characters/${characterId}`, {
    headers: { [GUEST_TOKEN_HEADER]: randomBytes(24).toString("hex") },
  });
  check("another token cannot read the guest record", wrong.status === 403);

  const patch = await fetch(`${BASE_URL}/api/embed/characters/${characterId}`, {
    method: "PATCH",
    headers,
    body: (() => {
      const b = new FormData();
      b.append("name", "Embed smoke test (renamed)");
      return b;
    })(),
  });
  check("owner can update", patch.status === 200);

  const publicView = await pb
    .collection("CharacterStudioCharacters")
    .getOne(characterId, { requestKey: null });
  check(
    "record is a guest without an owner",
    publicView.guest === true && !publicView.user,
  );
  const anon = new PocketBase(required("NEXT_PUBLIC_POCKETBASE_URL"));
  const anonView = await anon
    .collection("CharacterStudioCharacters")
    .getOne(characterId, { requestKey: null });
  check(
    "token and claim hashes never leave PocketBase",
    !("guestTokenHash" in anonView) && !("claimCodeHash" in anonView),
  );
  const listed = await anon
    .collection("CharacterStudioCharacters")
    .getList(1, 1, {
      filter: `id = "${characterId}" && guest != true`,
      requestKey: null,
    });
  check(
    "guest is excluded by the public listing filter",
    listed.totalItems === 0,
  );

  // 2. Bake + manifest (cold path through the worker).
  const started = Date.now();
  const manifestResponse = await fetch(
    `${BASE_URL}/api/models/c/${characterId}.json`,
    { cache: "no-store" },
  );
  const manifest = await manifestResponse.json().catch(() => ({}));
  check(
    "manifest served after the bake",
    manifestResponse.status === 200 && !!manifest.bakeId,
    `${manifestResponse.status} in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  if (manifest.urls?.model) {
    const glb = await fetch(manifest.urls.model, { redirect: "manual" });
    check("pinned model URL redirects to the CDN", glb.status === 302);
  }

  // 3. Claim funnel.
  const codeResponse = await fetch(
    `${BASE_URL}/api/embed/characters/${characterId}/claim-code`,
    { method: "POST", headers },
  );
  const codeBody = await codeResponse.json();
  check(
    "claim code issued",
    codeResponse.status === 200 && /^[A-Z2-9]{10}$/.test(codeBody.code || ""),
    codeBody.claimUrl,
  );

  const unauth = await fetch(`${BASE_URL}/api/embed/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: codeBody.code }),
  });
  check("claim without a session is refused", unauth.status === 401);

  const userId =
    process.env.SMOKE_USER_ID ||
    seed.user ||
    (await pb.collection("users").getFirstListItem("", { requestKey: null }))
      .id;
  const impersonated = await pb
    .collection("users")
    .impersonate(userId, 600, { requestKey: null });
  const claim = await fetch(`${BASE_URL}/api/embed/claim`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${impersonated.authStore.token}`,
    },
    body: JSON.stringify({ code: codeBody.code.toLowerCase() }),
  });
  const claimBody = await claim.json();
  check(
    "claim attaches the character to the user",
    claim.status === 200 && claimBody.character?.guest === false,
    `${claim.status} ${claimBody.error || ""}`,
  );
  const after = await pb
    .collection("CharacterStudioCharacters")
    .getOne(characterId, { requestKey: null });
  check(
    "owner set, guest cleared, code consumed",
    after.user === userId && after.guest === false && !after.claimCodeHash,
  );

  const reuse = await fetch(`${BASE_URL}/api/embed/claim`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${impersonated.authStore.token}`,
    },
    body: JSON.stringify({ code: codeBody.code }),
  });
  check("a consumed code cannot be reused", reuse.status === 404);

  const staleToken = await fetch(
    `${BASE_URL}/api/embed/characters/${characterId}`,
    { headers },
  );
  check(
    "guest token no longer works after the claim",
    staleToken.status === 403,
  );
} finally {
  if (characterId) {
    await pb
      .collection("CharacterStudioCharacters")
      .delete(characterId, { requestKey: null })
      .then(() => console.log(`cleaned up ${characterId}`))
      .catch((e) => console.warn(`cleanup failed: ${e?.message || e}`));
  }
}

console.log(
  failures === 0 ? "All checks passed." : `${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
