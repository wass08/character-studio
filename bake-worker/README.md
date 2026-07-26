# Character Studio bake worker

A standalone Node.js worker that polls PocketBase for queued character bake
and asset-invalidation jobs. Bakes are assembled headlessly with
glTF-Transform, encoded with the requested variant parameters, and uploaded to
R2 under immutable, content-addressed keys.

## Shared bake pipeline

`src/lib/bake/pipeline.ts` remains the single source of truth for morph
baking, cleanup, optimization, and compression. `prepare`, `prestart`, and
`pretest` copy that file and `src/lib/bake/params.js` byte-for-byte into the
ignored worker-local `src/generated/` directory. The worker then runs Node
with `--experimental-strip-types` and imports the synchronized TypeScript
directly. The sync (rather than an authored duplicate) also ensures the
pipeline and assembly use the same installed glTF-Transform instance.

Assembly uses glTF-Transform's `copyToDocument()` for each asset mesh node.
This copies each node's mesh, materials, textures, and skin dependencies into
the armature document while preserving glTF-native data; the worker then
remaps `JOINTS_0` by joint name and replaces the copied skin with the
armature's canonical skin. The copied skeleton becomes orphaned and is
removed by `prune()`.

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `POCKETBASE_URL` | Yes | — | PocketBase base URL. |
| `POCKETBASE_EMAIL` | Yes | — | PocketBase superuser email. |
| `POCKETBASE_PASSWORD` | Yes | — | PocketBase superuser password. |
| `R2_ENDPOINT` | Yes | — | Cloudflare R2 S3-compatible endpoint. |
| `R2_BUCKET` | Yes | — | R2 bucket for baked assets. |
| `R2_ACCESS_KEY_ID` | Yes | — | R2 API access key ID. |
| `R2_SECRET_ACCESS_KEY` | Yes | — | R2 API secret access key. |
| `R2_PUBLIC_URL` | Yes | — | Public base URL for objects in the R2 bucket. |
| `MODELS_DIR` | No | `../public/models/characters` | Directory containing gender-specific `Armature.glb` files, resolved from `bake-worker/`. |
| `PORT` | No | `8787` | Health server port. |
| `CONCURRENCY` | No | `2` | Maximum number of jobs processed concurrently. |
| `POLL_INTERVAL_MS` | No | `2000` | Delay between queue polls, in milliseconds. |

From `bake-worker/`, copy `.env.example` into your preferred environment
configuration, install dependencies, and run the worker:

```sh
npm install
npm start
```

Run the network-free golden tests with:

```sh
npm test
```

## Docker / Elestio

The Dockerfile uses the repository root as its build context so it can compile
the shared pipeline and include the armature fixtures:

```sh
docker build -f bake-worker/Dockerfile -t character-studio-bake-worker .
docker run --env-file bake-worker/.env -p 8787:8787 character-studio-bake-worker
```

Configure the same root-context Docker build in Elestio and set every required
environment variable. Expose port `8787` for the container healthcheck only;
the worker needs no public ingress.
