---
plan_id: app-experiences-polish
title: Experiences polish — lipsync, platformer, playground
status: draft
kind: living-plan
priority: p3
last_reviewed: 2026-05-23
goal: "Tighten the three per-character experiments (Lipsync, Platformer, Playground) into shippable, fun mini-experiences. Gameplay tuning, camera, controls, UI density."
readiness: blocked
success_criteria:
  - "TBD — first phase writes them once the engine rewrite is stable enough that polishing won't be undone."
depends_on:
  - app-engine-rewrite             # don't polish on top of code about to be rewritten
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

Sub-plan of [app-beta-production](app-beta-production.md). Deliberately **deferred** behind [app-engine-rewrite](app-engine-rewrite.md) — polishing gameplay/visuals on code that's about to be replaced is rework, and the engine rewrite refactors the character pipeline that all three experiments mount.

## Why this exists as a skeleton

The three per-character routes (`/c/[id]/try/{lipsync,platformer,playground}`) ship today and *work* — they just don't feel finished:

- **Lipsync** — audio analyser + viseme morphs are wired but the voice preset roster is small and the framing could showcase the talking better.
- **Platformer** — the bvhecctrl-based controls work but movement tuning, camera follow, level geometry, level reset are all rough.
- **Playground** — pose + capture flow exists but the photo bookcamera, lighting presets, and gallery save flow need a pass.

Each one is its own polish workstream. They share no code that's worth combining a plan for, but they all sit behind the same engine-rewrite gating.

## Earliest sensible start

After [app-engine-rewrite phases 1-8](app-engine-rewrite.md#phases-18--file-conversions-open) ship — specifically the Avatar/Asset/SkinManager decoupling that lets per-character render paths not fight the singleton store. At that point the three experiments can be polished independently without retro-fitting later.

## Phases (drafted, to revise on unblock)

### Phase 1 — Define scope per experiment

When unblocked: write specific success criteria for each of the three experiments. Currently they're "feels finished" — a real definition needs:

- Target feel reference (a video / GIF / metaphor — e.g. "Platformer should feel like the Tomba demo").
- Concrete pass/fail markers per experiment.
- Whether polish is shipped behind a "beta" toggle or to all users.

### Phase 2+ — Per-experiment polish

One sub-plan per experiment (`app-experiences-lipsync.md`, `…-platformer.md`, `…-playground.md`) once each one is picked up. Don't pre-create them — open via `/start-plan` when the work starts.

## Wiki sync

_Filled per experiment as each one ships._
