# App Structure

*How `src/app/` and `src/components/` are laid out — which surface owns which route, and where global chrome is mounted.*

Applies to: `src/app/**`, `src/components/**`.

The app is a single Next.js 16 App Router project (React 19, React Compiler enabled). Each top-level surface owns a folder under both `src/app/` (routes) and `src/components/` (view layer).

## Surface ↔ route map

| Surface | Route(s) | Component folder |
|---|---|---|
| Hub (landing) | `/` | `src/components/hub/` |
| Editor (build a character) | `/create`, `/create/[id]` | `src/components/editor/` |
| Public character page | `/c/[id]` | `src/components/character/` |
| My characters | `/me` | `src/components/me/` |
| Play experiences | `/play/{lipsync,platformer,playground}` | `src/components/play/` |
| Admin | `/admin/characters`, `/admin/voices` | `src/app/admin/*/*Panel.jsx` + `src/components/admin/` |
| Global chrome | mounted in root layout | `src/components/shell/` |
| 3D canvas | embedded in editor + play views | `src/components/scene/` |
| Primitive UI (shadcn-style) | reused everywhere | `src/components/ui/` |

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
