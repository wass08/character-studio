// Apple's canonical 52 ARKit face blendshapes (display casing).
// Mirrors the lowercase set in scene/exportWorker.js. Kept duplicated because
// the worker can't share runtime modules with the main bundle.
export const ARKIT_KEYS = [
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "browOuterUpLeft",
  "browOuterUpRight",
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  "jawForward",
  "jawLeft",
  "jawOpen",
  "jawRight",
  "mouthClose",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthFunnel",
  "mouthLeft",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthPucker",
  "mouthRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "noseSneerLeft",
  "noseSneerRight",
  "tongueOut",
];

// Meta / Oculus OVR LipSync 15-viseme set.
// Reference: https://developers.meta.com/horizon/documentation/unity/audio-ovrlipsync-viseme-reference/
export const VISEME_KEYS = [
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
];

// Face-shape sliders (the proportions controls applied to the head).
export const FACE_CONTROL_KEYS = [
  "Eye Spacing",
  "Eye Width",
  "Nose Width",
  "Nose Length",
  "Nasal Bridge Size",
  "Jaw Width",
  "Lip Thickness",
];

// Whole-body proportions.
export const BODY_CONTROL_KEYS = ["Body Size", "Muscularity"];

const lower = (s) => String(s).toLowerCase();

const buildCategory = (label, keys, presentSet) => {
  const items = keys.map((k) => ({
    label: k,
    present: presentSet.has(lower(k)),
  }));
  const found = items.filter((i) => i.present).length;
  return { label, items, found, total: items.length };
};

export function analyzeMorphs(morphKeys) {
  const list = morphKeys || [];
  const presentSet = new Set(list.map(lower));

  const arkit = buildCategory("ARKit", ARKIT_KEYS, presentSet);
  const visemes = buildCategory("Visemes", VISEME_KEYS, presentSet);
  const faceControls = buildCategory("Head", FACE_CONTROL_KEYS, presentSet);
  const bodyControls = buildCategory("Body", BODY_CONTROL_KEYS, presentSet);

  // Bucket of detected keys that don't fit any of the known categories.
  const known = new Set([
    ...ARKIT_KEYS.map(lower),
    ...VISEME_KEYS.map(lower),
    ...FACE_CONTROL_KEYS.map(lower),
    ...BODY_CONTROL_KEYS.map(lower),
  ]);
  const otherKeys = list.filter((k) => !known.has(lower(k)));
  const other = {
    label: "Other",
    items: otherKeys.map((label) => ({ label, present: true })),
    found: otherKeys.length,
    total: otherKeys.length,
  };

  return { total: list.length, arkit, visemes, faceControls, bodyControls, other };
}
