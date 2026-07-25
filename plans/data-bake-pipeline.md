---
plan_id: data-bake-pipeline
title: Baked character pipeline (immutable bakes, parametric variants, server worker)
status: in-progress
kind: living-plan
priority: p1
last_reviewed: 2026-07-25
goal: "Every saved character has a server-produced, immutable, content-addressed baked GLB served via parametric URLs; home/wall/character pages load bakes instead of live assembly."
readiness: ready
success_criteria:
  - "Saving a character in the editor enqueues a bake; within ~30s a default-variant GLB exists in R2 and `latestBakeId` points to it."
  - "GET /c/{characterId}.glb?quality=…&morphs=…&compression=… 302s to an immutable R2 object; unknown params/values → 400; cold variants are generated while the request is held open."
  - "GET /b/{bakeId}.glb serves a pinned bake that never changes; externally delivered bakes are never garbage-collected."
  - "Editing an asset in admin marks affected characters stale via `usedAssets`; next request serves the old bake and triggers a deduped background re-bake (SWR)."
  - "The baked rig.glb animates correctly against the shared Animations.glb (full DEF skeleton preserved — no bone stripping in served profiles)."
  - "Bake worker runs as a single Docker service (Elestio-deployable): PB-backed job queue, in-process concurrency cap ~2, healthcheck endpoint, survives restarts without losing jobs."
depends_on: []
related_plans: ["app-embed-creator"]
related_wiki: []
wiki_sync:
  required: true
  done: false
  pages: []
  notes: "Document bake URL contract + worker deploy once stable."
archive:
  eligible: false
  reason: "Just opened; implementation starting."
---

# Baked character pipeline

## Context

Characters are stored as recipes (`customization` JSON: asset IDs + colors) and rebuilt live on every surface — armature clone + one GLTF fetch per equipped asset + runtime skin compositing + a 2.7–8.6 MB shared animation library. A sophisticated client-side bake pipeline exists (`src/components/scene/exportWorker.ts`: gltf-transform morph baking, bone stripping, weld/prune, draco/meshopt) but its only output is a browser download. Nothing baked is persisted or served.

Design was settled in an architecture interview (2026-07-24/25). Locked decisions:

1. **Recipes are truth; bakes are derived, immutable, content-addressed.** `bakeId = hash(recipe + asset versions + pipelineVersion)`. Character record holds a mutable `latestBakeId` pointer. Bakes delivered externally (fetched via `/b/` or emitted via embed export) are kept forever — R2 storage is ~$0.75/mo per 10k bakes; never break shipped URLs to save that.
2. **Server-side bake worker only.** No client-produced artifact is ever stored or served (trust + catalog-wide re-bake capability). Client bake code survives only as the "download my GLB" button. Worker = Node service on Elestio: gltf-transform stage reused from `exportWorker.ts`, headless three.js assembly + `GLTFExporter` (no GPU needed), `sharp` for skin/makeup compositing.
3. **Parametric serving, RPM-style but enum-clamped.** `/c/{id}.glb` (follows pointer) and `/b/{bakeId}.glb` (pinned). Params: `quality=low|medium|high`, `morphs=none|visemes|arkit|full`, `compression=meshopt|draco|none`, `pose=default|tpose`. Canonicalize → hash → variant key. Unknown param/value → 400. Cold variant: bake synchronously, hold request open (~20s cap) — no 202/polling. Defaults eagerly baked on character save so first-party surfaces never hit the cold path.
4. **Lazy SWR invalidation.** Asset edit → find affected characters via new `usedAssets` multi-relation (recipe JSON has dynamic keys, not queryable) → set `bakeStale`. Next request serves the old bake immediately and fires a deduped background re-bake; pointer advances when it lands. Never-viewed characters never re-bake. No priority queue.
5. **Animations stay shared, never embedded per character.** Served bakes keep the full animation-compatible skeleton — the existing export bone stripping (`stripBonesUnder("DEF-head")`, `MCH-eyes_parent`) becomes a profile option for standalone downloads only. `Animations.glb` graduates from `public/` to content-hashed R2/CDN assets; the 8.6 MB man file gets a resample/quantize pass (~3× cut expected).
6. **No true LODs in v1.** Quality tiers (simplify ratio + texture size) cover the wall/grid case; `MSFT_lod` can be added later as another profile without touching the immutability scheme.

## Goal

Every saved character gets a server-produced immutable baked GLB, addressable by stable parametric URLs, with lazy SWR re-bakes on asset changes — and first-party surfaces (home wall, `/c/[id]`) switch from live assembly to loading bakes.

## Phases

### Phase 1 — Schema + shared pipeline extraction

- [ ] `scripts/setup-pocketbase.js`: add `CharacterStudioBakes` (character rel, bakeId/content hash, pipelineVersion, recipe snapshot, status, variant list JSON, externallyDelivered bool), `CharacterStudioBakeJobs` (character rel, variant key, status, uniq dedup key, attempts, error), add `usedAssets` multi-relation + `latestBakeId` + `bakeStale` to `CharacterStudioCharacters`.
- [ ] Store: `saveCharacter` writes `usedAssets`; admin asset save marks referencing characters stale.
- [ ] Extract gltf-transform stage from `exportWorker.ts` into `src/lib/bake/` (pure, runs in web worker AND Node). Web worker re-exports from it; behavior unchanged (verify existing export still works).

### Phase 2 — Bake worker service

- [ ] `bake-worker/`: Node + Dockerfile + env (`PB_URL`, `PB_ADMIN_TOKEN`, `R2_*`); polls `CharacterStudioBakeJobs`, concurrency cap 2, healthcheck HTTP.
- [ ] Headless assembly: load Armature.glb + asset GLBs (from R2/PB URLs), apply morphs/recipe, composite skin via `sharp`, `GLTFExporter` → GLB → shared gltf-transform stage → R2 `bakes/{bakeId}/{variantHash}.glb`.
- [ ] Golden test: bake a fixture recipe, assert output loads in three, binds all `Rig|*` clips from Animations.glb, size within budget.

### Phase 3 — Serving + invalidation wiring

- [ ] Next routes `/api/models/c/[id]` + `/api/models/b/[bakeId]` (or `models.` host): param canonicalization, 400 on unknowns, 302 to R2, cold-path hold-open, SWR stale trigger, per-IP rate limit.
- [ ] Save-time eager default bake enqueue; dedup enforcement.
- [ ] Animations.glb → content-hashed R2 upload + loader indirection; resample/quantize pass on man file.

### Phase 4 — Consume bakes first-party

- [ ] Home wall / `/c/[id]` load `rig.glb` (default variant) + shared animations instead of live assembly; fall back to live assembly when no bake exists yet.
- [ ] Editor keeps live assembly (it must — it edits the recipe).

## Open questions

- Exact quality-tier parameters (simplify ratios, texture caps) — tune against real wall load metrics.
- Where the resolver lives long-term: Next API route vs. the worker's HTTP server behind a `models.` subdomain (start: Next route, cheapest).
- PB admin auth for worker: impersonation token vs. superuser credentials rotation.

## Wiki sync

_Filled in before flipping `status: implemented`._
