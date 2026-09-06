// Builds the per-character manifest served at /api/models/b/{bakeId}.json and
// /api/models/c/{characterId}.json: everything an integrator (human or agent)
// needs to use a bake without reading this repository. Server-only.

import {
  BAKE_PARAMS,
  DEFAULT_VARIANT_KEY,
  variantObjectKey,
} from "@/lib/bake/params";
import {
  MANIFEST_SCHEMA,
  MORPH_SETS,
  RIG_CONVENTIONS,
  RIG_SOCKETS,
  VISEMES,
} from "@/lib/bake/rigContract";
import animationClips from "@/lib/generated/animation-clips.json";
import { publicR2Url } from "./modelResolver";

const DOCS_REPO = "https://github.com/wass08/character-studio";

/** Public origin of the app, honouring reverse-proxy headers. */
export function requestOrigin(req) {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (host) return `${proto || url.protocol.replace(":", "")}://${host}`;
  return url.origin;
}

/** CORS for the public model routes: read-only, public data. */
export const PUBLIC_CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Link",
});

export function buildManifest({ bake, character, origin }) {
  const recipe = bake.recipe || {};
  const gender = recipe.gender || character?.gender || "woman";
  // Bakes are content-addressed, so several characters with identical
  // recipes share one bake record whose `character` is whoever baked first.
  // The character passed in (the one being served) takes precedence.
  const characterId = character?.id || bake.character || null;
  const pinned = `${origin}/api/models/b/${encodeURIComponent(bake.bakeId)}.glb`;
  const mutable = characterId
    ? `${origin}/api/models/c/${encodeURIComponent(characterId)}.glb`
    : null;
  const animations = animationClips.genders[gender];

  const readyVariants = Object.entries(bake.variants || {}).map(
    ([key, variant]) => ({
      key,
      params: Object.fromEntries(new URLSearchParams(key)),
      url: `${pinned}?${key}`,
      cdnUrl: publicR2Url(variant.key || variantObjectKey(bake.bakeId, key)),
      bytes: variant.size ?? null,
    }),
  );

  return {
    schema: MANIFEST_SCHEMA,
    pipelineVersion: bake.pipelineVersion,
    bakeId: bake.bakeId,
    characterId,
    name: character?.name || null,
    gender,
    height: typeof recipe.height === "number" ? recipe.height : null,
    // True while the character was edited after this bake and a replacement
    // is being produced; the mutable model URL serves this bake meanwhile.
    stale: !!character?.bakeStale,
    urls: {
      manifest: `${origin}/api/models/b/${encodeURIComponent(bake.bakeId)}.json`,
      model: pinned,
      modelMutable: mutable,
      animations: `${origin}${animations.url}`,
      docs: `${origin}/llms.txt`,
      repo: DOCS_REPO,
    },
    model: {
      format: "glTF binary (.glb)",
      params: BAKE_PARAMS,
      defaultVariant: DEFAULT_VARIANT_KEY,
      readyVariants,
      request:
        "Append any subset of the params as a query string to urls.model (or urls.modelMutable). Unknown params or values return 400. A variant that does not exist yet is generated while the request is held open (about 10 s); retry on 503.",
      caching:
        "urls.model is immutable for this bakeId (cache forever). urls.modelMutable follows the character's latest bake and must not be cached.",
    },
    rig: {
      ...RIG_CONVENTIONS,
      sockets: RIG_SOCKETS,
      nodeNaming:
        'three.js strips "." from node names: DEF-hand.R becomes DEF-handR. Use the `three` names with getObjectByName().',
    },
    animations: {
      url: `${origin}${animations.url}`,
      shared: true,
      clipNamePrefix: animationClips.clipNamePrefix,
      stripTracks: animationClips.stripTracks,
      categories: animationClips.categories,
      clipCount: animations.clipCount,
      clips: animations.clips.filter((clip) => !clip.hidden),
      hiddenClips: animations.clips
        .filter((clip) => clip.hidden)
        .map((c) => c.name),
      notes: [
        "One library per gender, shared by every character of that gender. Load it once and bind it to each character instance with its own AnimationMixer.",
        'Clip names carry the "Rig|" prefix, e.g. "Rig|Idle_Loop".',
        "Drop every track whose name ends in .scale before playing (see stripTracks).",
        "*_RM clips carry root motion on the Rig node; the non-RM twin plays in place.",
      ],
    },
    morphs: {
      sets: MORPH_SETS,
      inDefaultVariant: "visemes",
      visemes: VISEMES,
      arkit: {
        count: 52,
        request: "morphs=arkit or morphs=full",
        reference: "https://arkit-face-blendshapes.com/",
      },
      note: "Morph targets live on the face meshes (head, eyes, brows, lashes, mouth). Drive them through mesh.morphTargetDictionary / morphTargetInfluences.",
    },
    materials: {
      skin: 'Material named "Skin": composited skin texture (1024 px, 512 px at quality=low) or a flat colour.',
      colored:
        'Materials named "Color_*" carry the recipe colours in baseColorFactor. Re-tint at runtime by editing material.color.',
      note: "Materials are plain PBR (metallic-roughness). Physical extensions are stripped.",
    },
    recipe,
  };
}
