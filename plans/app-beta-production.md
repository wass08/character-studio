---
plan_id: app-beta-production
title: Beta production — characters-first studio
status: in_progress
kind: living-plan
priority: p0
last_reviewed: 2026-05-23
goal: "Ship a public beta of character-studio: characters-first IA, polished hub with a live 3D wall of community characters, mobile-responsive editor, WebGPU/TS engine, shadcn UI everywhere, fixed thumbnails."
readiness: ready
success_criteria:
  - "Homepage shows one big live 3D character (the user's main if signed-in, a curator-featured demo otherwise) above the existing 2D card gallery — verified on /. Multi-character 'plaza' wall is post-beta polish (see [app-nav-and-positioning phase 6](app-nav-and-positioning.md#phase-6--plaza-polish-deferred-))."
  - "Top-level chrome subordinates experiences to characters (no 'Experiences' as a sibling) — verified by chrome on every route."
  - "Editor at /create works fluidly on a 390 px-wide viewport — verified by manual run + Lighthouse mobile audit ≥ 90 perf."
  - "Engine code (scene, drivers, materials) is TypeScript and renders via WebGPU/TSL where supported, with a WebGL fallback — verified by `tsc --noEmit` clean + Chrome `chrome://gpu` showing WebGPU active."
  - "All chrome and editor panels use shadcn primitives; no bespoke button/dialog/popover left — verified by grep audit in the wiki sync."
  - "Character thumbnails are sharp (≥ 512² rendered, anti-aliased, properly lit) — verified by side-by-side before/after on /me and the hub wall."
depends_on: []
related_plans:
  - app-nav-and-positioning
related_wiki:
  - wiki/architecture/app-structure.md
  - wiki/architecture/stores.md
  - wiki/architecture/data-model.md
wiki_sync:
  required: false
  done: true
  pages: []
  notes: "Charter only — workstreams ship rules through their own sub-plans, each of which carries its own wiki_sync."
archive:
  eligible: false
  reason: "Active charter for the beta cycle."
---

# Beta production — characters-first studio

The hub launch ([app-hub-launch](app-hub-launch.md)) gave us routes, chrome, and a saving flow. The gap from there to "public beta" is a coherent product positioning, an engine we trust on every device, and visible quality. This charter owns the whole arc; each workstream below ships as its own sub-plan when picked up.

## North star

**The product is characters.** Experiences (lipsync, platformer, playground, future ones) are how you try a character — not parallel destinations. Every IA, label, and visual cue should make that obvious within five seconds on the homepage.

