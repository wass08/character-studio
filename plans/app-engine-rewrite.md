---
plan_id: app-engine-rewrite
title: Engine rewrite — TypeScript + WebGPU/TSL coupled
status: in_progress
kind: living-plan
priority: p1
last_reviewed: 2026-05-24
goal: "Convert the 3D engine surface (src/components/scene/, src/lib/lipsync.js, related shaders/materials) to TypeScript and TSL/WebGPU in a single pass per file, with a WebGL fallback for unsupported browsers."
readiness: planned
success_criteria:
  - "Every file in the engine surface (see ## Inventory) is .ts/.tsx, with the project's `tsc --noEmit` clean on those paths only — no errors leak into UI / route / store code that hasn't been migrated."
  - "Renderer at the <Canvas> boundary picks WebGPU when navigator.gpu is available *and* the WebGPU backend successfully initialises; falls back to WebGL otherwise. The active renderer is exposed in a dev overlay (a debug indicator that doesn't ship to prod by default)."
  - "Materials produced by the engine surface render identically (within a tolerable perceptual delta — eyeball the editor/hero/play surfaces side-by-side) on WebGPU and WebGL paths. No black/missing materials, no broken skinning, no lipsync regression."
  - "Bundle delta after the rewrite is within +20% of today's bundle on the homepage route (tracked via `next build` output)."
  - "The captureFaceThumbnail rebake on WebGPU produces a PNG byte-equivalent (or near-equivalent) to the WebGL path — verified by writing a single character thumbnail under each backend and comparing pixel diff."
depends_on: []
related_plans:
  - app-beta-production
  - app-nav-and-positioning  # phase 6 (plaza polish) unblocks once the singleton-store coupling lands as a side effect
  - app-thumbnails           # the gl.readRenderTargetPixels path gets replaced; the rig (camera/framing/sizes) stays
related_wiki:
  - wiki/architecture/stores.md
  - wiki/architecture/app-structure.md
wiki_sync:
  required: true
  done: false
  pages: []
  notes: "On full-plan completion: new wiki/architecture/engine.md documenting the renderer-switch contract, the TSL material conventions, the TypeScript boundary, and the per-character config-driven render path that lands as a side effect of the refactor."
archive:
  eligible: false
  reason: "Foundational sub-plan; remains active until all phases ship."
---

# Engine rewrite — TypeScript + WebGPU/TSL coupled

Sub-plan of [app-beta-production](app-beta-production.md). Each engine file gets touched **once**: `.jsx` → `.ts(x)` + classic Three.js material → TSL node material + WebGL renderer → WebGPU renderer with fallback. Coupled per the charter decision so hot paths aren't rewritten twice.

