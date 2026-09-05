# Character Studio characters in your project

Character Studio (https://characterstudio.wawasensei.dev) turns a saved character into an immutable, animation-ready glTF binary you can load in any three.js, React Three Fiber, or other glTF engine. This page is the complete integration contract. It is written so that a coding agent can implement an integration from it without reading the Character Studio source.

Canonical copies: https://characterstudio.wawasensei.dev/llms.txt (this text) and `docs/integration/character-studio-glb.md` in https://github.com/wass08/character-studio. Coding agents can also install it as a skill: `npx skills add wass08/character-studio`.

## 1. What you get

Every character has a **bake**: a content-addressed GLB assembled on the server from the character recipe (body, clothes, hair, colours, face morphs, height). Bakes are identified by a `bakeId` and never change.

| URL | Purpose | Caching |
| --- | --- | --- |
| `https://characterstudio.wawasensei.dev/api/models/b/{bakeId}.json` | **Manifest**: everything below as data, for this bake | cacheable, short TTL |
| `https://characterstudio.wawasensei.dev/api/models/b/{bakeId}.glb` | **Pinned model**. Same bytes forever | immutable |
| `https://characterstudio.wawasensei.dev/api/models/c/{characterId}.glb` | **Mutable model**. Follows the character's latest bake | never cache |
| `https://characterstudio.wawasensei.dev/api/models/c/{characterId}.json` | Manifest of the character's latest bake | never cache |
| `https://characterstudio.wawasensei.dev/api/models/animations/{man\|woman}.glb` | **Shared animation library** for that body type | immutable per generation |

Model URLs respond with a `302` to a CDN object; follow redirects (every loader does). Model responses also carry a `Link: <…json>; rel="describedby"` header pointing at the manifest. All routes send `Access-Control-Allow-Origin: *`.

**Always start by fetching the manifest.** It tells you the gender (which animation library to load), the height, which variants already exist, the clip catalog, the socket bone names, and the morph targets available.

Ship games with **pinned `/b/` URLs**: they can never change under you. Use `/c/` only when you want a character to update as its owner edits it.

### Letting visitors create characters on your site

If you want users to design their own character inside your page instead of using pre-made ones, embed the creator. The iframe hands you the same URLs through `postMessage`. Guide: [docs/integration/embed.md](embed.md), live demo: https://characterstudio.wawasensei.dev/embed-demo.html.

## 2. Variants (query parameters)

Append any subset to a model URL. Values are strict enums; unknown parameters or values return `400`.

| Param | Values | Default | Notes |
| --- | --- | --- | --- |
| `quality` | `low`, `medium`, `high` | `medium` | `low` halves triangle count and uses 512 px textures; `high` skips simplification |
| `morphs` | `none`, `visemes`, `arkit`, `full` | `visemes` | face blendshapes to keep (see section 6) |
| `compression` | `meshopt`, `draco`, `none` | `meshopt` | `meshopt` needs the Meshopt decoder, `draco` the Draco decoder |
| `pose` | `default`, `tpose` | `default` | rest pose baked into the file |

Example: `…/b/{bakeId}.glb?quality=low&morphs=none` for a crowd character. A variant that does not exist yet is generated while your request is held open (about 10 seconds); on `503` retry after the `Retry-After` delay. The default variant always exists.

Typical default variant: 1.4 to 2.2 MB. Animation libraries: about 1.8 MB (woman) and 7 MB (man), loaded once and shared by every character of that gender.

## 3. Quick start (three.js)

```js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const BASE = "https://characterstudio.wawasensei.dev";

export async function loadCharacter(bakeId, scene) {
  const manifest = await (await fetch(`${BASE}/api/models/b/${bakeId}.json`)).json();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder); // default variants are meshopt-compressed

  const [model, library] = await Promise.all([
    loader.loadAsync(manifest.urls.model),
    loader.loadAsync(manifest.urls.animations),
  ]);

  // Clone so several instances can share the loaded asset.
  const character = SkeletonUtils.clone(model.scene);
  // The character looks down -Z. Turn the wrapper, never the "Rig" node.
  const root = new THREE.Group();
  root.add(character);
  scene.add(root);

  // Drop scale tracks (they would undo the height baked into the Rig).
  const clips = library.animations.map((clip) => {
    const copy = clip.clone();
    copy.tracks = copy.tracks.filter((track) => !track.name.endsWith(".scale"));
    return copy;
  });
  const mixer = new THREE.AnimationMixer(character);
  const actions = Object.fromEntries(
    clips.map((clip) => [clip.name, mixer.clipAction(clip)]),
  );
  actions["Rig|Idle_Loop"].play();

  // Attach a prop to the right hand (socket names come from the manifest).
  const hand = character.getObjectByName(manifest.rig.sockets.handRight.three); // "DEF-handR"

  return { root, character, mixer, actions, manifest, hand };
}

// In your render loop:
//   mixer.update(clock.getDelta());
```

Crossfade between clips instead of stopping and starting, so the rig never snaps through the rest pose:

```js
function play(actions, current, nextName, seconds = 0.3) {
  const next = actions[nextName];
  next.reset().play();
  if (current && current !== next) next.crossFadeFrom(current, seconds, true);
  return next;
}
```

Draco variants: `loader.setDRACOLoader(new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/"))`.

## 4. Quick start (React Three Fiber + drei)

```jsx
import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

export function Character({ manifest, clip = "Rig|Idle_Loop", children }) {
  const group = useRef();
  const { scene } = useGLTF(manifest.urls.model); // drei wires Meshopt + Draco decoders
  const { animations } = useGLTF(manifest.urls.animations);
  const character = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const clips = useMemo(
    () =>
      animations.map((source) => {
        const copy = source.clone();
        copy.tracks = copy.tracks.filter((t) => !t.name.endsWith(".scale"));
        return copy;
      }),
    [animations],
  );
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    const action = actions[clip];
    action?.reset().fadeIn(0.3).play();
    return () => action?.fadeOut(0.3);
  }, [actions, clip]);

  return (
    <group ref={group}>
      <primitive object={character} />
      {children /* e.g. a prop parented to a socket via useEffect */}
    </group>
  );
}
```

`useGLTF` caches by URL, so eight characters sharing one animation library download it once.

## 5. Rig contract

- **Units**: metres. **Up**: +Y. **Forward**: the character looks down **-Z**. A camera at negative Z looking back at the origin sees the face.
- The file's root node is named **`Rig`**. It carries the character's height scale and a 180° turn about Y. Do not move, rotate, or scale the `Rig` node yourself: every clip in the library animates `Rig.position` and `Rig.quaternion` to the same values each frame. Move the character through a parent group.
- Skeleton: Blender Rigify deform bones (`DEF-*`), 253 joints, one skin shared by every mesh. Face bones are included so lip sync and ARKit clips work.
- **Node names**: glTF keeps Blender names such as `DEF-hand.R`. three.js strips the dot (`DEF-handR`). The manifest lists both under `rig.sockets.*.gltf` and `.three`.
- **Bone axes**: a bone's local +Y points along the bone towards its tip. For a hand socket, +Y runs towards the fingertips; tune a prop's offset once and reuse it for every character.
- Height is already baked into the file (`manifest.height` is the recipe value, `rig.heightScaleBakedIntoRig` is true). Do not scale characters by height again.

### Sockets

| Key | glTF joint | three.js name | Use |
| --- | --- | --- | --- |
| `handRight` | `DEF-hand.R` | `DEF-handR` | weapons, tools, held props |
| `handLeft` | `DEF-hand.L` | `DEF-handL` | shields, off-hand props |
| `head` | `DEF-head` | `DEF-head` | hats, helmets, name tags |
| `chest` | `DEF-spine.003` | `DEF-spine003` | backpacks, capes, emblems |
| `hips` | `DEF-hips` | `DEF-hips` | belts, holsters, root-motion pelvis |
| `footLeft` | `DEF-foot.L` | `DEF-footL` | foot effects, footsteps |
| `footRight` | `DEF-foot.R` | `DEF-footR` | foot effects, footsteps |

Attach with `socket.add(prop)`; the prop then inherits the bone's animated transform. Any other `DEF-*` bone works the same way.

## 6. Animations

One library per body type (`man`, `woman`), shared by all characters of that type. Load it once, create one `AnimationMixer` per character instance. Clip names carry the prefix **`Rig|`**, for example `Rig|Idle_Loop`. The manifest lists every clip with `category`, `loop`, `rootMotion`, and `duration`. 45 usable clips per library:

| Category | Clips (label, add the `Rig|` prefix) |
| --- | --- |
| locomotion | `Idle_Loop`, `Walk_Loop`, `Walk_Formal_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Crouch_Idle_Loop`, `Crouch_Fwd_Loop`, `Swim_Idle_Loop`, `Swim_Fwd_Loop`, `Push_Loop`, `Driving_Loop` |
| jump | `Jump_Start`, `Jump_Loop`, `Jump_Land` |
| combat | `Punch_Enter`, `Punch_Jab`, `Punch_Cross`, `Sword_Idle`, `Sword_Attack`, `Sword_Attack_RM`, `Pistol_Idle_Loop`, `Pistol_Aim_Neutral`, `Pistol_Aim_Up`, `Pistol_Aim_Down`, `Pistol_Shoot`, `Pistol_Reload`, `Spell_Simple_Enter`, `Spell_Simple_Idle_Loop`, `Spell_Simple_Shoot`, `Spell_Simple_Exit`, `Roll`, `Roll_RM` |
| reaction | `Hit_Chest`, `Hit_Head`, `Death01` |
| social | `Idle_Talking_Loop`, `Dance_Loop`, `Sitting_Enter`, `Sitting_Idle_Loop`, `Sitting_Talking_Loop`, `Sitting_Exit`, `Interact`, `PickUp_Table`, `Fixing_Kneeling`, `Idle_Torch_Loop` |

Rules:

- **Strip every track whose name ends in `.scale`** before creating actions (`manifest.animations.stripTracks`). The Rig scale track is `[1,1,1]` and would cancel the baked height.
- `*_Loop` clips are designed to repeat (`THREE.LoopRepeat`). One-shot clips (`Jump_Start`, `Sword_Attack`, `Death01`, …) should use `LoopOnce` with `clampWhenFinished = true`.
- `*_RM` clips carry root motion on the `Rig` node (the character travels). The twin without `_RM` plays in place; drive movement from your controller.
- A few clips in the file are rigging leftovers (`A_TPose*`, `*_shape_action`). They are listed under `hiddenClips` in the manifest; ignore them.

## 7. Face morphs

Morph targets live on the face meshes (head, eyes, brows, lashes, mouth). Drive them with `mesh.morphTargetDictionary[name]` and `mesh.morphTargetInfluences`; iterate `character.traverse` to reach every mesh that has the target.

| `morphs=` | Contents |
| --- | --- |
| `none` | no targets, smallest file |
| `visemes` (default) | 15 Oculus visemes: `viseme_sil`, `viseme_PP`, `viseme_FF`, `viseme_TH`, `viseme_DD`, `viseme_kk`, `viseme_CH`, `viseme_SS`, `viseme_nn`, `viseme_RR`, `viseme_aa`, `viseme_E`, `viseme_I`, `viseme_O`, `viseme_U` |
| `arkit` | Apple's 52 ARKit blendshapes (`jawOpen`, `eyeBlinkLeft`, …) |
| `full` | visemes + ARKit |

The viseme set is the one `wawa-lipsync` (npm) emits, so audio-driven lip sync works out of the box.

## 8. Several characters at once (teams, crowds)

- One manifest and one pinned GLB per character; one animation library per gender. Eight characters of mixed gender cost eight model files plus two libraries.
- Load each GLB once and `SkeletonUtils.clone()` per instance. Give every instance its own mixer; actions are per mixer.
- Use `quality=low&morphs=none` for background characters and the default variant for close-ups.
- Team colours: recolour any `Color_*` material at runtime (`material.color.set(...)`) after cloning materials, or bake distinct characters per team.

## 9. Materials

- `Skin`: the composited skin texture (1024 px, 512 px at `quality=low`) or a flat colour.
- `Color_*` (hair, suit, shoes, eyes, …): plain PBR materials with the recipe colour in `baseColorFactor`.
- Physical extensions are stripped; everything renders with `MeshStandardMaterial`.

## 10. Gotchas

- Forgetting the Meshopt decoder gives "GLTFLoader: No MeshoptDecoder".
- Leaving `.scale` tracks in makes the character pop to the wrong size on the first frame.
- Editing the `Rig` node directly fights the animation tracks; wrap the character in a group.
- Looking for `DEF-hand.R` in three.js finds nothing; use `DEF-handR`.
- Three.js caches the skinned bounding sphere on first render; if a character walks far with root motion and gets frustum-culled, set `mesh.frustumCulled = false` on its skinned meshes.
- `/c/` URLs are meant for previews; do not cache them and do not ship them in a build that must be reproducible.

## 11. Manifest reference (`character-studio.manifest.v1`)

| Field | Meaning |
| --- | --- |
| `schema`, `pipelineVersion`, `bakeId`, `characterId`, `name`, `gender`, `height` | identity of the bake |
| `urls.manifest`, `urls.model`, `urls.modelMutable`, `urls.animations`, `urls.docs`, `urls.repo` | absolute URLs; `model` is pinned, `modelMutable` follows the character |
| `model.params` | the enum table from section 2 with defaults |
| `model.defaultVariant`, `model.readyVariants[]` | which variants already exist, with `url`, `cdnUrl`, `bytes` |
| `rig` | conventions, `sockets` (both name spellings), node naming rule |
| `animations.url`, `animations.clips[]`, `animations.hiddenClips[]`, `animations.stripTracks` | the catalog: `name`, `label`, `category`, `loop`, `rootMotion`, `duration` |
| `morphs` | which set the default variant carries, the viseme list, how to request ARKit |
| `materials` | naming conventions |
| `recipe` | the frozen recipe the bake was built from (gender, height, customization, morph values) |

Fields are only added between versions; `schema` changes if anything is removed or renamed.
