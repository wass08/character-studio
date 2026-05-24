---
plan_id: app-engine-rewrite
title: Engine rewrite — TypeScript + WebGPU/TSL coupled
status: draft
kind: living-plan
priority: p1
last_reviewed: 2026-05-23
goal: "Convert the 3D engine surface (src/components/scene/, src/lib/lipsync.js, related shaders/materials) to TypeScript and TSL/WebGPU in a single pass per file, with a WebGL fallback for unsupported browsers."
readiness: needs_criteria
success_criteria:
  - "TBD — first phase locks the migration strategy, success criteria depend on it."
depends_on: []
related_plans:
  - app-beta-production
  - app-nav-and-positioning  # unlocks phase 6 (plaza polish) once store coupling is gone
related_wiki: []
wiki_sync:
  required: true
  done: false
  pages: []
  notes: "On completion: new wiki/architecture/engine.md (or extend stores.md) documenting the TSL/WebGPU pipeline, fallback strategy, and where TypeScript boundaries live."
archive:
  eligible: false
  reason: "Active sub-plan of app-beta-production."
---

# Engine rewrite — TypeScript + WebGPU/TSL coupled

Sub-plan of [app-beta-production](app-beta-production.md). Each engine file touched **once**: `.js` → `.ts` + classic Three.js material → TSL node material + WebGL renderer → WebGPU renderer with fallback. The coupled approach was decided in the charter to avoid rewriting hot paths twice.

## Context

Today's engine sits in `src/components/scene/` (`Scene.jsx`, `Avatar.jsx`, `Asset.jsx`, `Backdrop.jsx`, `CameraManager.jsx`, `SkinManager.jsx`, `LipsyncDriver.jsx`, `exportWorker.js`) plus `src/lib/lipsync.js`. It's coupled to `useConfiguratorStore` (the editor singleton) in ways that block multi-character rendering (see [app-nav-and-positioning phase 6](app-nav-and-positioning.md#phase-6--plaza-polish-deferred-)). The rewrite is the natural place to refactor that coupling out: introduce a `Character` context / props-driven render path that the singleton store can fill, but that other surfaces (plaza, hero) can also fill from their own data.

WebGPU support: ~85% of desktop Chrome / Edge / Firefox, ~70% of mobile Chrome on Android. Safari mobile and older Android still need WebGL. The fallback is non-optional.

## Phase 0 — Discovery (needs_criteria)

Before any code moves, lock the migration strategy. This is the first slice; success criteria for the whole plan get written *after* this phase.

- [ ] Inventory every file in scope (scene/ + lib/lipsync.js + any shaders) with LOC, dependencies, and store coupling.
- [ ] Spike: pick one small leaf file (probably `Backdrop.jsx`) and do the full TS + TSL conversion to validate the recipe. Measure perf delta and bundle delta.
- [ ] Decide the runtime selection strategy: WebGPU probe at `<Canvas>` mount, fallback to WebGL on probe failure or explicit feature-flag opt-out. Decide how to expose the active renderer to debug overlays.
- [ ] Decide the TypeScript boundary: do stores get types? (probably yes, narrow types only). Do route handlers? (no for now). Does the UI? (no — separate plan if anyone wants it).
- [ ] Decide the file-by-file order: leaves first (Backdrop), then materials (Asset, SkinManager), then animation / driver (Avatar, LipsyncDriver), then orchestrator (Scene, CameraManager), then worker (`exportWorker.js`).
- [ ] Write the success criteria for the plan based on the spike's outcome. Update the frontmatter `success_criteria` and `readiness`.

**Owner**: Claude (design phase — Codex doesn't decide architecture).

## Phases 1–N — File-by-file conversion

Defined after phase 0 lands. Expected shape: one phase per file (or small group). Each phase ships an isolated commit that converts the file end-to-end: TS types, TSL materials, WebGPU support, WebGL fallback verified. Reviewable independently.

**Owner**: Codex executes per-file conversion against the spec from phase 0. Claude reviews each commit and handles any cases where the spec doesn't fit cleanly (e.g. when a file needs structural changes the spec didn't anticipate).

## Final phase — Wiki sync & close

- [ ] New `wiki/architecture/engine.md` (or section in `stores.md`) documenting: the WebGPU/WebGL fallback contract, the TSL material conventions, where the TypeScript boundary sits and why, how a new file is added to the engine surface.
- [ ] Flip `wiki_sync.done: true`, `status: implemented`, `readiness: reference`.

## Open questions (resolve in phase 0)

- Renderer selection at the `<Canvas>` boundary vs at app root? (Affects how multiple surfaces — editor, hero, plaza — share or fork the renderer.)
- TSL adoption: full switch to node materials, or hybrid (TSL for new materials, classic for unchanged ones)?
- Do we move shaders out of inline strings into `.tsl.ts` files?
- TypeScript strictness: full `strict: true` for engine files, or staged?
- How does the lipsync worker (`exportWorker.js`) fit? Workers under WebGPU have their own context — verify the same fallback works.

## Wiki sync

_Filled before flipping `status: implemented`._
