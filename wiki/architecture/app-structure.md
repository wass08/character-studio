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

| Today | Locked | Redirect from old | Notes |
|---|---|---|---|
| `/` | `/` (kept) | — | Marketing home for everyone — signed-in users see the same page. Hero + live wall (social proof) + features. |
| `/create`, `/create/[id]` | `/editor`, `/editor/[id]` | yes | `/editor` lands an in-memory draft; first save mints an ID and the URL replaces to `/editor/[id]` (Figma-style). |
| `/me` | `/studio` | yes | Workspace — user's characters, recent edits, "+ New character" CTA. |
| `/c/[id]` | `/c/[id]` (kept) | — | Public character page. Short prefix wins for shareable URLs. |
| `/play/{lipsync,platformer,playground}` | `/c/[id]/try/{lipsync,platformer,playground}` | yes (`/play/[x]` → `/studio` with a "pick a character first" toast) | The URL shape enforces the IA: experiments belong to characters. Bare `/play/[x]` cannot exist in the new world. |
| `/admin/*` | `/admin/*` (kept) | — | Internal; no positioning impact. |
| *(deferred)* | `/gallery` | — | Full community gallery as a destination. Not shipped in this cycle; the home wall is enough for beta. |

### Rules going forward

- **No "Hub" in any visible string.** It survives only in legacy component file names (`HubHeader.jsx`, `HubHero.jsx`) until phase 4 renames them. New code uses none of these words.
- **No top-level "Experiences" section.** Experiments are reached from a character page (`/c/[id]`), framed as "Try [name] in …".
- **Workspace is "Studio".** Singular, capitalised. Never "My Studio", "Your Studio", "the Studio".
- **CTA copy is "+ New character" in chrome, "Create your character" in the marketing hero.** Don't mix.
- **Character public URLs stay short** (`/c/[id]`). Experiments are sub-routes (`/c/[id]/try/[experiment]`), not query params or sibling routes.

## Surface ↔ route map

Routes shipping today and their locked future name (see [Vocabulary](#vocabulary) for the migration plan). Component folder names are mostly carried forward; the few that rename do so in [app-nav-and-positioning](../../plans/app-nav-and-positioning.md) phase 4.

| Surface | Route today | Locked route | Component folder |
|---|---|---|---|
| Marketing home | `/` | `/` (kept) | `src/components/hub/` *(folder name will be renamed to `home/` in phase 4)* |
| Editor (build a character) | `/create`, `/create/[id]` | `/editor`, `/editor/[id]` | `src/components/editor/` |
| Public character page | `/c/[id]` | `/c/[id]` (kept) | `src/components/character/` |
| Workspace ("Studio") | `/me` | `/studio` | `src/components/me/` *(rename to `studio/` in phase 4)* |
| Experiments (per character) | `/play/{lipsync,platformer,playground}` | `/c/[id]/try/{lipsync,platformer,playground}` | `src/components/play/` |
| Admin | `/admin/characters`, `/admin/voices` | (kept) | `src/app/admin/*/*Panel.jsx` + `src/components/admin/` |
| Global chrome | mounted in root layout | (kept) | `src/components/shell/` |
| 3D canvas | embedded in editor + experiments | (kept) | `src/components/scene/` |
| Primitive UI (shadcn-style) | reused everywhere | (kept) | `src/components/ui/` |

## Layering rules

- **`src/app/<route>/page.js`** is a thin server component. It sets `metadata`, may fetch on the server, and renders the surface's top-level client component from `src/components/<surface>/`.
- **`src/components/<surface>/`** owns the surface's UX. Surfaces may import from `src/components/ui/` (primitives), `src/components/shell/` (chrome), `src/components/scene/` (canvas), and `src/lib/`. They **do not** import from sibling surfaces — if two surfaces need the same view, lift it to `src/components/ui/` or `src/components/shell/`.
- **`src/components/shell/`** owns global chrome ([HubHeader](../../src/components/shell/HubHeader.jsx), [GlobalChrome](../../src/components/shell/GlobalChrome.jsx), [CharacterChip](../../src/components/shell/CharacterChip.jsx), [AccountIdentity](../../src/components/shell/AccountIdentity.jsx)). `GlobalChrome` is mounted once in `src/app/layout.js` and reads from the stores — surfaces don't mount their own copy.
- **`src/components/scene/`** owns the R3F canvas. Surfaces inject content into it via children; the canvas itself does not import from surface folders.

## Where state lives

- **Auth** — `useAuthStore` (`src/stores/useAuthStore.js`). Read by `shell/`, `me/`, `editor/`, anywhere a sign-in gate matters.
- **Current character + config** — `useConfiguratorStore` (`src/stores/useConfiguratorStore.js`). Owns the active character record, configurator selections, and the shared PocketBase client (`pb`). Hub picks → editor → play all read from this single store; rehydration on first mount is the [AuthBootstrapper](../../src/components/ui/AuthBootstrapper.jsx)'s job.

See [stores](stores.md) for full ownership rules.

## Server vs client

- Every `page.js` defaults to a server component. Add `"use client"` only on the deepest component that needs it (anything reading a Zustand store, using `motion`, R3F, or browser APIs).
- Wrap browser-only providers in `src/app/layout.js` — currently `<Tooltip.Provider>`, `<ToastProvider>`, and `<GlobalChrome />`.
- Public character pages (`/c/[id]`) should fetch their character record server-side from PocketBase for OG metadata; client-side hydration takes over from there.

## Adding a new surface

1. Decide if it's truly a new surface or an additional view inside an existing one. New surface → new folder under both `src/app/` and `src/components/`.
2. Add the route(s) under `src/app/<surface>/`. Keep `page.js` thin.
3. Put the view component under `src/components/<surface>/`.
4. If the surface needs chrome (header, character chip, sign-in), reuse `src/components/shell/` — don't fork.
5. Update the table above in the same commit.
