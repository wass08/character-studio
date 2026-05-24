# App Structure

*How `src/app/` and `src/components/` are laid out — which surface owns which route, and where global chrome is mounted.*

Applies to: `src/app/**`, `src/components/**`.

The app is a single Next.js 16 App Router project (React 19, React Compiler enabled). Each top-level surface owns a folder under both `src/app/` (routes) and `src/components/` (view layer).

## Vocabulary

*Locked 2026-05-23 by [app-nav-and-positioning](../../plans/app-nav-and-positioning.md).*

`character-studio` is positioned as a **professional character creator**. The product is character creation. The community wall is social proof. Experiences are *ways to see a character you built in action* — they are subordinate to characters, never peer to them.

The vocabulary below is the single source of truth for every visible string and route. New copy must use these labels; reviewers reject PRs that reintroduce removed words.

### Labels

| Today | Locked | Used at | Why |
|---|---|---|---|
| "Hub" (nav + back-links) | **(gone)** | — | The home page is marketing; it has no nav label and no back-link label. Back-links go to "← Studio" or "← [character name]" depending on origin. |
| "My" / "My Characters" (nav, page title) | **Studio** | nav link, page title at `/studio`, back-links from editor/play | Pro term; signals "this is where work lives" (Inworld Studio, Adobe XD, others). Workspace, not catalog. |
| "+ Create" (chrome CTA) | **+ New character** | header CTA on every chrome | Verb-noun pair; the object is explicit. Reserves "Create" for the big marketing hero CTA, which can be longer. |
| "Create a character" (hero CTA) | **Create your character** | marketing hero on `/` | Possessive frames the visitor as the creator. Marketing copy; lives only in the hero. |
| "Experiences" (section heading on `/`) | **(gone)** | — | Subordinated to characters. Replaced by per-character "Try [name] in …" CTAs on `/c/[id]`. |
| Section noun for experiments | **(none)** | — | They keep their proper names (Lipsync, Playground, Platformer). Framed by the verb "Try" + character name. |
| "Customize" (editor mode pill) | **Customize** (kept) | editor chrome | Already correct for what the pill does. |
| "Featured" (homepage section) | **Featured** (kept) | homepage section heading | Standard term; reads correctly in the new positioning. |
| Brand wordmark "Character Studio" / "Studio" subtitle | **Character Studio** / **Studio** (kept) | logo + subtitle | The brand stays. "Studio" as a workspace label is contextually distinct in the chrome (it's a nav link, not a wordmark). |

### URLs

All shipped. Old paths redirect via `next.config.mjs`.

| Path | Owns | Redirect notes |
|---|---|---|
| `/` | Marketing home — hero, featured, wall. Same page signed-in or signed-out. | — |
| `/editor`, `/editor/[id]` | Editor (build / edit a character). | `/create` and `/create/:id` → 308 to `/editor*`. |
| `/studio` | Workspace — user's characters, recent edits, "+ New character" CTA. | `/me` and `/me/:path*` → 308 to `/studio*`. |
| `/c/[id]` | Public character page (showcase). | — |
| `/c/[id]/try/{lipsync,platformer,playground}` | Per-character experiments. Loader at `src/components/play/CharacterScopedPlay.jsx` ensures the URL's character is the one in the store. | `/play/:experiment` → 307 to `/studio` (bare `/play` carries no character context; the user picks one first). |
| `/admin/{characters,voices}` | Internal moderation + curation. | — |
| *(deferred)* `/gallery` | Full community gallery as a destination. Not in beta — the homepage wall covers it. | — |

### Rules going forward

- **No "Hub" in any visible string.** It survives only in legacy internal names (`HubHeader.jsx` component / file, the `hub-bg` CSS class, the `layoutId="hub-nav-active"` motion id). New code uses none of these words; file renames will follow when they're touched for other reasons.
- **No top-level "Experiences" section.** Experiments are reached from a character page (`/c/[id]`), framed as "Try [name] in …".
- **Workspace is "Studio".** Singular, capitalised. Never "My Studio", "Your Studio", "the Studio".
- **CTA copy is "+ New character" in chrome, "Create your character" in the marketing hero.** Don't mix.
- **Character public URLs stay short** (`/c/[id]`). Experiments are sub-routes (`/c/[id]/try/[experiment]`), not query params or sibling routes.
- **Old paths redirect**, but new code links to the new paths directly. Don't rely on the redirects in internal navigation — they exist for stale external links only.

## Surface ↔ route map

Reflects today's shipped routes. Component folder names mostly carried forward; legacy names that don't actively mislead are deferred to rename when those files get touched for other reasons.

| Surface | Route | Component folder |
|---|---|---|
| Marketing home | `/` | `src/components/home/HeroStage.jsx` + `src/components/hub/{FeaturedRow,LivingWall,CharacterCard}` (legacy folder name kept) |
| Editor (build / edit) | `/editor`, `/editor/[id]` | `src/components/editor/` |
| Public character page | `/c/[id]` | `src/components/character/` |
| Workspace ("Studio") | `/studio` | `src/components/me/` (legacy folder name kept) |
| Per-character experiments | `/c/[id]/try/{lipsync,platformer,playground}` | `src/components/play/` + the `CharacterScopedPlay` loader |
| Admin | `/admin/characters`, `/admin/voices` | `src/app/admin/*/*Panel.jsx` + `src/components/admin/` |
| Global chrome | mounted in root layout | `src/components/shell/` |
| 3D canvas | embedded in editor + experiments | `src/components/scene/` |
| Primitive UI (shadcn) | reused everywhere | `src/components/ui/` |
| Internal experiments | `/lab/wall` (multi-character plaza prototype, deferred polish) | `src/components/lab/` |

## Layering rules

- **`src/app/<route>/page.js`** is a thin server component. It sets `metadata`, may fetch on the server, and renders the surface's top-level client component from `src/components/<surface>/`.
- **`src/components/<surface>/`** owns the surface's UX. Surfaces may import from `src/components/ui/` (primitives), `src/components/shell/` (chrome), `src/components/scene/` (canvas), and `src/lib/`. They **do not** import from sibling surfaces — if two surfaces need the same view, lift it to `src/components/ui/` or `src/components/shell/`.
- **`src/components/shell/`** owns global chrome ([HubHeader](../../src/components/shell/HubHeader.jsx), [GlobalChrome](../../src/components/shell/GlobalChrome.jsx), [CharacterChip](../../src/components/shell/CharacterChip.jsx), [AccountIdentity](../../src/components/shell/AccountIdentity.jsx)). `GlobalChrome` is mounted once in `src/app/layout.js` and reads from the stores — surfaces don't mount their own copy.
- **`src/components/scene/`** owns the R3F canvas. Surfaces inject content into it via children; the canvas itself does not import from surface folders.

## Homepage

*Locked 2026-05-23 by [app-nav-and-positioning](../../plans/app-nav-and-positioning.md) phase 3.*

The homepage at `/` is a marketing page that sells *making a character*. Same page for signed-in and signed-out visitors — there's no logged-in fork.

### Composition (top → bottom)

| Block | Component | Notes |
|---|---|---|
| Chrome | [HubHeader](../../src/components/shell/HubHeader.jsx) | Sticky; nav has only "Studio" (signed-in), CTA is "+ New character", chip + account on the right. |
| Hero | [HeroStage](../../src/components/home/HeroStage.jsx) | Two-column on desktop, stacked on mobile. Left: copy + single "Create your character" CTA. Right: live 3D character on a dark stage card. |
| Featured | [FeaturedRow](../../src/components/hub/FeaturedRow.jsx) | Horizontal scroll of admin-curated picks (`featured = true` in PB). Hides itself when empty. |
| Wall | [LivingWall](../../src/components/hub/LivingWall.jsx) | 2D grid of the most recent 50 non-hidden characters. |

`ExperiencesGrid` was deleted in phase 4; experiments live on character pages now, not as a peer section here.

### Hero stage — which character renders

`HeroStage` mounts a thin R3F canvas (display-mode lighting; no orbit controls / leva / screenshot helpers — those are editor concerns) and renders the editor's existing `<Avatar />` from [`src/components/scene/`](../../src/components/scene/Avatar.jsx). The character it shows is whatever sits in `useConfiguratorStore` at first paint:

1. **Signed-in user with a `mainCharacter`** — `AuthBootstrapper` (mounted globally) loads it before HeroStage mounts. Their character is the hero.
2. **Anonymous user with a persisted `currentCharacterId`** — `AuthBootstrapper` re-fetches it. Their last-viewed character is the hero.
3. **Otherwise (fresh visit, signed-out, no persisted id)** — HeroStage's own effect fetches one curator-`featured` character (falling back to the most-recent non-hidden character) and `loadCharacter`s it into the store. Race-guarded so a parallel AuthBootstrapper load wins if it finishes first.

The single-character pipeline is the editor's proven path (singleton store + `Avatar`). The multi-character plaza is [phase 6 of the nav plan](../../plans/app-nav-and-positioning.md#phase-6--plaza-polish-deferred-), deferred until the engine rewrite refactors the store coupling.

### Camera framing

R3F's default `lookAt` is the world origin (the character's feet). HeroStage overrides via the Canvas `onCreated` callback:

