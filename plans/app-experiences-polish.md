---
plan_id: app-experiences-polish
title: Experiences polish — lipsync, platformer, playground
status: draft
kind: living-plan
priority: p3
last_reviewed: 2026-05-25
goal: "Tighten the three per-character experiments (Lipsync, Platformer, Playground) into shippable, fun mini-experiences. Gameplay tuning, camera, controls, UI density."
readiness: ready
success_criteria:
  - "Phase 1 (this plan): one-paragraph shippable spec per experiment, each naming a target-feel reference + 3–6 pass/fail markers + the smallest unblock-launch change set. Proof = the three checked entries below."
  - "Phase 2+ (sub-plans): each experiment's Phase 1 spec landed end-to-end with its `app-experiences-<name>.md` sub-plan flipping to `implemented` + wiki sync done."
depends_on:
  - app-nav-and-positioning        # phase 6 plaza polish optionally informs how experiments are framed
related_plans:
  - app-beta-production
  - app-experiences-playground   # promoted 2026-05-25 — first per-experiment sub-plan
related_wiki: []
wiki_sync:
  required: true
  done: false
  pages: []
  notes: "Each experiment likely earns its own short wiki page (controls, character contract, perf budget) when its polish phase lands."
archive:
  eligible: false
  reason: "Skeleton — kept active so the deferral doesn't get lost."
---

# Experiences polish

