# Data model

## Immutable character bakes

The character recipe is authoritative. `CharacterStudioBakes` stores derived,
content-addressed generations; `CharacterStudioCharacters.latestBake` is the
mutable pointer to the current generation. A bake ID hashes the normalized
recipe, resolved asset versions, and `PIPELINE_VERSION`.

Each bake stores its frozen recipe and a `variants` JSON map. Variant keys are
canonical query strings containing all four enum parameters:

- `quality=low|medium|high`
- `morphs=none|visemes|arkit|full`
- `compression=meshopt|draco|none`
- `pose=default|tpose`

Variant GLBs live at `bakes/{bakeId}/{variantKey}.glb` with immutable cache
headers. `GET /api/models/c/{characterId}.glb` follows the mutable character
pointer and uses a non-cacheable redirect. `GET /api/models/b/{bakeId}.glb`
pins a generation, uses an immutable redirect, and marks the bake
`externallyDelivered` so future cleanup must retain it. Unknown parameters or
enum values return `400`.

## Bake queue and invalidation

`CharacterStudioBakeJobs` is the durable PocketBase queue. The single
`bake-worker` service polls it with an in-process concurrency limit, assembles
GLBs with glTF-Transform, uploads variants to R2, and advances `latestBake`
only after a successful upload.

Character saves denormalize referenced asset IDs into `usedAssets`, set
`bakeStale`, and enqueue the eager default variant. Asset edits enqueue an
invalidation job; the worker marks every character related through
`usedAssets` stale. The next mutable model request serves the old ready bake
immediately and queues a deduplicated replacement (stale-while-revalidate).
Cold variants are queued and the HTTP request polls PocketBase for up to about
20 seconds before returning `503` with `Retry-After`.

## Shared animation objects

`scripts/publish-animations.mjs` resamples redundant keyframes, applies
Meshopt animation-buffer compression, validates clip/channel counts, uploads
hash-keyed GLBs under `animations/{gender}/{sha256}.glb`, and updates the
generated manifest. Published objects use immutable one-year cache headers.
