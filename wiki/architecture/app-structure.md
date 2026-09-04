# App structure

## Character rendering

Read-only first-party surfaces prefer a server-produced character bake and
fall back to live recipe assembly if the bake is absent or fails to load.

- `/c/[id]` passes a character with `latestBake` to `BakedAvatar` through
  `Scene`. The baked GLB comes from `/api/models/c/{characterId}.glb`.
- The homepage hero wall and `/lab/wall` choose the baked renderer per slot in
  `WallScene`. A failed slot remounts `WallCharacter` in live-assembly mode
  without taking down the other characters.
- `/editor` and `/editor/[id]` always use `Avatar` live assembly because they
  edit the recipe. Character experiments also remain live because they need
  interactive pose, morph, and controller state.

`src/lib/modelAssets.js` owns model URL construction. Do not build baked or
shared-animation URLs ad hoc in rendering components.

## Shared animations

All renderers load gender-specific clips through
`/api/models/animations/{gender}.glb`. The route redirects to the published,
content-addressed R2 object recorded in
`src/lib/generated/animation-assets.json`, or to the repository copy before a
generation has been published.

Animation libraries remain separate from character bakes. A served bake must
retain every bone targeted by its gender's shared library.