This plan also carries the refactor that decouples the singleton `useConfiguratorStore` from `Avatar` / `Asset` / `SkinManager`. That coupling is what blocked [phase 6 of app-nav-and-positioning](app-nav-and-positioning.md#phase-6--plaza-polish-deferred-) (the multi-character plaza). Both deliverables ship from the same set of file conversions.

## Inventory

*Captured 2026-05-23.*

| File | LOC | Store-coupling refs | Owns | Migration notes |
|---|---:|---:|---|---|
| `src/components/scene/Backdrop.jsx` | 35 | 0 | Stool + floor plane + plant from a GLB | Pure leaf. Best spike target — no store reads, three meshes. |
| `src/lib/lipsync.js` | 16 | 0 | Singleton `Lipsync` from `wawa-lipsync` | TS-only conversion; no rendering, no WebGPU. |
| `src/components/scene/LipsyncDriver.jsx` | 35 | 2 | Per-frame poll of lipsync analyser → morph values | TS + minor refactor; no material changes. |
| `src/components/scene/SkinManager.jsx` | 54 | 3 | Composes overlay textures + applies skin colour | TS + texture-compose stays as canvas2d; material assignment moves to TSL `MeshStandardNodeMaterial`. |
| `src/components/scene/Asset.jsx` | 131 | 8 | Per-customization-slot skinned mesh + colour application + morph registration | TS + TSL materials. **Decouple from `useConfiguratorStore`**: accept `entry`, `skeleton`, callbacks via props/context instead of reading the store directly. |
| `src/components/scene/CameraManager.jsx` | 165 | 4 | Editor-mode camera switching + bone-targeted framing | TS. Renderer-agnostic; no material work. |
| `src/components/scene/Avatar.jsx` | 201 | 6 | Singleton character render — armature + animations + asset slot iteration + export pipeline | TS + TSL where materials are touched. **Decouple from store**: take a `character` prop with full customization payload; the store wraps it for the editor's case. |
| `src/components/scene/Scene.jsx` | 185 | 5 | R3F Canvas wrapper + lights + screenshot/thumbnail capture | TS. Renderer-switch lives here (<Canvas gl={...}>). |
| `src/components/scene/exportWorker.js` | 432 | 0 | Web Worker — gltf-transform pipeline (bake morphs, strip bones, optimize, Draco) | TS-only conversion. Worker context; no WebGPU. |

Total: ~1254 LOC across 9 files.

## Decisions

### Renderer selection — where it lives

The renderer switch happens at the **`<Canvas>` boundary in Scene.jsx**. R3F accepts a custom renderer factory via the `gl` prop:

```ts
import * as THREE from "three";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

const factory: ConstructorParameters<typeof Canvas>[0]["gl"] = async (canvas) => {
  if (await canWebGPU()) {
    const r = new WebGPURenderer({ canvas, antialias: true });
    await r.init();
    return r;
  }
  return new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
};
```

`canWebGPU()` probes `navigator.gpu` *and* successfully requests an adapter. We don't trust feature detection alone — some browsers expose `navigator.gpu` but fail to instantiate on first use. Falling back per-canvas means the editor and HeroStage can independently degrade.

The active renderer is exposed via a `useRendererBackend()` hook that reads from the R3F `state.gl` (`gl.isWebGPURenderer` exists; can also check `gl.backend?.constructor.name`). A small debug overlay component (`<RendererBadge />`) renders this when `process.env.NEXT_PUBLIC_DEV_OVERLAYS === "1"`; default off in prod.

### TSL adoption — hybrid, not all-or-nothing

Every engine file the rewrite touches gets converted to TSL node materials *for any materials it owns*. Files that only consume materials (CameraManager, LipsyncDriver) don't introduce new TSL nodes — they stay material-agnostic.

Materials authored as plain `MeshStandardMaterial({ color, roughness, metalness, map })` collapse cleanly to `MeshStandardNodeMaterial`. Custom shader code (if any surfaces — none today in the inventory) gets ported to TSL `Fn(...)`. No shader strings in `.tsl.ts` files unless a shader genuinely needs to live separately.

### TypeScript boundary

The engine surface is migrated to TS in this plan. Everything else stays JSX:

- **In scope**: `src/components/scene/**`, `src/lib/lipsync.js`, `src/lib/utils.js` (depended on transitively).
- **Out of scope**: `src/components/{ui,shell,hub,home,editor,me,play,character,admin}/**`, `src/app/**`, `src/stores/**` (the stores get *narrow types added* — see below — but stay `.js`).
- **Stores get types**: `useConfiguratorStore` and `useAuthStore` get JSDoc `@typedef` blocks for the shapes the engine consumes (`Character`, `CustomizationEntry`, `Asset`). The store stays `.js` so other parts of the app don't drag a TS conversion they didn't ask for; the engine surface gets the types it needs via JSDoc-published interfaces.

`tsconfig.json` is added with `noEmit: true` and `allowJs: true` so `tsc` typechecks the engine without requiring the rest of the project to migrate. `bun lint` keeps running Biome on `.js` and `.ts(x)` uniformly. Build path: Next.js + SWC handles TS automatically.

### Store decoupling — happens during the file conversions, not before

`Avatar`, `Asset`, `SkinManager` currently read directly from `useConfiguratorStore`. The rewrite changes each to accept its data via **props or a `CharacterContext`** (a small React context that the editor's `<Scene>` wraps with the store's slice, and that other surfaces — HeroStage today, plaza tomorrow — can wrap with their own data).

This is the same refactor that would land separately for the plaza; doing it inside the file-by-file rewrite means each file is touched once. The editor experience is preserved because the editor's wrapper still reads from the store.

### File-by-file order

Leaves first (no dependents), then merge upward. Each phase is its own commit, atomic and reviewable in isolation.

| Phase | File(s) | Why this order |
|---|---|---|
| 1 | `Backdrop.jsx` | Zero store coupling, three meshes — the spike that validates the renderer-switch + TSL recipe. |
| 2 | `src/lib/lipsync.js` + `LipsyncDriver.jsx` | Renderer-agnostic; TS-only conversion proves the worker + Next.js TS pipeline. |
| 3 | `SkinManager.jsx` | Material work but no rendering structure changes. |
| 4 | `Asset.jsx` | Material work + the first big decoupling refactor (store → props/context). |
| 5 | `Avatar.jsx` | Material work + decoupling + the export pipeline rendezvous. The biggest file. |
| 6 | `CameraManager.jsx` | TS-only; renderer-agnostic. |
| 7 | `Scene.jsx` | The wrapper. Renderer-switch ships here. Screenshot/thumbnail capture moves through WebGPU's equivalents. |
| 8 | `exportWorker.js` | TS-only. Worker context; gltf-transform pipeline stays unchanged. |

Phase 8 stays last because it's the most independent and the most risk-free.

## Phase 0 — Discovery & design ✅

Shipped with this plan-file commit:

- [x] Inventory of every engine file with LOC + store coupling.
- [x] Decisions: renderer-selection strategy, TSL adoption pattern, TypeScript boundary, store-decoupling approach, file-by-file order.
- [x] Success criteria written (see frontmatter).
- [ ] **Spike: convert Backdrop.jsx end-to-end** — *deferred to Phase 1 ship.* The reason: a TS+TSL+WebGPU conversion needs real-hardware verification (WebGPU adapter init succeeds, materials render identically, no driver-specific glitches). That verification requires running the editor on at least one WebGPU-capable browser and at least one WebGL-fallback browser — not something that lints clean and is "done"; it needs eyeballing. Phase 0 ships the design; the spike is the first real-code phase.

## Phases 1–8 — file conversions

Each phase ships one file (or pair) converted end-to-end per the order above. The conversion itself splits into **two layers**:

- **(a) TS conversion** — rename `.jsx` → `.tsx` (or `.js` → `.ts`), add types, fix any inference gaps. Low-risk; verifiable via `bun run build`. Can be done in-session without hardware.
- **(b) TSL/WebGPU conversion** — replace classic Three materials with TSL node materials; the renderer-switch factory lives in Scene.jsx (Phase 7). Needs **real-hardware verification** on a WebGPU-capable browser + a WebGL-fallback browser; not "done" when lint passes.

Phases land their (a) layer first as fast inline work; (b) follows in a hardware-verification session.

### Phase 1a — Backdrop TS ✅

Shipped 2026-05-23.

- `src/components/scene/Backdrop.tsx` (was `.jsx`). Typed via `ThreeElements["group"]` for the props and a literal `BackdropGLTF` extending drei's `GLTF` for the GLTF nodes/materials. Cast through `unknown` per drei TS docs.
- `tsconfig.json` added (noEmit, allowJs, strict basics: noImplicitAny + strictNullChecks). Scoped via `include` to the engine surface so the TS check doesn't drag the rest of the codebase.
- `bun add -d typescript @types/three @types/react @types/react-dom @types/node` — TS toolchain installed.
- `bun run build` clean. Next.js auto-handles `.tsx` via SWC; no config change needed.

### Phase 1b — Backdrop TSL/WebGPU

- [ ] Convert the floor's `<meshStandardMaterial>` to a TSL `MeshStandardNodeMaterial`. (Stool + plant materials come from the GLB and don't need TSL conversion.)
- [ ] Add the renderer-switch factory in Scene.jsx (Phase 7 normally, but the spike justifies landing the minimum factory now).
- [ ] Verify on Chrome (WebGPU adapter init succeeds, material renders correctly) and Safari (WebGL fallback path, material renders correctly).
- [ ] Measure perf + bundle delta. Tighten the plan's "perceptual delta — eyeball it" success criterion to a numeric tolerance based on the measurement.