```js
camera={{ position: [0, 1.05, -3.6], fov: 38 }}
onCreated={({ camera }) => {
  camera.lookAt(0, 1.0, 0); // chest height
  camera.updateProjectionMatrix();
}}
```

Head sits in the upper third of the stage; feet rest just above the bottom edge. The fixed camera doesn't move — no orbit, no auto-rotation. Animation lives on the character.

### Empty states

- No characters in DB at all → FeaturedRow auto-hides (it bails on `items.length === 0`). LivingWall renders its empty dashed-border placeholder. Hero shows a blank canvas (no error — silent fallthrough).
- One or more characters but none featured → FeaturedRow hides, HeroStage falls back to most-recent.
- All characters hidden → FeaturedRow hides, LivingWall shows the placeholder, HeroStage canvas is blank.

## Where state lives

- **Auth** — `useAuthStore` (`src/stores/useAuthStore.js`). Read by `shell/`, `me/`, `editor/`, anywhere a sign-in gate matters.
- **Current character + config** — `useConfiguratorStore` (`src/stores/useConfiguratorStore.js`). Owns the active character record, configurator selections, and the shared PocketBase client (`pb`). Hub picks → editor → play all read from this single store; rehydration on first mount is the [AuthBootstrapper](../../src/components/ui/AuthBootstrapper.jsx)'s job.

