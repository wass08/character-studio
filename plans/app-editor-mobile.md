---
plan_id: app-editor-mobile
title: Editor mobile responsiveness
status: implemented
kind: implementation-record
priority: p2
last_reviewed: 2026-05-23
goal: "The character editor at /editor and the per-character experiments at /c/[id]/try/* work fluidly on a 375 px-wide viewport — no overlap, no horizontal scroll, no broken touch targets."
readiness: reference
success_criteria:
  - "Editor chrome at 375 px: brand wordmark + TopActions (Sign in / Save) + ModeSelector pill + Hide UI button don't overlap; each is reachable; the 3D canvas is fully visible."
  - "AssetsBox bottom-sheet doesn't shift the canvas, is scrollable, and exposes all categories + sliders + color picker via touch."
  - "Per-character experiment routes (/c/[id]/try/*) render with PlayShell chrome where the back-link is reachable and the character chip/avatar stay visible."
  - "`bun run build` clean; no console errors at mobile viewport."
depends_on:
  - app-shadcn-everywhere
related_plans:
  - app-beta-production
  - app-nav-and-positioning
related_wiki:
  - wiki/architecture/app-structure.md
wiki_sync:
  required: true
  done: true
  pages:
    - wiki/architecture/app-structure.md
  notes: "New ## Responsive conventions section codifies the mobile-first rule for positioning utilities (Tailwind v4 max-md: footgun), the 44px touch-target rule, and the breakpoint table."
archive:
  eligible: false
  reason: "Active sub-plan of app-beta-production."
---

# Editor mobile responsiveness

Sub-plan of [app-beta-production](app-beta-production.md). Shadcn primitives (sub-plan #2) are now mobile-correct everywhere; this sub-plan brings the editor's bespoke chrome up to the same baseline.

## Audit (375 px, 2026-05-23)

Smoke at iPhone-13 width (375 × 812):

| Issue | Observed | Cause |
|---|---|---|
| ModeSelector pill horizontally stretches from center to right edge, taking ~72% of viewport width | Pill at `x=85, w=270` instead of right-anchored | `left-1/2` (base) + `max-md:left-auto` (mobile override) — the override doesn't win in Tailwind v4 when both `left-1/2` and `max-md:right-5` are present; the box stretches between them. |
| Otherwise chrome is workable — TopActions (Sign in / Save) at top, ModeSelector below, AssetsBox docked at bottom, HideUI button floating left | Layout intent is correct, just the one positioning bug | — |

## Phase 1 — ModeSelector layout fix

- [x] Rewrite ModeSelector's className with **mobile-first** ordering: base styles target the small-screen layout (right-anchored, slightly larger touch target, bottom-sheet-ish), `md:` overrides flip to the centered desktop pill.
- [x] Same pattern applied prospectively to any other chrome that uses `max-md:` for positioning — caught only ModeSelector in the audit; if others surface, fix the same way.

## Phase 2 — Wiki sync & close

- [x] Add `## Responsive conventions` section to [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md) — codifies the mobile-first rule so the gotcha doesn't bite again.
- [x] Flip `wiki_sync.done: true`, `status: implemented`, `readiness: reference`.

## Out of scope

- **Editor mobile gestures** (pinch-zoom on canvas, two-finger orbit) — the CameraControls already accept touch. Visual smoke confirms it works; full gesture verification waits until a real device test in the beta-verification pass.
- **AssetsBox bottom-sheet polish** (snap points, swipe-to-dismiss) — current implementation already uses `flex-col-reverse` + `max-h-[55vh]` + scrollable content, which works. A real bottom-sheet treatment would be polish, not foundation.

## Wiki sync

Landed with this commit. New `## Responsive conventions` section in `wiki/architecture/app-structure.md` documents the mobile-first rule and the specific Tailwind v4 gotcha (max-md positioning utilities don't always override base utilities; prefer mobile-first + `md:` for layout positioning).
