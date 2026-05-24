---
plan_id: app-experiences-polish
title: Experiences polish — lipsync, platformer, playground
status: draft
kind: living-plan
priority: p3
last_reviewed: 2026-05-25
goal: "Tighten the three per-character experiments (Lipsync, Platformer, Playground) into shippable, fun mini-experiences. Gameplay tuning, camera, controls, UI density."
readiness: needs_criteria
success_criteria:
  - "TBD — Phase 1 (defining scope per experiment) is now the unblocked next step; criteria land there."
depends_on:
  - app-nav-and-positioning        # phase 6 plaza polish optionally informs how experiments are framed
related_plans:
  - app-beta-production
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

Suggested first slice for the next agent: draft a one-paragraph spec for each of [LipsyncView.jsx](../src/components/play/LipsyncView.jsx), [PlatformerView.jsx](../src/components/play/PlatformerView.jsx), [PlaygroundView.jsx](../src/components/play/PlaygroundView.jsx) — what "shippable" means for each, the rough perf/feel target, the smallest set of changes that would unblock launch. Land each as a checkbox in this Phase 1 block; promote to its own `app-experiences-<name>.md` sub-plan only when a phase actually starts.

### Phase 2+ — Per-experiment polish

One sub-plan per experiment (`app-experiences-lipsync.md`, `…-platformer.md`, `…-playground.md`) once each one is picked up. Don't pre-create them — open via `/start-plan` when the work starts.

## Wiki sync

_Filled per experiment as each one ships._
