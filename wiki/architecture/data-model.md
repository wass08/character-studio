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
| `thumbnail` | file | Square PNG generated client-side; rendered on hub cards and the chip. |
| `featured` | bool | Hand-curated for the FeaturedRow. |
| `hidden` | bool | Owner-hides; excluded from list/view rules below. |

Rules (set by the script):

- `listRule` / `viewRule`: `hidden != true` — public browsing of the wall and `/c/:id`.
- create/update/delete: owner-only (default `@request.auth.id = user`).

### `CharacterStudioVoicePresets`

Audio clips used by `/play/lipsync`.

| Field | Type | Notes |
|---|---|---|
| `label` | string | Human label shown in the voice picker. |
| `audio` | file | MP3/WAV. Played by [LipsyncDriver](../../src/components/scene/LipsyncDriver.jsx) and analysed by [`lib/lipsync.js`](../../src/lib/lipsync.js). |
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