See [stores](stores.md) for full ownership rules.

## Server vs client

- Every `page.js` defaults to a server component. Add `"use client"` only on the deepest component that needs it (anything reading a Zustand store, using `motion`, R3F, or browser APIs).
- Wrap browser-only providers in `src/app/layout.js` — currently `<TooltipProvider>` (shadcn) + `<Toaster />` (shadcn/sonner) + `<GlobalChrome />` (mounts `AuthDialog` + `AuthBootstrapper`).
- Public character pages (`/c/[id]`) should fetch their character record server-side from PocketBase for OG metadata; client-side hydration takes over from there.

## Adding a new surface

1. Decide if it's truly a new surface or an additional view inside an existing one. New surface → new folder under both `src/app/` and `src/components/`.
2. Add the route(s) under `src/app/<surface>/`. Keep `page.js` thin.
3. Put the view component under `src/components/<surface>/`.
4. If the surface needs chrome (header, character chip, sign-in), reuse `src/components/shell/` — don't fork.
5. Update the table above in the same commit.

## Responsive conventions

*Locked 2026-05-23 by [app-editor-mobile](../../plans/app-editor-mobile.md).*

Two rules govern responsive layout in this codebase. They're hard rules because Tailwind v4 has a footgun (see #1) that produces real layout bugs when ignored.

### 1. Mobile-first for positioning utilities

When a component needs different *positioning* (`left`, `right`, `top`, `bottom`, `translate-x`, `translate-y`, etc.) on mobile vs desktop, write the **mobile layout as the base** and override with `md:` for desktop. Don't use `max-md:` for positioning.

Why: with both `left-1/2` (base) and `max-md:right-5` (mobile override), Tailwind v4 emits two rules with equal specificity at the matching media query, and the box ends up stretched between *both* `left` and `right` — neither override wins cleanly. Mobile-first sidesteps this by keeping a single source of truth at each viewport.

```jsx
// ✅ correct — mobile-first
"absolute top-20 right-5 rounded-2xl",      // base = mobile
"md:top-5 md:right-auto md:left-1/2 md:-translate-x-1/2 md:rounded-full",

// ❌ wrong — max-md override doesn't win
"absolute top-5 left-1/2 -translate-x-1/2 rounded-full",
"max-md:top-20 max-md:right-5 max-md:left-auto max-md:translate-x-0",
```

For *non-positioning* utilities (typography, spacing, colours, sizes) `max-md:` is fine — they don't have the dual-anchor problem. Reference: [`ModeSelector.jsx`](../../src/components/ui/ModeSelector/ModeSelector.jsx).

### 2. Touch targets ≥ 44 px

Any interactive element reachable on mobile (buttons, chips, links in chrome, asset tiles, sliders) keeps a minimum 44 × 44 px touch target. shadcn `Button` `size="icon"` already meets this. Custom touch targets that compress with a `text-xs` should pad to compensate — typically `px-3 py-2` or larger.

### Breakpoints

Tailwind v4 defaults:

