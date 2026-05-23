---
plan_id: app-hub-launch
title: Hub landing + play surfaces + character pages
status: implemented
kind: implementation-record
priority: p0
last_reviewed: 2026-05-23
goal: "Replace the single-page editor at / with a hub, and split the editor / photobooth / my-characters / play flows onto dedicated routes backed by a shared character store."
readiness: reference
success_criteria:
  - "`/` renders the hub (hero + featured row + experiences grid + living wall) without mounting the editor canvas — verified by visiting / in dev."
  - "/c/[id], /create, /create/[id], /me, /play/{lipsync,platformer,playground}, /admin/{characters,voices} all resolve and render their views — verified by Next route table."
  - "A signed-out user with a persisted `currentCharacterId` from a prior session can refresh and keep the same character active — verified by [AuthBootstrapper.jsx](../src/components/ui/AuthBootstrapper.jsx) rehydration path."
depends_on: []
related_plans: []
related_wiki:
  - wiki/architecture/app-structure.md
  - wiki/architecture/stores.md
  - wiki/architecture/data-model.md
wiki_sync:
  required: true
  done: true
  pages:
    - wiki/architecture/app-structure.md
    - wiki/architecture/stores.md
    - wiki/architecture/data-model.md
  notes: "Seeded the three architecture pages from this plan's shipped shape."
archive:
  eligible: false
  reason: "Newest reference implementation; keep visible until the next significant plan lands and we know what the next agent reads first."
---

# Hub launch

Reference record for the shipped hub experience on `feat/hub` (commit `458ef16`, 41 files / +2685 / −18).

## Shipped surface

- **Hub at `/`** — `HubHeader`, `HubHero`, `FeaturedRow`, `ExperiencesGrid`, `LivingWall`, `CharacterCard`. Replaces the prior editor-on-root layout.
- **Editor moved to `/create` and `/create/[id]`** — `EditorView` extracted from the old root.
- **Public character page at `/c/[id]`** — `CharacterPageView`.
- **My characters at `/me`** — `MyCharactersPage`.
- **Play experiences at `/play/{lipsync,platformer,playground}`** — `PlayShell`, `PlaygroundView`, `LipsyncView`, `PlatformerView`, `NoCharacterOverlay`.
- **Admin panels** — `/admin/characters`, `/admin/voices`.
- **Global chrome** — `GlobalChrome`, `HubHeader`, `CharacterChip`, `AccountIdentity` mounted once in `src/app/layout.js`.
- **Lipsync runtime** — `src/components/scene/LipsyncDriver.jsx` + `src/lib/lipsync.js`.
- **PocketBase bootstrap** — `scripts/setup-pocketbase.js` (idempotent; adds `featured`/`hidden` flags, opens read rules, creates `CharacterStudioVoicePresets`).

## Behavioural changes worth noting

- **Anonymous rehydration**: `AuthBootstrapper` now rehydrates a persisted `currentCharacterId` on first mount even when no user is signed in, so a living-wall pick survives a refresh.
- **Scoped fallback**: the signed-in "load latest character" path now filters by `user = "<id>"` instead of returning anyone's latest record.
- **ModeSelector trim**: Photobooth and My Characters left the editor pill (they have their own routes); added a `← Hub` back-link.
- **PB request keys**: all `getOne` / `getList` calls in `AuthBootstrapper` pass `requestKey: null` to survive React-strict-mode double-mount cancellation.

## Wiki sync

Captured into the wiki on 2026-05-23:

- [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md) — surface ↔ route map, layering rules, server/client boundary, "adding a new surface" recipe.
- [wiki/architecture/stores.md](../wiki/architecture/stores.md) — `useConfiguratorStore` / `useAuthStore` ownership, hydration rules, the rules section (single PB client, request-key gotcha, persist migrations).
- [wiki/architecture/data-model.md](../wiki/architecture/data-model.md) — `users` / `CharacterStudioCharacters` / `CharacterStudioVoicePresets` shape, list/view rules, S3 contract, "when you change the schema" recipe.

If the hub gains another surface or the configurator persist shape changes, those three pages are the targets — not this plan.

## Follow-ups

None tracked here. Append surfaced ideas to [`meta-todos.md`](meta-todos.md); promote real follow-ups to their own `app-` / `data-` plan.
