/**
 * One-off schema migration for the Studio hub:
 *   - Opens up Character list/view to public so the living wall and
 *     /c/:id pages can render.
 *   - Adds `featured` and `hidden` flags on CharacterStudioCharacters.
 *   - Adds `displayUsername` on `users` for public author labels.
 *   - Creates `CharacterStudioVoicePresets` (audio + label + gender)
 *     used by /play/lipsync.
 *
 * Safe to re-run.
 *
 * Run with: node scripts/setup-pocketbase.js
 */

import "dotenv/config";
import PocketBase from "pocketbase";

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_EMAIL;
const password = process.env.POCKETBASE_PASSWORD;

if (!url || !email || !password) {
  throw new Error(
    "NEXT_PUBLIC_POCKETBASE_URL / POCKETBASE_EMAIL / POCKETBASE_PASSWORD must be set",
  );
}

const pb = new PocketBase(url);
await pb.collection("_superusers").authWithPassword(email, password);
console.log("Authed as superuser.");

const ensureField = (collection, field) => {
  if (collection.fields.some((f) => f.name === field.name)) return false;
  collection.fields.push(field);
  return true;
};

const setRules = (collection, rules) => {
  let changed = false;
  for (const [k, v] of Object.entries(rules)) {
    if (collection[k] !== v) {
      collection[k] = v;
      changed = true;
    }
  }
  return changed;
};

// --- CharacterStudioCharacters ----------------------------------------------
{
  const c = await pb.collections.getOne("CharacterStudioCharacters");
  let changed = false;
  changed =
    ensureField(c, {
      name: "featured",
      type: "bool",
      required: false,
    }) || changed;
  changed =
    ensureField(c, {
      name: "hidden",
      type: "bool",
      required: false,
    }) || changed;
  // Public read so anyone can browse the wall and /c/:id, but only the
  // owner can create / update / delete.
  changed =
    setRules(c, {
      listRule: "hidden != true",
      viewRule: "hidden != true",
    }) || changed;
  if (changed) {
    await pb.collections.update(c.id, c);
    console.log("Updated CharacterStudioCharacters.");
  } else {
    console.log("CharacterStudioCharacters already up to date.");
  }
}

// --- users: expose public profile labels for author chips -------------------
{
  const c = await pb.collections.getOne("users");
  // Allow public read of basic profile so we can show author handles on /c/:id.
  // (Email is gated by emailVisibility, so it stays private.)
  let changed = ensureField(c, {
    name: "displayUsername",
    type: "text",
    required: false,
  });
  changed =
    setRules(c, {
      listRule: "",
      viewRule: "",
    }) || changed;
  if (changed) {
    await pb.collections.update(c.id, c);
    console.log("Updated users profile fields/rules.");
  } else {
    console.log("users profile fields/rules already up to date.");
  }
}

// --- CharacterStudioVoicePresets --------------------------------------------
{
  let preset;
  try {
    preset = await pb.collections.getOne("CharacterStudioVoicePresets");
  } catch {
    preset = null;
  }
  if (!preset) {
    preset = await pb.collections.create({
      name: "CharacterStudioVoicePresets",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: null, // admin-only via superuser/UI
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "label", type: "text", required: true },
        {
          name: "gender",
          type: "select",
          required: false,
          maxSelect: 1,
          values: ["man", "woman", "other"],
        },
        {
          name: "audio",
          type: "file",
          required: true,
          maxSize: 10 * 1024 * 1024,
          mimeTypes: [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/webm",
            "audio/x-m4a",
            "audio/mp4",
          ],
        },
        { name: "position", type: "number", required: false },
      ],
    });
    console.log("Created CharacterStudioVoicePresets.");
  } else {
    console.log("CharacterStudioVoicePresets already exists.");
  }
}

// PocketBase ≥0.23 only adds created/updated automatically for UI-created
// collections; API-created ones must declare the autodate fields explicitly
// or filters/sorts on `created` fail with a generic 400.
const ensureTimestamps = async (name) => {
  const c = await pb.collections.getOne(name);
  let changed = false;
  changed =
    ensureField(c, {
      name: "created",
      type: "autodate",
      onCreate: true,
      onUpdate: false,
    }) || changed;
  changed =
    ensureField(c, {
      name: "updated",
      type: "autodate",
      onCreate: true,
      onUpdate: true,
    }) || changed;
  if (changed) {
    await pb.collections.update(c.id, c);
    console.log(`Added timestamps to ${name}.`);
  }
};

