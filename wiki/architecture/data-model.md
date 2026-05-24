# Data Model

*PocketBase collections and the S3 asset contract that back the studio.*

Applies to: `src/stores/useConfiguratorStore.js`, anything calling `pb.collection(...)`, anything reading/writing S3 assets, `scripts/setup-pocketbase.js`.

PocketBase is the system of record for users, characters, voices, and asset metadata. S3 (via `@aws-sdk/client-s3` + presigned URLs) holds binary assets — model files, textures, thumbnails, audio.

The canonical schema bootstrap lives in `scripts/setup-pocketbase.js` — it's idempotent, safe to re-run, and is the **only** source of truth for collection rules. Don't hand-edit collections in the PB admin and forget to update the script; the script is what gets re-applied on a fresh PB instance.

## Collections

### `users`

Built-in PocketBase auth collection, extended with:

| Field | Type | Notes |
|---|---|---|
| `role` | string | `"admin"` opens up `/admin/*`. Read by `useAuthStore.isAdmin`. |
| `name` | string | Public display name on author chips. |
| `mainCharacter` | relation → `CharacterStudioCharacters` | Default character loaded for this user. |

OTP-only login (no password UX exposed). See [useAuthStore](../../src/stores/useAuthStore.js) for the OTP request/verify flow; `users` auth is open and the script pre-creates rows on first OTP request because PB has no signup endpoint for OTP-only.

`emailVisibility` stays default-off so emails are never exposed via public reads.

### `CharacterStudioCharacters`

Owns a saved character (config blob, thumbnail, ownership, flags).

| Field | Type | Notes |
|---|---|---|
| `user` | relation → `users` | Owner. Required for create. |
| `name` | string | Display name shown on chips and `/c/:id`. |
| `config` | json | The full configurator state — gender, asset picks, colours, animations. Read into `useConfiguratorStore` on load. |
| `thumbnail` | file | Square 512² PNG generated client-side via the thumbnail rig (see below); rendered on homepage cards, `/studio`, and the character chip. |
| `featured` | bool | Hand-curated for the FeaturedRow. |
| `hidden` | bool | Owner-hides; excluded from list/view rules below. |

Rules (set by the script):

- `listRule` / `viewRule`: `hidden != true` — public browsing of the wall and `/c/:id`.
- create/update/delete: owner-only (default `@request.auth.id = user`).

#### Thumbnail capture

*The rig that bakes `record.thumbnail` on save. Locked 2026-05-23 by [app-thumbnails](../../plans/app-thumbnails.md).*

Lives in [`src/components/scene/Scene.tsx`](../../src/components/scene/Scene.tsx) — the `captureFaceThumbnail` callback installed onto the configurator store via `setCaptureFaceThumbnail`. Called by the save flow.

| Aspect | Value | Why |
|---|---|---|
| Stored size | 512×512 PNG | Hits the 256² wall cards and 512² featured cards crisply on high-DPR displays. |
| Render size | 1024×1024 | 2× supersampling — the browser's 2D `drawImage` downscale acts as a high-quality box filter for cheap AA, portable across three.js versions (avoids the multisample-buffer resolve path). |
| Framing | Head + shoulders | Camera 1.55 m behind the head bone (`DEF-head`), slightly above (`+0.08`), looking 0.22 m below the head bone. fov 30°. Visible height at the head plane ≈ 0.83 m — enough for hair top + collarbone. |
| Lighting | Inherits the editor scene's lights | Portrait-specific lights are [Phase 2 of the plan](../../plans/app-thumbnails.md#phase-2--portrait-lighting-deferred-post-engine-rewrite), deferred behind the engine rewrite. |
| Background | The editor scene's `#222237` clear colour | Same deferral. |

Rebake-existing thumbnails for older characters is [Phase 3](../../plans/app-thumbnails.md#phase-3--rebake-existing-characters-deferred), deferred until the rig has been validated in production.

The capture path itself (`gl.readRenderTargetPixels` → canvas downscale → `toBlob`) will be replaced when the engine rewrite ships WebGPU; the *rig* (camera + framing + lighting decisions above) carries through unchanged.

### `CharacterStudioVoicePresets`

Audio clips used by `/play/lipsync`.

| Field | Type | Notes |
|---|---|---|
| `label` | string | Human label shown in the voice picker. |
| `audio` | file | MP3/WAV. Played by [LipsyncDriver](../../src/components/scene/LipsyncDriver.tsx) and analysed by [`lib/lipsync.ts`](../../src/lib/lipsync.ts). |
| `gender` | select | `man` / `woman` / `other` — filtered against the active character's gender. |

Public read, admin-only write.

## S3 / asset contract

- Bucket holds the raw asset library (GLB models, textures, lipsync presets) referenced by the configurator.
- Reads use a public CDN URL; writes (from `/admin/characters` and `/admin/voices`) use presigned PUT URLs minted server-side via `@aws-sdk/s3-request-presigner`.
- Asset metadata (which GLBs belong to which category, per-gender) lives in PocketBase, not S3. The admin panels write both.

## When you change the schema

1. **Update `scripts/setup-pocketbase.js`** in the same commit. Re-running the script must be a no-op against the new desired state.
2. If you touch `CharacterStudioCharacters.config`, also bump the persist `version` in `useConfiguratorStore` and write a `migrate` — saved characters carry old config shapes forever.
3. Note new rules / new collections here so an agent reading this page has the current shape without grepping the script.
4. If the change started as a plan, the plan's `wiki-sync` checkbox covers this update — see [`update-wiki-from-plan`](../../.agents/skills/update-wiki-from-plan/SKILL.md).