Long-term inspiration for the homepage: the Nintendo Mii plaza — a wall of characters waving, idling, looking around, named on hover. That feeling is the bar — and the [`/lab/wall`](../src/app/lab/wall/page.js) prototype proved the canvas pattern works. But the beta v1 ships a *simpler* hero: **one big live 3D character** doing the heavy lifting visually, with the 2D card gallery for community proof below. Reasoning: the engine rewrite refactors the store-coupled character pipeline, after which the multi-character plaza becomes much cheaper to ship. Polishing the plaza on workaround clones before the rewrite would mean touching that code twice. See [app-nav-and-positioning phase 6](app-nav-and-positioning.md#phase-6--plaza-polish-deferred-) for the deferred plaza work.

## Workstreams

Listed in execution order. Each row links to a sub-plan once materialised (via [`start-plan`](../.agents/skills/start-plan/SKILL.md)); until then, the workstream lives in this charter.

| # | Workstream | Sub-plan | Priority | Status | Depends on | Why this order |
|---:|---|---|---|---|---|---|
| 1 | Nav + positioning + single-hero homepage (plaza polish deferred to phase 6) | [app-nav-and-positioning](app-nav-and-positioning.md) | p0 | **implemented** | — | Phases 1, 3, 4, 5 shipped. Phase 2 paused on /lab/wall prototype (kept as a deliberate reference). Plaza polish is phase 6, gated by #3 (engine rewrite). |
| 2 | shadcn-everywhere sweep | [app-shadcn-everywhere](app-shadcn-everywhere.md) | p1 | **implemented** | #1 phase 1 | Five-phase plan all done. 22 files migrated to shadcn Button, primitives/Dialog/Tooltip/Toast/IconButton rebuilt as shims, AccountIdentity + CharacterChip on shadcn dropdown/popover. Wiki sync landed. |
| 3 | Engine rewrite — TS + WebGPU/TSL coupled | [app-engine-rewrite](app-engine-rewrite.md) | p1 | in_progress | — | Phase 0 (discovery + design + criteria) shipped: inventory, renderer-switch strategy, TSL adoption pattern, TS boundary, file order, store-decoupling approach. Phase 1+ (actual file conversions) reserved for a hardware-verification session. |
| 4 | Editor mobile responsiveness | [app-editor-mobile](app-editor-mobile.md) | p2 | **implemented** | #2 | ModeSelector pill mobile-first refactor (the Tailwind v4 footgun fix); tighter mobile padding; wiki conventions for positioning + touch targets locked. Real-device gesture testing reserved for beta verification. |
| 5 | Thumbnail quality (resolution + framing) | [app-thumbnails](app-thumbnails.md) | p2 | **implemented** | #2 | Phase 1 shipped: 512² stored, 1024² rendered for 2× supersampling AA, head+shoulders framing. Phases 2 (portrait lighting) and 3 (rebake existing) deferred behind the engine rewrite. |
| 6 | Experiences polish | [app-experiences-polish](app-experiences-polish.md) | p3 | draft (blocked) | #3 | Skeleton opened; deferred behind the engine rewrite. Per-experiment sub-plans (lipsync/platformer/playground) materialise when polish work starts. |

### 1. Nav + hub positioning

Active sub-plan: [app-nav-and-positioning](app-nav-and-positioning.md). Outcomes the charter expects:

- The vocabulary (what we call the homepage, the editor, the experiences hub, the user's collection) locked and reflected in [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md).
- The Mii-wall homepage prototype proven (perf, layout, hover affordances).
- A migration checklist for the rest of the app (every label, every link, every route name).

### 2. shadcn-everywhere

Sub-plan: [app-shadcn-everywhere](app-shadcn-everywhere.md). Audit `src/components/**` for bespoke UI then migrate per-primitive. The hub launch installed shadcn into the admin shell; this sweep brings the rest of the surface up to the same baseline. Has to land before #4 and #5 so they sit on the locked design language.

### 3. Engine rewrite — TS + WebGPU/TSL coupled

Sub-plan: [app-engine-rewrite](app-engine-rewrite.md). Per the [decision](#how-we-work-this), TypeScript and WebGPU/TSL ship as one migration — each engine file touched **once**. Scope: `src/components/scene/**`, `src/lib/lipsync.js`, shaders, materials, lighting, post-FX. Runs in parallel on its own branch.

The discovery phase (phase 0) writes the success criteria after a spike on a leaf file. The phase also writes the refactor that lets per-character config (not the singleton store) drive rendering — which is what unblocks [app-nav-and-positioning phase 6](app-nav-and-positioning.md#phase-6--plaza-polish-deferred-) (the plaza).

### 4. Editor mobile

`/create` is the hardest mobile target — three-column editor, a 3D canvas, live previews. Goals:

- Single-column layout at < 768 px with a docked bottom-sheet for tool panels.
- Canvas takes ≥ 60% of viewport height with the toolbar overlaying it.
- All gestures keyboard-replaceable / touch-friendly (no hover-only affordances).

Depends on #2 (shadcn) so the primitives behave correctly at small sizes before any breakpoint work lands.

### 5. Thumbnail quality

Symptoms today: low render resolution, harsh / inconsistent lighting, no consistent framing. Target:

- Render at ≥ 512² with MSAA or post-AA, downscale-export to a 256² display asset (or keep 512² if file-size budget allows).
- A dedicated thumbnail rig (camera, lights, environment, optional ground shadow) shared by the editor, `/me`, and any new automatic rebake.
- Rebake-existing flow for already-saved characters.

**Reordered behind #2 and #3** (2026-05-23) because both will sweep through the surfaces and pipeline this work would touch: shadcn migrates every card that displays a thumbnail; the engine rewrite replaces the `gl.readRenderTargetPixels` capture itself. Doing thumbnails first would mean redoing them when those land. Create the sub-plan via `start-plan` once shadcn is close to done.

### 6. Experiences polish

Lipsync, platformer, playground all need polish — gameplay tuning, camera, controls, UI density. Deliberately deferred until the IA (so we know how experiences are framed) and the engine (so we don't polish twice) are settled.

## Non-goals for beta

- Multi-character scenes / shared sessions.
- User-facing customisation of the experiences themselves (settings panels).
- Marketplace, billing, plugin packs.
- Migrating non-engine code to TypeScript (UI, routes) — earned later.

## How we work this

- **Codex as integration agent.** For each sub-plan, I (Claude) own the charter, the per-file design decisions, the wiki sync, and the review. Codex picks up well-scoped integration slices when they are mechanical, repetitive, or large (e.g. converting N files in the engine rewrite, applying the shadcn migration across panels, doing the rename pass after #1 lands). The sub-plan body must call out exactly which slices go to Codex and which I keep — see the [`codex:codex-rescue`](../.agents/skills/) usage pattern in CLAUDE.md.
- **One commit, one rule.** When a sub-plan ships, its wiki sync lands in the same commit (or the immediately-following commit) — gate enforced by `wiki_sync.done` in the sub-plan frontmatter and by the [open-pr](../.agents/skills/open-pr/SKILL.md) skill.
- **Update this charter when scope moves.** A workstream that splits, gets descoped, or absorbs another → reflect it in the table above and in the affected sub-plan's `related_plans`.

## Beta gate (checklist)

These collapse the success criteria into a reviewable list. Charter flips to `verification` when all are ticked, `implemented` when verified on a deployed beta build.

- [x] Vocabulary lock + nav reflects it (sub-plan #1, phase 1 — shipped on `b5fb384`)
- [x] Single-character homepage hero shipped (sub-plan #1, phase 3 — shipped on `6d7ca36`)
- [x] App-wide rename pass + redirects (sub-plan #1, phase 4 — shipped on `d97ce35` / `ce20aaf` / `32bfa8d`)
- [x] Thumbnails meet target spec on new characters (sub-plan #5 — Phase 1 shipped; rebake of existing characters is deferred Phase 3)
- [x] shadcn audit clean — no bespoke primitives left (sub-plan #2 — shipped on `46de33e` / `384dbfa` / `09eeb43` / `f0c05e5`)
- [x] Editor usable at 375 px wide — chrome reachable, no overlap (sub-plan #4 shipped). Lighthouse perf measurement reserved for beta verification.
- [ ] Engine renders via WebGPU/TSL with WebGL fallback; `tsc --noEmit` clean on engine surface (sub-plan #5)
- [ ] Smoke test pass on Chrome / Safari / Firefox, desktop + mobile

## Cross-cutting risks

- **Vocabulary lock late = thrash.** Sub-plan #1 has to land before #3/#4 start, or the rename will hit every component twice.
- **WebGPU support gaps.** Safari mobile / older Android won't get WebGPU; the fallback isn't optional. Engine sub-plan must define the probe and the fallback path in its phase-1.
- **Engine rewrite blocking experiences polish.** Acceptable — #6 is explicitly deferred. If polish becomes urgent before #5 ships, branch a thin polish-only plan that touches gameplay/UI only.

## Wiki sync

This charter doesn't carry rules of its own; each sub-plan owns its wiki sync. When the charter flips to `implemented`, this section will summarise which wiki pages the beta cycle touched, by sub-plan.