// --- Bake pipeline: CharacterStudioBakes + CharacterStudioBakeJobs ----------
//
// Bakes are immutable, content-addressed artifacts derived from a character
// recipe (bakeId = hash(recipe + asset versions + pipelineVersion)). The
// character's `latestBake` relation is the only mutable pointer. Jobs are a
// PB-backed queue consumed by bake-worker/; duplicate jobs are harmless
// because bakes are content-addressed (same inputs → same bakeId → no-op).
{
  const charactersCol = await pb.collections.getOne(
    "CharacterStudioCharacters",
  );
  const assetsCol = await pb.collections.getOne("CharacterStudioAssets");

  let bakes;
  try {
    bakes = await pb.collections.getOne("CharacterStudioBakes");
  } catch {
    bakes = null;
  }
  if (!bakes) {
    bakes = await pb.collections.create({
      name: "CharacterStudioBakes",
      type: "base",
      // Public read: the model resolver and clients look up variants here.
      listRule: "",
      viewRule: "",
      createRule: null, // worker writes via superuser
      updateRule: null,
      deleteRule: null,
      indexes: [
        "CREATE UNIQUE INDEX idx_csbakes_bakeid ON CharacterStudioBakes (bakeId)",
      ],
      fields: [
        {
          name: "character",
          type: "relation",
          required: false,
          collectionId: charactersCol.id,
          maxSelect: 1,
          // Never cascade: externally delivered bakes must outlive the record.
          cascadeDelete: false,
        },
        { name: "bakeId", type: "text", required: true },
        { name: "pipelineVersion", type: "text", required: true },
        // Frozen inputs: { gender, height, customization, morphValues }
        { name: "recipe", type: "json", required: true },
        // Map variantHash → { params, key, size } for every generated variant.
        { name: "variants", type: "json", required: false },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "ready", "error"],
        },
        { name: "error", type: "text", required: false },
        // Set once a /b/ URL or embed export handed this bake to the outside
        // world; such bakes are exempt from any GC forever.
        { name: "externallyDelivered", type: "bool", required: false },
      ],
    });
    console.log("Created CharacterStudioBakes.");
  } else {
    console.log("CharacterStudioBakes already exists.");
  }

  let jobs;
  try {
    jobs = await pb.collections.getOne("CharacterStudioBakeJobs");
  } catch {
    jobs = null;
  }
  if (!jobs) {
    await pb.collections.create({
      name: "CharacterStudioBakeJobs",
      type: "base",
      // Owners may enqueue bakes for their own characters and watch their
      // status; admins may enqueue asset invalidations. Only the enqueued
      // shape (status=queued) is accepted — the worker owns all transitions.
      listRule:
        'character.user = @request.auth.id || @request.auth.role = "admin"',
      viewRule:
        'character.user = @request.auth.id || @request.auth.role = "admin"',
      createRule:
        '@request.auth.id != "" && @request.body.status = "queued" && ' +
        '(character.user = @request.auth.id || @request.auth.role = "admin")',
      updateRule: null, // worker-only via superuser
      deleteRule: null,
      fields: [
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["bake", "invalidate"],
        },
        {
          name: "character",
          type: "relation",
          required: false,
          collectionId: charactersCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: "asset",
          type: "relation",
          required: false,
          collectionId: assetsCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        // When set, the job generates a variant for this frozen bake's recipe
        // (pinned /b/ URLs); when empty, the worker bakes the character's
        // current recipe and advances latestBake.
        {
          name: "bake",
          type: "relation",
          required: false,
          collectionId: bakes.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: "variantKey", type: "text", required: false },
        { name: "dedupKey", type: "text", required: false },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["queued", "running", "done", "error"],
        },
        { name: "attempts", type: "number", required: false },
        { name: "error", type: "text", required: false },
      ],
    });
    console.log("Created CharacterStudioBakeJobs.");
  } else {
    console.log("CharacterStudioBakeJobs already exists.");
  }

  await ensureTimestamps("CharacterStudioBakes");
  await ensureTimestamps("CharacterStudioBakeJobs");

  // Character fields that hang off the bake system. `usedAssets` denormalizes
  // the recipe's asset ids into a queryable relation (the customization JSON
  // has dynamic category-name keys, so it can't be filtered on) — it powers
  // asset-edit invalidation and referenced-asset delete guards.
  {
    const c = await pb.collections.getOne("CharacterStudioCharacters");
    let changed = false;
    changed =
      ensureField(c, {
        name: "usedAssets",
        type: "relation",
        required: false,
        collectionId: assetsCol.id,
        maxSelect: 999,
        cascadeDelete: false,
      }) || changed;
    changed =
      ensureField(c, {
        name: "latestBake",
        type: "relation",
        required: false,
        collectionId: bakes.id,
        maxSelect: 1,
        cascadeDelete: false,
      }) || changed;
    changed =
      ensureField(c, {
        name: "bakeStale",
        type: "bool",
        required: false,
      }) || changed;
    if (changed) {
      await pb.collections.update(c.id, c);
      console.log("Updated CharacterStudioCharacters bake fields.");
    } else {
      console.log("CharacterStudioCharacters bake fields already up to date.");
    }
  }
}

// --- Embed: guest-owned characters + claim codes ------------------------------
//
// /embed visitors have no account. Their characters are created through the
// server routes under /api/embed with a self-issued guest token; the server
// stores only a hash of it. `guest = true` records are excluded from public
// listings until claimed (user set, guest cleared). Hidden fields never leave
// PocketBase through the public API.
{
  const c = await pb.collections.getOne("CharacterStudioCharacters");
  let changed = false;
  changed =
    ensureField(c, { name: "guest", type: "bool", required: false }) || changed;
  changed =
    ensureField(c, {
      name: "guestTokenHash",
      type: "text",
      required: false,
      hidden: true,
    }) || changed;
  changed =
    ensureField(c, {
      name: "claimCodeHash",
      type: "text",
      required: false,
      hidden: true,
    }) || changed;
  changed =
    ensureField(c, { name: "claimExpires", type: "date", required: false }) ||
    changed;
  // Guest characters have no owner until claimed.
  const userField = c.fields.find((f) => f.name === "user");
  if (userField?.required) {
    userField.required = false;
    changed = true;
  }
  if (changed) {
    await pb.collections.update(c.id, c);
    console.log("Updated CharacterStudioCharacters embed fields.");
  } else {
    console.log("CharacterStudioCharacters embed fields already up to date.");
  }
}

console.log("Done.");
