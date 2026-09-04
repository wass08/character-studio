// The rig contract every baked character honours. Shared by the manifest
// route, the docs generator, and (later) the embed postMessage payload.
// Client-safe: no server or three.js imports.

export const MANIFEST_SCHEMA = "character-studio.manifest.v1";

// three.js' GLTFLoader sanitizes node names for PropertyBinding: spaces
// become "_" and the characters [ ] . : / are removed. glTF keeps the
// original names, so a manifest lists both.
export function threeNodeName(name) {
  return String(name)
    .replace(/\s/g, "_")
    .replace(/[[\].:/]/g, "");
}

export const RIG_CONVENTIONS = Object.freeze({
  up: "+Y",
  forward: "-Z",
  units: "meters",
  rootNode: "Rig",
  skeleton: "Rigify DEF-* deform bones (Blender), 253 joints, one shared skin",
  heightScaleBakedIntoRig: true,
  notes: [
    'The "Rig" node carries the character height scale and a 180° turn about Y. Move or rotate the character through a parent group, never by editing the Rig node: the animation library animates Rig.position/Rig.quaternion to the same values on every frame.',
    "The character looks down -Z. A camera placed at negative Z looking back at the origin sees the face.",
    "Bone local +Y runs along the bone towards its tip (Blender convention). For a hand socket, +Y points towards the fingertips.",
    "Every skinned mesh shares one skeleton. Clone with three's SkeletonUtils.clone() to spawn several instances of the same GLB.",
  ],
});

// Attachment points. `gltf` is the joint name inside the GLB, `three` is the
// name after GLTFLoader sanitizing (what object.getObjectByName() needs).
const socket = (gltf, purpose) => ({
  gltf,
  three: threeNodeName(gltf),
  purpose,
});
export const RIG_SOCKETS = Object.freeze({
  handRight: socket("DEF-hand.R", "weapons, tools, held props (primary hand)"),
  handLeft: socket("DEF-hand.L", "shields, off-hand props"),
  head: socket("DEF-head", "hats, helmets, name tags, cameras"),
  chest: socket("DEF-spine.003", "backpacks, capes, chest emblems"),
  hips: socket("DEF-hips", "belts, holsters; also the root-motion pelvis bone"),
  footLeft: socket("DEF-foot.L", "foot effects, footstep events"),
  footRight: socket("DEF-foot.R", "foot effects, footstep events"),
});

// Oculus/OVR viseme set kept by morphs=visemes (the default) and morphs=full.
export const VISEMES = Object.freeze([
  "viseme_sil",
  "viseme_PP",
  "viseme_FF",
  "viseme_TH",
  "viseme_DD",
  "viseme_kk",
  "viseme_CH",
  "viseme_SS",
  "viseme_nn",
  "viseme_RR",
  "viseme_aa",
  "viseme_E",
  "viseme_I",
  "viseme_O",
  "viseme_U",
]);

export const MORPH_SETS = Object.freeze({
  none: "no morph targets (smallest file)",
  visemes: "15 Oculus visemes for lip sync (default)",
  arkit: "Apple's 52 ARKit face blendshapes",
  full: "visemes + ARKit",
});
