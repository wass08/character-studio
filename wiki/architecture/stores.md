# Stores

*Zustand stores — what each one owns, how they hydrate, and how surfaces should read from them.*

Applies to: `src/stores/**`, anything calling `useConfiguratorStore` / `useAuthStore`.

The app has two Zustand stores. They are the **only** sanctioned client-side state containers — surfaces should not spin up their own.

## `useConfiguratorStore` — character + config

Source: `src/stores/useConfiguratorStore.js`. Persisted via `zustand/middleware/persist` (localStorage), so a refresh keeps the active character ID and configurator selections.

Owns:

- The **shared PocketBase client** (`pb`). Exported as a named const at the top of the file. Every PB call in the app goes through this instance — do **not** instantiate a second `new PocketBase(...)` elsewhere.
- The **active character** (`currentCharacterId`, `currentCharacterName`, the assembled config) and the helpers to load / clear it (`loadCharacter`, `setCurrentCharacter`).
- Configurator selections — gender, asset picks per category, colour customisations, export settings, animation pose, UI mode.
- The export pipeline state (compression, animation toggles, etc.).

Reads from it should always select a narrow slice: `useConfiguratorStore(s => s.currentCharacterId)`, not the whole store.

## `useAuthStore` — current user

Source: `src/stores/useAuthStore.js`. Not persisted (PocketBase's own `authStore` is the source of truth and it persists itself; this store just mirrors it into React).

Owns:

- `user`, `isLoggedIn`, `isAdmin` mirrored from `pb.authStore`.
- The OTP login flow state (`otpId`, `otpEmail`, `*Pending` flags) and the actions that drive it (`requestOtp`, `verifyOtp`, `resetOtp`).
- `loginDialogOpen` + setter for the global sign-in modal.
- `logout`, which clears both PB and the store.

A `pb.authStore.onChange` subscription (set up at module load on the client) keeps `user` / `isLoggedIn` / `isAdmin` in sync when the PB token refreshes or expires.

## Hydration rules

- **Don't read either store during SSR.** Both are client-only — surfaces that read them must be in a `"use client"` component.
- **First-mount character rehydration** is the [AuthBootstrapper](../../src/components/ui/AuthBootstrapper.jsx)'s job, not a route's. It runs once in `GlobalChrome`:
  - Signed-in users with no active character → auto-load their main (or the most recently-updated character they own).
  - Anonymous users with a persisted `currentCharacterId` from a prior session → re-fetch and load it so a wall pick survives a refresh.
- Routes/surfaces should assume the active character is already loaded by the time they mount. If `currentCharacterId == null` after first paint, render the empty state (see [NoCharacterOverlay](../../src/components/play/NoCharacterOverlay.jsx) for the pattern).

## Rules

- **Never instantiate a second `PocketBase` client.** Import `pb` from `src/stores/useConfiguratorStore.js`.
- **Don't put React-derived state in a store.** If a value is computable from other state, derive it in a selector / `useMemo`, not in the store body.
- **Don't add cross-store coupling.** A store action must not call another store's actions inside itself. Coordinating logic lives in the component that triggers both.
- **Persisted slice changes are migrations.** Renaming or removing a field on `useConfiguratorStore` ships stale data to every returning user — add a `migrate` in the `persist` config or bump the version, don't ship silently.
- **PB requests that race during React-strict-mode mount/unmount/mount** need `requestKey: null` (see the `getOne` / `getList` calls in `AuthBootstrapper`) — otherwise the second call cancels the first and you get a silent empty result.
