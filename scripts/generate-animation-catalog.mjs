// Regenerate src/lib/generated/animation-clips.json from the shared animation
// libraries. The bake manifest (/api/models/b/{bakeId}.json) and the
// integration docs read this catalog instead of parsing GLBs at runtime.
//
//   npm run animations:catalog
//
// Re-run whenever public/models/characters/*/Animations.glb changes (before
// `npm run animations:publish`).

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENDERS = ["man", "woman"];
const CLIP_PREFIX = "Rig|";

// Category by clip label (the name without the "Rig|" prefix). Order matters:
// the first match wins. Anything unmatched lands in "other".
const CATEGORIES = [
  ["internal", /^(A_TPose|faceit_shape_action|overwrite_shape_action)/],
  [
    "locomotion",
    /^(Idle_Loop|Walk_Loop|Walk_Formal_Loop|Jog_Fwd_Loop|Sprint_Loop|Crouch_Idle_Loop|Crouch_Fwd_Loop|Swim_Idle_Loop|Swim_Fwd_Loop|Push_Loop|Driving_Loop)$/,
  ],
  ["jump", /^Jump_/],
  ["combat", /^(Punch_|Sword_|Pistol_|Spell_|Roll)/],
  ["reaction", /^(Hit_|Death)/],
  [
    "social",
    /^(Idle_Talking_Loop|Dance_Loop|Sitting_|Interact|PickUp_|Fixing_|Idle_Torch_Loop)/,
  ],
];

function categorize(label) {
  for (const [category, pattern] of CATEGORIES) {
    if (pattern.test(label)) return category;
  }
  return "other";
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const catalog = {
  clipNamePrefix: CLIP_PREFIX,
  // Tracks every consumer must drop before playing a clip on a bake: the
  // Rig scale track is [1,1,1] and would undo the height scale baked into
  // the Rig node; bone scale tracks deform the pose.
  stripTracks: [".scale"],
  categories: CATEGORIES.map(([name]) => name).filter((n) => n !== "internal"),
  genders: {},
};

for (const gender of GENDERS) {
  const file = path.join(
    ROOT,
    "public/models/characters",
    gender,
    "Animations.glb",
  );
  const document = await io.read(file);
  const clips = document
    .getRoot()
    .listAnimations()
    .map((animation) => {
      const name = animation.getName();
      const label = name.startsWith(CLIP_PREFIX)
        ? name.slice(CLIP_PREFIX.length)
        : name;
      let duration = 0;
      for (const channel of animation.listChannels()) {
        const input = channel.getSampler()?.getInput();
        if (input) duration = Math.max(duration, input.getMax([])[0] ?? 0);
      }
      const category = categorize(label);
      return {
        name,
        label,
        category,
        loop: /_Loop$/.test(label),
        rootMotion: /_RM$/.test(label),
        duration: Number(duration.toFixed(3)),
        hidden: category === "internal",
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  catalog.genders[gender] = {
    url: `/api/models/animations/${gender}.glb`,
    clipCount: clips.filter((c) => !c.hidden).length,
    clips,
  };
  console.log(
    `${gender}: ${clips.length} clips (${clips.filter((c) => c.hidden).length} hidden)`,
  );
}

const out = path.join(ROOT, "src/lib/generated/animation-clips.json");
await writeFile(out, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`wrote ${path.relative(ROOT, out)}`);
