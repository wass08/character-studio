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

## Integration manifest

`GET /api/models/b/{bakeId}.json` (and `/api/models/c/{characterId}.json` for
the latest bake) returns `character-studio.manifest.v1`: absolute URLs, the
variant parameter table and ready variants, the rig contract (conventions and
socket bones in glTF and three.js spelling, from `src/lib/bake/rigContract.js`),
the animation clip catalog (`src/lib/generated/animation-clips.json`,
regenerated with `npm run animations:catalog`), morph sets, material naming,
and the frozen recipe. Model redirects carry a `Link: …; rel="describedby"`
header to it, and all model routes send `Access-Control-Allow-Origin: *`.
The human/agent guide lives in `docs/integration/character-studio-glb.md` and
is published as `/llms.txt` (`npm run docs:sync`, run on `prebuild`) and as
the `skills/character-studio-glb` skill.

## Guest characters and claims

Characters made through `/embed` have no `user` (the relation is optional)
and carry `guest = true` plus a hidden `guestTokenHash`. Only the server
routes under `/api/embed` can create or update them, after hashing the
caller's token and comparing it to the stored hash. Public listings (home
wall, community, featured, lab wall) filter `guest != true`; model routes and
`/c/[id]` still serve them so hosts can load the bake. A claim stores a
hidden `claimCodeHash` with `claimExpires` (15 minutes); redeeming it through
`/api/embed/claim` sets `user`, clears `guest` and both hashes. Unclaimed
guests older than 30 days are deleted by `npm run guests:gc -- --apply`;
their bakes stay.

## Bake queue and invalidation

`PIPELINE_VERSION` (bake-worker `src/recipes.js`) is part of the bake ID; bump
it whenever the worker's output changes for identical inputs so stale bakes are
superseded. `npm run bake:all` backfills `usedAssets`, marks every character
stale, enqueues the default variant, and waits for the worker.

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