- `sm:` ≥ 640 px
- `md:` ≥ 768 px (our "desktop" cutoff for chrome)
- `lg:` ≥ 1024 px (used inside the editor's three-pane layout)
- `xl:` ≥ 1280 px

The editor at `/editor` is functional from 375 px; per-character experiments at `/c/[id]/try/*` and the marketing `/` work down to the same. Beta verification runs on Chrome iOS Safari + Android Chrome at the same widths.

## UI primitives

*Single source of truth for the design system. Locked 2026-05-23 by [app-shadcn-everywhere](../../plans/app-shadcn-everywhere.md).*

The app's primitives are **shadcn/ui (New York style, JSX, zinc base, CSS vars, lucide icons)**. `components.json` at the repo root is the contract. New primitives are installed via `bunx shadcn@latest add <component>`.

### Where to find what

| Folder | What lives here |
|---|---|
| [`src/components/ui/`](../../src/components/ui/) | Shadcn primitives generated by the CLI. Listed: `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `slider`, `sonner`, `tooltip`. Edit only when shadcn upstream changes the recipe. |
| [`src/components/ui/primitives/`](../../src/components/ui/primitives/) | Thin project-specific shims around shadcn that keep a friendlier call-site API. Currently: `Dialog.jsx` (single-prop content), `Tooltip.jsx` (single-prop `label`), `IconButton.jsx` (Button `size="icon"` + Tooltip + motion press animation), `Toast.jsx` (re-export of sonner's `toast`). Plus `Spinner.jsx` (no shadcn equivalent — inline SVG) and `cn.js` (re-export of `@/lib/utils`'s `cn`). |
| [`src/components/ui/<feature>/`](../../src/components/ui/) | Compound UI built from primitives (AssetsBox, ColorPicker, ExportBox, etc.). |

### Rules

- **No hand-rolled `<button>`, `<dialog>`, `<select>`, native form `<input>`, custom toast or tooltip systems.** Use the shadcn primitive (or its `primitives/` shim) every time. Reviewers reject PRs that reintroduce bespoke equivalents.
- **No direct `@radix-ui/react-*` imports outside `src/components/ui/`.** The shadcn wrappers and the shims are the only places allowed to import Radix directly. Verify with `rg '@radix-ui/react-' src/ | grep -v 'src/components/ui/'` — must be empty.
- **Preserve animations via `asChild`.** Buttons that need spring press animations wrap a `motion.button` child inside `<Button asChild …>`. Per-file pattern: declare `const MotionButton = motion.button;` at module scope, then use `<Button asChild …><MotionButton …>…</MotionButton></Button>`. See [TopActions](../../src/components/ui/Buttons/TopActions.jsx) or [IconButton](../../src/components/ui/primitives/IconButton.jsx).
- **Variant table:** `default` for primary CTAs (Save, Sign in, Verify), `ghost` for chrome icons and most interactive surfaces in dark backgrounds, `outline` for secondary actions, `destructive` for delete actions, `link` for inline text actions. Size: `icon` for square icon-only buttons, `sm` for compact pills, `default` otherwise.
- **Theme tokens (colours, radii, shadows) come from `globals.css` CSS variables.** Don't hardcode hex values in `className` when a token exists; do override with `className` when a surface needs a glass-panel or branded variant the default theme doesn't carry.

### Adding a primitive

1. `bunx shadcn@latest add <component>` to install.
2. If a friendlier call-site API is worth carrying, write a shim under `src/components/ui/primitives/<Component>.jsx`. Keep shims under ~40 lines and free of business logic.
3. Migrate every existing equivalent in the repo in the same PR — never leave a bespoke version next to its shadcn replacement.
4. Update the rules section above if the new primitive introduces a convention worth pinning.

### Toasts

`toast` is re-exported from [`src/components/ui/primitives/Toast.jsx`](../../src/components/ui/primitives/Toast.jsx) — under the hood it's [sonner](https://sonner.emilkowal.ski/). The Toaster portal mounts once in `src/app/layout.js`. Call-site contract:

```js
import { toast } from "@/components/ui/primitives/Toast";

toast("Saved");
toast.success("Signed in");
toast.error("Invalid code");
```

Sonner's full options object is accepted as the second argument.

### Dialogs

Two shapes: the friendlier `primitives/Dialog.jsx` shim (used by AuthDialog, SaveDialog) and the raw shadcn primitives in `ui/dialog.jsx` (used when you need DialogFooter, DialogHeader, the close-X button, etc.). The shim suppresses shadcn's default close-X and applies glass-panel styling.
