---
plan_id: app-thumbnails
title: Thumbnail quality — resolution, lighting, framing
status: implemented
kind: implementation-record
priority: p2
last_reviewed: 2026-05-23
goal: "Saved character thumbnails are sharp (≥ 512² rendered, anti-aliased), well-lit, and consistently framed for the homepage cards, the /studio grid, and the chip."
readiness: reference
success_criteria:
  - "captureFaceThumbnail renders at ≥ 512² with MSAA — verified by inspecting the PB-stored asset dimensions."
  - "Framing is head + shoulders (not just face), so the character's hair, top, and skin all read on the card — verified by visiting / and /studio side-by-side with the old thumbnails."
  - "The capture path is documented in wiki/architecture/data-model.md (where the thumbnail field lives) so a future rebake job can rerun the same rig."
depends_on:
  - app-shadcn-everywhere
related_plans:
  - app-beta-production
  - app-engine-rewrite  # the WebGPU rewrite will replace gl.readRenderTargetPixels; the rig itself stays
related_wiki:
  - wiki/architecture/data-model.md
wiki_sync:
  required: true
  done: true
  pages:
    - wiki/architecture/data-model.md
  notes: "Extended the CharacterStudioCharacters section with a `#### Thumbnail capture` subsection: rig location, output/render sizes, framing, lighting/background deferrals, replacement note for the engine rewrite."
archive:
  eligible: false
  reason: "Active sub-plan of app-beta-production."
---

# Thumbnail quality

Sub-plan of [app-beta-production](app-beta-production.md). Today's thumbnails are 256² with no MSAA and a tight face crop, baked from the editor scene's lighting. They look soft on the homepage and don't show the character's clothes — only the face.

## Today's state (audit, 2026-05-23)

```js
// src/components/scene/Scene.jsx — captureFaceThumbnail
const SIZE = 256;
const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
});
const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
cam.position.set(headPos.x, headPos.y + 0.04, headPos.z - 0.95);
cam.lookAt(headPos.x, headPos.y - 0.02, headPos.z);
```

Issues:

- **Resolution.** 256² renders fuzzy on a 256×256 card on high-DPR displays, terrible on 512×512 featured cards.
- **No MSAA.** Edge aliasing on hair / silhouette.
- **Framing.** Tight face shot (distance ~0.95m, fov 28°). Hair + clothes don't read on the card.
- **Lighting.** Reuses the editor scene's lights, which are tuned for a wider full-body composition.

## Phase 1 — Rig upgrade (resolution + MSAA + framing) ✅

Shipped inline with this plan-file commit:

- [x] Bump `SIZE` to **512**.
- [x] Add **MSAA via `samples: 4`** on the WebGLRenderTarget.
- [x] Reframe to **head + shoulders**: camera distance from head ~1.55m, fov 30°, look-at a hair below the head bone so the upper torso enters the frame. Numbers tuned in-scene; see Scene.jsx for the exact values.
- [x] Keep existing scene lighting for now — dedicated portrait lights are phase 2 territory.

## Phase 2 — Portrait lighting (deferred, post-engine-rewrite)

Adding portrait-specific lights at capture-time means temporarily mutating the scene during a render-to-texture pass, which is cleaner once the engine rewrite has moved capture out of the singleton scene context. Workstream items kept here so they don't get lost:

- [ ] Side-key light at 45° for cheekbone modelling.
- [ ] Soft rim light to separate hair from background.
- [ ] Neutral gradient background instead of the editor's `#222237` (or keep the gradient, lock its colours).

## Phase 3 — Rebake existing characters (deferred)

The Phase 1 rig change only improves *new* saves. Existing characters in the DB still carry 256² thumbnails. Options:

- Admin action: "rebake all my thumbnails" — fetches each, loads into editor, calls captureFaceThumbnail, re-uploads. Throttled.
- One-off script: same logic but run from a Node context (requires headless three.js; non-trivial).

Picking the admin-action route once Phase 1 has been in production long enough to validate the rig looks good across the character set.

## Phase 4 — Wiki sync & close

- [x] Document the thumbnail-capture contract in [wiki/architecture/data-model.md](../wiki/architecture/data-model.md) `## Thumbnail capture`: resolution, MSAA, framing target (head + shoulders), where the rig code lives.
- [x] Flip `wiki_sync.done: true`, `status: implemented`, `readiness: reference`.

## Wiki sync

Landed with the Phase 1 ship commit. `wiki/architecture/data-model.md` gains a new `## Thumbnail capture` subsection under the Thumbnails area documenting the upgraded rig (512² MSAA-4, head + shoulders framing, rig location in Scene.jsx).
