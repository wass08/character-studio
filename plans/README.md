# Plans

Living plan files for character-studio. One file per charter, prefix encodes the area:

- `app-` — anything in `src/app/` or `src/components/` (hub, editor, play, character pages, me, admin, shell, scene, UI).
- `data-` — PocketBase collections, R2 / asset pipeline, `scripts/setup-pocketbase.js`, backend services.
- `meta-` — plan-system docs, indexes, todos, parking lots.

Filename: `plans/<prefix>-<slug>.md`; `plan_id` matches the filename without `.md`.
Finished plans move to `plans/archive/` once `status: implemented` and wiki sync is done.

## Development order

| Order | Plan | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | [data-bake-pipeline](data-bake-pipeline.md) | p1 | implemented | Server-side immutable bakes, parametric variants, SWR invalidation |
| 2 | [app-embed-creator](app-embed-creator.md) | p2 | implemented | Guest-first embeddable creator (/embed, claim funnel, host docs) |
