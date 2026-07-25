# Character Studio bake worker

A standalone Node.js worker that polls PocketBase for queued character bake
jobs. Bake jobs are currently a stub; invalidation jobs mark characters that use
the affected asset as stale.

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
| `PORT` | No | `8787` | Health server port. |
| `CONCURRENCY` | No | `2` | Maximum number of jobs processed concurrently. |
| `POLL_INTERVAL_MS` | No | `2000` | Delay between queue polls, in milliseconds. |

Copy `.env.example` into your preferred environment configuration, install
dependencies with `npm install`, then run `npm start`.

## Elestio deployment

Configure an Elestio CI/CD pipeline for the repository subdirectory
`bake-worker`, build it with the included Dockerfile, and set every required
environment variable in Elestio. Expose port `8787` for the container
healthcheck only; this worker needs no public ingress in v1.
