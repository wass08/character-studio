---
plan_id: app-shadcn-everywhere
title: shadcn-everywhere — unify the design language
status: implemented
kind: implementation-record
priority: p1
last_reviewed: 2026-05-23
goal: "Every button, dialog, popover, select, dropdown, switch, tooltip, and toast in the app uses a shadcn primitive — no bespoke React-only or hand-rolled equivalents remain. Locks the design language before mobile responsiveness and thumbnails ship on top of it."
readiness: reference
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
  done: true
  pages:
    - wiki/architecture/app-structure.md  # new ## UI primitives section + rules + Toast + Dialog notes
    - wiki/architecture/README.md         # index row updated to surface the new section
  notes: "Documented the shadcn baseline as the ## UI primitives section of app-structure.md. Includes the four rules every PR must follow, the variant table, the asChild motion-preservation pattern, the toast shim, the dialog shim/raw split, and 'adding a primitive' recipe."
archive:
  eligible: false
  reason: "Active sub-plan of app-beta-production."
---

# shadcn-everywhere — unify the design language

Sub-plan of [app-beta-production](app-beta-production.md). Lock the design language so the [mobile editor pass](app-beta-production.md#4-editor-mobile) doesn't have to re-migrate primitives, and so the future thumbnail / hero / plaza work all sit on the same chrome.

## Context

The hub-launch ([app-hub-launch](app-hub-launch.md)) installed shadcn for the admin shell. The rest of the app is a mix: some shadcn primitives, some hand-rolled (`src/components/ui/primitives/`), some Radix imported directly without the shadcn wrapper. This phase audits and converges.

## Phase 1 — Audit & taxonomy ✅

- [x] Survey installed shadcn primitives: read `components.json` and `src/components/ui/` for what's already in.
- [x] Survey bespoke primitives in `src/components/ui/primitives/` (`Dialog.jsx`, `IconButton.jsx`, `Spinner.jsx`, `Toast.jsx`, `Tooltip.jsx`).
- [x] Grep for hand-rolled `<button>`, `<select>`, `<dialog>`, `<details>`, native form inputs across `src/components/**` and `src/app/**`.
- [x] Grep for direct `@radix-ui/react-*` imports outside of shadcn-wrapped files.
- [x] Output the audit as a table — see [`## Audit`](#audit) below.

**Owner**: Claude.

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

*Captured 2026-05-23.*

### Already installed shadcn primitives

`components.json` is New York style, JSX (no TS yet), zinc base, CSS vars, lucide icons. Installed under `src/components/ui/`:

| Primitive | Status |
|---|---|
| `badge` | installed, in use |
| `button` | installed, only 10 call sites (all admin) — bulk of the app still hand-rolls |
| `card` | installed, in use (admin) |
| `checkbox` | installed, in use (admin) |
| `input` | installed, in use (admin) |
| `label` | installed, in use (admin) |
| `select` | installed, in use (admin) |

### Bespoke primitives that need to converge on shadcn

Under `src/components/ui/primitives/`:

| File | Implementation | Migration target | Call-site count |
|---|---|---|---|
| [Dialog.jsx](../src/components/ui/primitives/Dialog.jsx) | Radix `react-dialog` wrapped with glass-panel styling | shadcn `dialog` (install) | 2 surfaces (AuthDialog, SaveDialog) |
| [Tooltip.jsx](../src/components/ui/primitives/Tooltip.jsx) | Radix `react-tooltip` wrapped, `label` prop API | shadcn `tooltip` (install); the simple `label` API stays as a thin wrapper around the shadcn primitives | 9 direct call sites + via IconButton |
| [Toast.jsx](../src/components/ui/primitives/Toast.jsx) | Radix `react-toast` + custom Zustand store, `toast.success/error/default` API | shadcn `sonner` (install) — keep the `toast()` callsite API by exporting a thin shim | 11 call sites |
| [IconButton.jsx](../src/components/ui/primitives/IconButton.jsx) | `motion.button` + bespoke Tooltip | rebuild on shadcn `Button` (`size="icon"`) + shadcn Tooltip; keep motion animation as a wrapper | many (used across editor chrome) |
| [Spinner.jsx](../src/components/ui/primitives/Spinner.jsx) | Inline SVG with `animate-spin` | keep — no shadcn equivalent for arbitrary spinners; this is fine as-is (just move out of `primitives/`?) | 5 call sites |

### Radix direct imports outside shadcn wrappers

These bypass the design system and must be replaced with installed shadcn wrappers:

| File:line | Radix package | Migration target |
|---|---|---|
| `src/app/layout.js:2` | `react-tooltip` (Provider) | shadcn `TooltipProvider` |
| `src/components/shell/AccountIdentity.jsx:5` | `react-dropdown-menu` | shadcn `dropdown-menu` (install) |
| `src/components/shell/CharacterChip.jsx:6` | `react-popover` | shadcn `popover` (install) |

Allowed Radix imports (used *inside* shadcn primitives — fine to keep):

- `src/components/ui/checkbox.jsx`, `select.jsx`, `button.jsx` (Slot), `label.jsx` — these are the shadcn wrappers themselves.

### Hand-rolled HTML primitives

Counted via `rg -c '<button' src/ -g '*.jsx' -g '*.js'`:

| Element | Total | Top callers |
|---|---|---|
| `<button>` | **35** across 17 files | AssetsBox (4), MyCharactersPage (4), AuthDialog (3), CharacterChip (3), ShapeKeyControls (2), MyCharactersBox (2), ExportBox (2), AccountIdentity (2), NoCharacterOverlay (2), LipsyncView (2), CharacterPageView (2), AssetForm (2), + 5 singletons |
| `<motion.button>` | **12** across 10 files | mixed — anywhere we want spring-press animations |
| `<input>` (native) | **5** | LipsyncView (text), AuthDialog (OTP), HeightSlider (range — keep, no shadcn slider yet), ShapeKeyControls (morph numeric — same), SaveDialog (name) |

### Primitives to install before migration (phase 2)

```bash
bunx shadcn@latest add dialog tooltip dropdown-menu popover sonner slider
```

(`switch` and `textarea` and `form` can be added later when first needed; not on the critical path.)

### Migration order (phase 3)

1. **Buttons** — biggest surface (~47 incl. motion). Per-file sweep replacing `<button>`/`<motion.button>` with `<Button>` (variants: `default`/`ghost`/`outline`/`secondary`/`destructive`; sizes: `default`/`sm`/`icon`). Wrap with `motion.div` for press animation where it mattered; or use shadcn `asChild` with the `motion` element.
2. **Tooltips** — 9+ call sites converge from `primitives/Tooltip` to a thin shim over shadcn `Tooltip*`. Keep the `label` prop ergonomics.
3. **Dialogs** — 2 surfaces (`AuthDialog`, `SaveDialog`) migrate from `primitives/Dialog` to shadcn `Dialog*`. Glass-panel styling moves into `globals.css` as a utility or onto `DialogContent` className.
4. **Toasts** — `primitives/Toast` → shadcn `sonner`. Keep the call-site `toast()` API via a wrapper so 11 call sites don't churn.
5. **Dropdowns + popovers** — Shell components (`AccountIdentity`, `CharacterChip`) move off Radix-direct to shadcn `dropdown-menu` + `popover`.
6. **IconButton** — last because it depends on Button + Tooltip both being migrated. Rebuild on the new primitives, preserve motion press animation.

### Out of scope for this sub-plan

- Native `<input type="range">` in HeightSlider / ShapeKeyControls — shadcn `slider` exists but the morph-value sliders have custom drag behaviour worth keeping; revisit during mobile pass.
- Form-level state (`react-hook-form` + shadcn `form`) — not used in the codebase; not adding it preemptively.
- Switches — not currently in the codebase as a primitive that needs migration; install when first needed.

## Wiki sync

Landed 2026-05-23. [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md) gained a new `## UI primitives` section at the bottom covering:

- The folder map: `src/components/ui/` (shadcn-generated), `primitives/` (project shims), `<feature>/` (compound UI).
- Four hard rules: no hand-rolled equivalents; no `@radix-ui/*` direct imports outside `src/components/ui/`; `asChild` is the pattern for motion-preserving buttons; variant table for picking `default`/`ghost`/`outline`/`destructive`/`link` and sizes.
- Theme tokens come from `globals.css` CSS vars — override per call site only when the surface needs glass-panel / branded styling the default theme doesn't carry.
- "Adding a primitive" 4-step recipe (`bunx shadcn@latest add`, optional shim, migrate everything in same PR, update rules if a new convention).
- Toast section: `toast` is a re-export of sonner; portal mounts in `layout.js`; `toast.success/error` API unchanged.
- Dialog section: two shapes — `primitives/Dialog.jsx` (friendlier API + glass-panel + no close-X) vs raw `ui/dialog.jsx` (full primitives when DialogFooter/Header/close-X needed).

Also updated [wiki/architecture/README.md](../wiki/architecture/README.md) index row for `app-structure` to flag the new section.

[plans/app-beta-production.md](app-beta-production.md) beta-gate checklist now ticks "shadcn audit clean".
