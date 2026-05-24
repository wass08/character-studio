---
plan_id: app-shadcn-everywhere
title: shadcn-everywhere — unify the design language
status: planned
kind: living-plan
priority: p1
last_reviewed: 2026-05-23
goal: "Every button, dialog, popover, select, dropdown, switch, tooltip, and toast in the app uses a shadcn primitive — no bespoke React-only or hand-rolled equivalents remain. Locks the design language before mobile responsiveness and thumbnails ship on top of it."
readiness: ready
success_criteria:
  - "Audit (phase 1) lists every visible primitive in src/components/** with its current implementation and the matching shadcn target."
  - "Migration (phase 2) replaces every bespoke primitive call site. `rg` for hand-rolled <button> / <dialog> / native <select> / custom popover returns only intentional matches (file-level disablers documented inline)."
  - "shadcn/ui components.json reflects the full installed set; tailwind v4 theme tokens are consistent across all migrated surfaces."
  - "Visual diff on /, /create, /me, /c/[id], /play/*, /admin/* shows no regression on the chrome (header, chips, menus, dialogs, toasts)."
depends_on:
  - app-nav-and-positioning  # phase 1 vocabulary lock — labels we use during migration
related_plans:
  - app-beta-production
  - app-editor-mobile        # mobile pass depends on shadcn primitives being mobile-correct
related_wiki:
  - wiki/architecture/app-structure.md
wiki_sync:
  required: true
  done: false
  pages:
    - wiki/architecture/app-structure.md  # new ## UI primitives section documenting the shadcn baseline
  notes: "On completion: document the shadcn baseline (which primitives we use, when to add a new one, the components.json contract, theme tokens)."
archive:
  eligible: false
  reason: "Active sub-plan of app-beta-production."
---

# shadcn-everywhere — unify the design language

Sub-plan of [app-beta-production](app-beta-production.md). Lock the design language so the [mobile editor pass](app-beta-production.md#4-editor-mobile) doesn't have to re-migrate primitives, and so the future thumbnail / hero / plaza work all sit on the same chrome.

## Context

The hub-launch ([app-hub-launch](app-hub-launch.md)) installed shadcn for the admin shell. The rest of the app is a mix: some shadcn primitives, some hand-rolled (`src/components/ui/primitives/`), some Radix imported directly without the shadcn wrapper. This phase audits and converges.

## Phase 1 — Audit & taxonomy

Goal: a complete inventory before any migration starts. Each row is a UI primitive (button, dialog, etc.); for each, list every call site, its current implementation, and the matching shadcn target.

- [ ] Survey installed shadcn primitives: read `components.json` and `src/components/ui/` for what's already in.
- [ ] Survey bespoke primitives in `src/components/ui/primitives/` (`Dialog.jsx`, `IconButton.jsx`, `Spinner.jsx`, `Toast.jsx`, `Tooltip.jsx`). For each, note whether it's a shadcn re-export, a Radix wrap, or fully hand-rolled.
- [ ] Grep for hand-rolled `<button>`, `<select>`, `<dialog>`, `<details>`, native form inputs across `src/components/**` and `src/app/**`. Capture file:line per occurrence.
- [ ] Grep for direct `@radix-ui/react-*` imports outside of shadcn-wrapped files — those bypass the design system.
- [ ] Output the audit as a table in this file under `## Audit` below.

**Owner**: Claude (mechanical but needs judgment on what counts as "bespoke" vs intentional).

## Phase 2 — Install missing shadcn primitives

For every shadcn primitive we'll need that isn't installed yet, install via `bunx shadcn@latest add <component>`. Confirm tailwind v4 theme tokens and CSS variables are consistent post-install.

- [ ] Install missing primitives identified in phase 1.
- [ ] Verify `src/app/globals.css` theme tokens still resolve correctly.
- [ ] Update `components.json` if needed; commit.

## Phase 3 — Migration sweep

Per-primitive migrations, in a deterministic order (least-coupled first):

- [ ] Buttons: replace every hand-rolled `<button>` with the shadcn `Button` variant table. Preserve all existing classNames not covered by variants as overrides.
- [ ] Tooltips: converge `src/components/ui/primitives/Tooltip.jsx` callers onto the shadcn `Tooltip`.
- [ ] Dialogs: same for `Dialog.jsx`.
- [ ] Toasts: same for `Toast.jsx`.
- [ ] Selects / popovers / dropdowns / switches: Radix-direct imports gain the shadcn wrapper.
- [ ] Form inputs (text, textarea): shadcn `Input`, `Textarea`.

**Owner**: Codex executes per-primitive sweeps against the phase 1 audit. Claude reviews each commit; primitives that bundle non-trivial behavior (the active-character dropdown, the OTP dialog, the editor tool pills) get Claude's hand directly.

## Phase 4 — Convergence pass

After all migrations, validate that the system is internally consistent.

- [ ] No primitive has two implementations in tree (bespoke + shadcn) — either delete the bespoke or document why both stay.
- [ ] Theme tokens (colours, radii, shadows) are referenced by name from `globals.css`, not hard-coded per call site.
- [ ] Snapshot screenshots of `/`, `/create`, `/me`, `/c/[id]`, `/play/playground` before and after — no visual regression on chrome.

## Phase 5 — Wiki sync & close

- [ ] Add `## UI primitives` section to [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md): which shadcn primitives we use, when to add a new one, the `components.json` contract, theme tokens, how to override variants.
- [ ] Flip `wiki_sync.done: true`, `status: implemented`, `readiness: reference`.

## Audit

_Filled in phase 1. Each row: primitive · current implementation · target shadcn primitive · call-site count · migration owner._

## Wiki sync

_Filled before flipping `status: implemented`._
