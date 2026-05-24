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
| 1 | Nav + positioning + single-hero homepage (plaza polish deferred to phase 6) | [app-nav-and-positioning](app-nav-and-positioning.md) | p0 | in_progress | — | Phase 1 done (vocabulary lock). Phase 2 paused on /lab/wall prototype — pivoted to a single-character hero for v1. Plaza polish is phase 6, gated by the engine rewrite. |
| 2 | Thumbnail quality (resolution + lighting) | _(create when started)_ | p1 | draft | — | Small, self-contained, makes the wall and `/me` feel serious immediately. |
| 3 | shadcn-everywhere sweep | _(create when started)_ | p1 | draft | #1 | Lock the design language before doing the mobile pass so we don't migrate twice. |
| 4 | Editor mobile responsiveness | _(create when started)_ | p2 | draft | #3 | Mobile-correct shadcn primitives → meaningful breakpoint work on the editor. |
| 5 | Engine rewrite — TS + WebGPU/TSL coupled | _(create when started)_ | p1 | draft | — | Runs in parallel on its own branch; each engine file is touched once (TS + TSL together). |
| 6 | Experiences polish | _(create when started)_ | p3 | draft | #1, #5 | Deferred until the IA and engine stabilise — polishing on shifting ground is waste. |

### 1. Nav + hub positioning

Active sub-plan: [app-nav-and-positioning](app-nav-and-positioning.md). Outcomes the charter expects:

- The vocabulary (what we call the homepage, the editor, the experiences hub, the user's collection) locked and reflected in [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md).
- The Mii-wall homepage prototype proven (perf, layout, hover affordances).
- A migration checklist for the rest of the app (every label, every link, every route name).

### 2. Thumbnail quality

Symptoms today: low render resolution, harsh / inconsistent lighting, no consistent framing. Target:

- Render at ≥ 512² with MSAA or post-AA, downscale-export to a 256² display asset (or keep 512² if file-size budget allows).
- A dedicated thumbnail rig (camera, lights, environment, optional ground shadow) shared by the editor, `/me`, and any new automatic rebake.
- Rebake-existing flow for already-saved characters.

Create the sub-plan via `start-plan` and capture exact targets there.

### 3. shadcn-everywhere

Audit `src/components/**` for bespoke UI: any `<button>` that isn't a shadcn `Button`, any custom dialog/popover/select, any tooltip not using the shadcn wrapper. The hub launch installed shadcn into the admin shell; this sweep brings the rest of the surface up to the same baseline.

### 4. Editor mobile

`/create` is the hardest mobile target — three-column editor, a 3D canvas, live previews. Goals:

- Single-column layout at < 768 px with a docked bottom-sheet for tool panels.
- Canvas takes ≥ 60% of viewport height with the toolbar overlaying it.
- All gestures keyboard-replaceable / touch-friendly (no hover-only affordances).

Depends on shadcn-everywhere so the primitives already behave correctly at small sizes.

### 5. Engine rewrite — TS + WebGPU/TSL coupled

Per the [decision](#how-we-work-this), TypeScript and WebGPU/TSL ship as one migration: each engine file gets touched **once** (`.js` → `.ts` + classic Three.js material → TSL node material + WebGL renderer → WebGPU renderer with fallback). Scope:

- `src/components/scene/**`, `src/lib/lipsync.js`, shaders, materials, lighting, post-FX.
- Renderer switch at the `<Canvas>` boundary with a WebGPU support probe and a clear fallback path.
- Type baseline for `src/stores/**` and a `tsconfig.json` strict enough to be useful without blocking shipping.

Out of scope for this rewrite: UI components, route handlers, server code — converted later if/when they earn their TS migration cost.

This workstream can run on its own branch in parallel with #1–#4 because it touches a mostly orthogonal slice.

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
- [ ] Single-character homepage hero shipped (sub-plan #1, phase 3 — pivoted from "Mii-style wall" after the multi-character prototype hit deferred polish; the plaza is post-beta in phase 6)
- [ ] Thumbnails meet target spec on both new and re-baked characters (sub-plan #2)
- [ ] shadcn audit clean — no bespoke primitives left (sub-plan #3)
- [ ] Editor passes mobile Lighthouse ≥ 90 perf, usable at 390 px wide (sub-plan #4)
- [ ] Engine renders via WebGPU/TSL with WebGL fallback; `tsc --noEmit` clean on engine surface (sub-plan #5)
- [ ] Smoke test pass on Chrome / Safari / Firefox, desktop + mobile

## Cross-cutting risks

- **Vocabulary lock late = thrash.** Sub-plan #1 has to land before #3/#4 start, or the rename will hit every component twice.
- **WebGPU support gaps.** Safari mobile / older Android won't get WebGPU; the fallback isn't optional. Engine sub-plan must define the probe and the fallback path in its phase-1.
- **Engine rewrite blocking experiences polish.** Acceptable — #6 is explicitly deferred. If polish becomes urgent before #5 ships, branch a thin polish-only plan that touches gameplay/UI only.

## Wiki sync

This charter doesn't carry rules of its own; each sub-plan owns its wiki sync. When the charter flips to `implemented`, this section will summarise which wiki pages the beta cycle touched, by sub-plan.