### Phase 2a — Lipsync TS ✅

Shipped 2026-05-23.

- `src/lib/lipsync.ts` (was `.js`). Typed the singleton + return type.
- `src/components/scene/LipsyncDriver.tsx` (was `.jsx`). Typed the store selector parameter inline (the store stays `.js` per the TypeScript boundary decision; consumers get the narrow type they need at the call site).
- `bun run build` clean.

### Phase 2b — Lipsync TSL/WebGPU

Lipsync has no rendering — it polls the analyser and pushes morph values. Nothing to convert to TSL. **No (b) phase**; Phase 2 is TS-only end-to-end.

### Phase 3a — SkinManager TS ✅

Shipped 2026-05-23. Typed the store slice (skin material + customization map), the per-entry CustomizationEntry, and the URL-resolution path through `pb.files.getURL`. `useDebounce` made generic. `bun run build` clean.

### Phase 6a — CameraManager TS ✅

Shipped 2026-05-23. Typed the `CAMERA_CONFIGS` record + `Triplet` helper for `[x,y,z]` constants + the store slice (currentCategory, height, mode). `controls` ref typed via the `CameraControls` class. `useControls` callbacks now narrow the optional ref + pass a `THREE.Vector3()` to `getPosition`/`getTarget` (was untyped). No behavior change.

