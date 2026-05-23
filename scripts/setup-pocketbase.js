/**
 * One-off schema migration for the Studio hub:
 *   - Opens up Character list/view to public so the living wall and
 *     /c/:id pages can render.
 *   - Adds `featured` and `hidden` flags on CharacterStudioCharacters.
 *   - Exposes `name` and `mainCharacter` on `users` for author chips.
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
  throw new Error("NEXT_PUBLIC_POCKETBASE_URL / POCKETBASE_EMAIL / POCKETBASE_PASSWORD must be set");
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
  changed = ensureField(c, {
    name: "featured",
    type: "bool",
    required: false,
  }) || changed;
  changed = ensureField(c, {
    name: "hidden",
    type: "bool",
    required: false,
  }) || changed;
  // Public read so anyone can browse the wall and /c/:id, but only the
  // owner can create / update / delete.
  changed = setRules(c, {
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

// --- users: expose `name` and `mainCharacter` for chip display --------------
{
  const u = await pb.collection("users").getFullList({ batch: 1 }).catch(() => null);
  const c = await pb.collections.getOne("users");
  // Allow public read of basic profile so we can show author names on /c/:id.
  // (Email is gated by emailVisibility, so it stays private.)
  let changed = setRules(c, {
    listRule: "",
    viewRule: "",
  });
  if (changed) {
    await pb.collections.update(c.id, c);
    console.log("Updated users rules.");
  } else {
    console.log("users rules already up to date.");
  }
}

// --- CharacterStudioVoicePresets --------------------------------------------
{
  let preset;
  try {
    preset = await pb.collections.getOne("CharacterStudioVoicePresets");
  } catch (e) {
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
          mimeTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/x-m4a", "audio/mp4"],
        },
        { name: "position", type: "number", required: false },
      ],
    });
    console.log("Created CharacterStudioVoicePresets.");
  } else {
    console.log("CharacterStudioVoicePresets already exists.");
  }
}

console.log("Done.");
