---
name: character-studio-glb
description: Load and animate Character Studio characters (characterstudio.wawasensei.dev baked GLBs) in three.js, React Three Fiber, or any glTF engine. Use whenever a task mentions a Character Studio character, bakeId, /api/models URL, or manifest, or asks to put such a character in a game, attach a weapon to its hand, play its animations, or drive its face.
---

# Character Studio GLB integration

Full reference (fetch it if anything here is not enough): https://characterstudio.wawasensei.dev/llms.txt

## Workflow

1. **Fetch the manifest first**: `GET https://characterstudio.wawasensei.dev/api/models/b/{bakeId}.json` (or `/api/models/c/{characterId}.json` for the character's latest bake). It contains absolute URLs, gender, height, the animation clip catalog, socket bone names, morph targets, and the frozen recipe. Never guess these.
2. **Load two files**: `manifest.urls.model` (the character, meshopt-compressed by default) and `manifest.urls.animations` (the shared library for that gender). Register the Meshopt decoder on your GLTFLoader (drei's `useGLTF` does it for you).
3. **Instance** with `SkeletonUtils.clone(gltf.scene)`; one `AnimationMixer` per instance.
4. **Strip `.scale` tracks** from every clip before creating actions. Play clips by their full name, e.g. `Rig|Idle_Loop`; pick from `manifest.animations.clips[]` (fields: `label`, `category`, `loop`, `rootMotion`, `duration`).
5. **Attach props** with `character.getObjectByName(manifest.rig.sockets.handRight.three)` (`DEF-handR`) and `socket.add(prop)`. Bone +Y points towards the fingertips.
6. **Move the character through a parent group.** The `Rig` root node is animated by every clip; do not edit it. The character looks down -Z; a camera at negative Z sees the face.

## Minimal three.js

```js
const manifest = await (await fetch(`${BASE}/api/models/b/${bakeId}.json`)).json();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const [model, lib] = await Promise.all([
  loader.loadAsync(manifest.urls.model),
  loader.loadAsync(manifest.urls.animations),
]);
const character = SkeletonUtils.clone(model.scene);
const clips = lib.animations.map((c) => { const k = c.clone(); k.tracks = k.tracks.filter((t) => !t.name.endsWith(".scale")); return k; });
const mixer = new THREE.AnimationMixer(character);
mixer.clipAction(THREE.AnimationClip.findByName(clips, "Rig|Idle_Loop")).play();
character.getObjectByName(manifest.rig.sockets.handRight.three).add(sword);
```

## Facts to rely on

- Pinned `/b/{bakeId}.glb` URLs never change; `/c/{characterId}.glb` follows edits and must not be cached.
- Variants via query params, strict enums: `quality=low|medium|high`, `morphs=none|visemes|arkit|full`, `compression=meshopt|draco|none`, `pose=default|tpose`. Missing variants are generated on first request (about 10 s); retry on 503.
- 45 usable clips per gender in categories locomotion, jump, combat (punch, sword, pistol, spell, roll), reaction (hits, death), social (talk, dance, sit, interact). `*_Loop` repeats; `*_RM` carries root motion on the Rig.
- Default variant keeps 15 Oculus visemes (`viseme_aa` …). `morphs=arkit` or `full` adds the 52 ARKit blendshapes. Drive via `morphTargetDictionary` on the face meshes.
- Sockets: `handRight` DEF-handR, `handLeft` DEF-handL, `head` DEF-head, `chest` DEF-spine003, `hips` DEF-hips, `footLeft` DEF-footL, `footRight` DEF-footR (three.js names; glTF names keep the dots).
- Materials: `Skin` plus `Color_*` standard PBR; recolour `Color_*` for team tints.
- All routes send `Access-Control-Allow-Origin: *`.

## Embedding the creator

To let visitors make their own character on the host site, iframe `https://characterstudio.wawasensei.dev/embed?origin=<encoded host origin>` and listen for `cs.v1.ready`, `cs.v1.character.exported` (carries `characterId`, `bakeId`, `glbUrl`, `characterUrl`, `animationsUrl`, `manifestUrl`) and `cs.v1.error`; always check `event.origin`. Full guide: `docs/integration/embed.md` in the repo. Demo: https://characterstudio.wawasensei.dev/embed-demo.html.

## Do not

- Do not scale by `manifest.height` again; it is baked in.
- Do not play `A_TPose*` or `*_shape_action` clips (listed in `manifest.animations.hiddenClips`).
- Do not look up `DEF-hand.R` in three.js; the dot is stripped.