### Phase 7a — Scene TS ✅

Shipped 2026-05-23. Typed the `composeWithLogo` signature (`HTMLCanvasElement → Promise<Blob | null>`) and the three store-setter callbacks (`ScreenshotFn`, `CaptureFn`) so the engine surface declares its IO contract. Typed `SceneContent`'s `children` as `ReactNode`. Promise + canvas + RenderTarget surfaces typed inline — `gl.domElement` cast to `HTMLCanvasElement` (R3F's `WebGLRenderer.domElement` is typed as the broader DOM `HTMLCanvasElement | OffscreenCanvas` union). Captured the explicit `Promise<Blob | null>` return so `toBlob`'s callback type narrows correctly. No behavior change.

### Phases 4a, 5a, 8a (remaining)

Heavier, deferred for focused sessions:

- **Phase 4a (Asset.tsx)** — 131 LOC, 8 store refs. The store coupling is heavy; the natural moment to introduce CharacterContext for the (b) decoupling work. Doing (a) without (b) here is possible but the result is a tangle.
- **Phase 5a (Avatar.tsx)** — 201 LOC, 6 store refs, plus the worker bridge to exportWorker. Same CharacterContext question.
- **Phase 8a (exportWorker.ts)** — 432 LOC, 0 store refs. Skipped on first pass: the worker is loaded via `new URL("./exportWorker.js", import.meta.url)` in Avatar.jsx; Next.js's worker bundling is sensitive to the literal extension. Conversion needs either a careful URL update in Avatar + verification that turbopack still emits the worker chunk, or a defer-until-Avatar-converts strategy. Low value (no store, no React, library code) — leave for last.

### Phases 1b–7b (TSL/WebGPU)

Reserved for the hardware-verification session. The renderer-switch factory (Phase 7b normally, or layered onto an earlier phase as a feature flag) ships before any material conversion goes live so each material can be A/B'd on the two backends.

## Phase 9 — Wiki sync & close (deferred)

When all file conversions land:

- [ ] New `wiki/architecture/engine.md` documenting: renderer-switch contract (probe + fallback), TSL material conventions, where the TypeScript boundary sits and why, how a new file is added to the engine surface, the `CharacterContext` API.
- [ ] Update [wiki/architecture/stores.md](../wiki/architecture/stores.md) to note the JSDoc-published interfaces engine consumers depend on.
- [ ] [app-nav-and-positioning phase 6 (plaza polish)](app-nav-and-positioning.md#phase-6--plaza-polish-deferred-) becomes unblocked — the multi-character render path stops needing workaround clones.
- [ ] Flip `wiki_sync.done: true`, `status: implemented`, `readiness: reference`.

## Open questions (resolve as phases land)

- WebGPU adapter requirements for our material set: do we need any optional features (timestamp queries for perf debug, shader-f16 for bandwidth) or is the default adapter enough? Resolve in Phase 1 with `adapter.features` introspection.
- Web Worker WebGPU: the export worker pipeline uses Three on the main thread today (via `GLTFExporter` followed by a worker-side processing pass). Does the WebGPU path keep this split, or move all of `GLTFExporter.parse(...)` into the worker? Resolve in Phase 8.
- `tsconfig` strictness: start `strict: false` to keep migrations fast, or `strict: true` from day one? Recommend `strict: false` + `noImplicitAny: true` for the engine slice; tighten when the surface is stable.

## Wiki sync

_Filled before flipping `status: implemented` (Phase 9). Phase 0 design landed today; the wiki page for the engine ships when phases 1-8 close._