Sub-plan of [app-beta-production](app-beta-production.md). **Unblocked 2026-05-25** — the original blocker was the singleton-store coupling in `Avatar` / `Asset` / `SkinManager` that made per-character polish risky. That decoupling shipped with [app-engine-rewrite Phases 4a + 5a](app-engine-rewrite.md#phase-4a--asset-ts--charactercontext-decoupling-) via `CharacterContext` + `StoreCharacterProvider`. The remaining engine work (TSL/WebGPU `(b)` layer) is hardware-gated and orthogonal to gameplay polish, so it doesn't block this plan.

## Why this exists as a skeleton

The three per-character routes (`/c/[id]/try/{lipsync,platformer,playground}`) ship today and *work* — they just don't feel finished:

- **Lipsync** — audio analyser + viseme morphs are wired but the voice preset roster is small and the framing could showcase the talking better.
- **Platformer** — the bvhecctrl-based controls work but movement tuning, camera follow, level geometry, level reset are all rough.
- **Playground** — pose + capture flow exists but the photo bookcamera, lighting presets, and gallery save flow need a pass.

Each one is its own polish workstream. They share no code that's worth combining a plan for. The original engine-rewrite gating is now resolved (see header).

## Phases

### Phase 1 — Define scope per experiment (READY)

Write specific success criteria for each of the three experiments. Currently they're "feels finished" — a real definition needs:

- Target feel reference (a video / GIF / metaphor — e.g. "Platformer should feel like the Tomba demo").
- Concrete pass/fail markers per experiment.
- Whether polish is shipped behind a "beta" toggle or to all users.

Specs drafted 2026-05-25. Each is a paragraph + a short marker list + the smallest unblock-launch change set, so the next agent can promote any one of them to its own `app-experiences-<name>.md` sub-plan via `/start-plan` without rediscovering scope.

- [x] **Lipsync** ([LipsyncView.jsx](../src/components/play/LipsyncView.jsx)) — Today the analyser + viseme morphs are wired through `LipsyncDriver` (singleton `getLipsync()` from [lipsync.ts](../src/lib/lipsync.ts)), voice presets come from `CharacterStudioVoicePresets` (gender-matched first, then the rest), file upload works, and the view locks `UI_MODES.PHOTO` on mount — which is a full-body framing, not the face-centered framing the file comment claims. **Target feel:** Apple Memoji karaoke / Genmoji speak preview — clear viseme readability, the face is the subject, the bottom bar feels like a music-player widget. Talking should look like talking, not chewing. **Shippable markers:** (1) a dedicated portrait framing on play — face fills ~40 % of viewport, no neck-down crop; either a new `UI_MODES.LIPSYNC` or a one-shot camera override in `CameraManager.tsx`; (2) ≥ 8 admin-curated voice presets covering male / female / neutral; (3) waveform or VU-peak bars in the bottom bar (the `wawa-lipsync` analyser already exposes per-frame energy); (4) mic-input "Live" toggle using the analyser's real-time path, with a clear "mic off → preset" affordance; (5) mobile: bottom bar collapses to one row and never overlaps the chip header; (6) audio context resumes cleanly after Safari background-tab suspends. **Smallest unblock-launch change set:** (a) add the portrait framing in the existing camera path (no new mode if `PHOTO_POSES.Portrait` already exists), (b) seed the preset roster (admin task, no code), (c) confirm `wawa-lipsync` exposes the per-frame energy the waveform would need — defer the waveform render to Phase 2 if it doesn't. **Rollout:** ship to all users, no toggle — current state is already functional.
- [x] **Platformer** ([PlatformerView.jsx](../src/components/play/PlatformerView.jsx)) — Today it's a *kinematic* controller (not BVHEcctrl — the parent plan's wording is stale): WASD / arrows + Shift-run on a 60×60 plane with 10 decorative boxes in a ring, follow camera at a fixed `(y+3, z+6)` offset, soft world-clamp at ±28, Idle / Walk pose swap on movement. No jump, no collision, no reset. **Target feel:** *A Short Hike* — gentle wander, generous deadzones, the character is the focus and the level is a stage. Not Mario, not Fortnite. **Shippable markers:** (1) one real obstacle that proves traversal matters — a low hill or a ramp, not decorative cubes; (2) Space-to-jump with a readable arc + landing snap (simple gravity integration, no `BVHEcctrl` dependency yet); (3) `R` resets to spawn (currently no way out if you wedge against the soft clamp); (4) the existing Walk pose split into Walk / Run so the Shift modifier reads visually; (5) follow camera respects the world edge — don't reveal the void past ±28; (6) mobile: either a clean "Desktop only" gate or a touch joystick + jump tap (no extra lib — PointerEvents). **Smallest unblock-launch change set:** (a) implement Space-jump with one-axis physics (`vy += g*dt`, snap to ground at y=0), (b) add one ramp mesh that makes jump useful, (c) bind `R` to a position reset, (d) gate mobile with a "Desktop only" banner — touch controls become Phase 3. The Walk / Run pose swap is conditional on the rig actually shipping a Run clip; verify with `PHOTO_POSES.Run` before adding the branch. **Rollout:** ship to all users, no toggle.
- [x] **Playground** ([PlaygroundView.jsx](../src/components/play/PlaygroundView.jsx)) — Today it's the standard `<Scene>` in `UI_MODES.PHOTO` + `<PosesBox>` (the pose-pill row from the editor) + `<PhotoGalleryBox>` (left rail, 24 most-recent `CharacterStudioPhotos`, capture writes via `savePhoto()`, download via `screenshot()`, gallery hidden on mobile via `max-md:hidden`). Login-gated capture. **Target feel:** a Polaroid booth — one character, infinite cute poses, instant share. Tight loop: pick pose → snap → thumbnail animates in → repeat. **Shippable markers:** (1) 2–3 backdrop / lighting presets exposed inline (the current single `Backdrop.tsx` look is the whole world); (2) mobile gallery — bottom sheet, not the desktop left rail; (3) per-photo "Copy link" affordance landing on `/c/[id]?photo=<id>` (or a public photo route) so the booth has a payoff beyond the user's own gallery; (4) the existing capture flash already animates the thumbnail in — make it punchier (haptic-style ring or a shutter blink) so the save is unmistakable; (5) optional caption per photo (PB field add — defer unless a sub-plan picks it up). **Smallest unblock-launch change set:** (a) add a `backdrop` enum to [Backdrop.tsx](../src/components/scene/Backdrop.tsx) with 2 alternates + a small toggle UI in the Playground chrome, (b) wire a mobile bottom-sheet variant of `PhotoGalleryBox` (no schema change), (c) "Copy link" button on each gallery thumb pointing at the existing `pb.files.getURL(p, p.image)` direct URL — the deep-link route lands in a follow-up. **Rollout:** ship to all users, no toggle.

Each spec above is the contract for promoting that experiment to its own `app-experiences-<name>.md` sub-plan via `/start-plan`. Open one when the work actually starts — don't pre-create all three.

**Promoted:**

- 2026-05-25 — Playground → [app-experiences-playground.md](app-experiences-playground.md). Phase 1 takes the "smallest unblock-launch change set" from the spec above as its contract (backdrop presets + mobile gallery sheet + copy-link).

### Phase 2+ — Per-experiment polish

One sub-plan per experiment (`app-experiences-lipsync.md`, `…-platformer.md`, `…-playground.md`) once each one is picked up. Don't pre-create them — open via `/start-plan` when the work starts.

## Wiki sync

_Filled per experiment as each one ships._
