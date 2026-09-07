---
plan_id: app-embed-creator
title: Embeddable guest-first character creator
status: implemented
kind: living-plan
priority: p2
last_reviewed: 2026-09-06
goal: "Any site can iframe /embed; an anonymous visitor creates a character, the host page receives immutable GLB URLs via postMessage, and the visitor can claim the character into a Character Studio account via a first-party tab."
readiness: reference
success_criteria:
  - "/embed boots with a self-issued guest token, full creator works with zero auth; saving produces a guest-owned character record + server bake."
  - "Host page receives versioned postMessage events: cs.v1.ready, cs.v1.character.exported {characterId, bakeId, glbUrl (/b/ immutable), characterUrl (/c/ mutable), animationsUrl, manifestUrl}, cs.v1.error — and nothing else."
  - "'Save to Character Studio' opens a first-party tab with a single-use ~15-min claim code; after OTP login the guest character attaches to the account and appears in /studio."
  - "Bake/write endpoints are per-IP rate limited; unclaimed guest records GC after ~30 days, but their externally exported bakes are never deleted."
  - "No login UI exists inside the iframe (storage partitioning makes it worthless); widget stays 'Powered by Character Studio' branded."
depends_on: ["data-bake-pipeline"]
related_plans: ["data-bake-pipeline"]
related_wiki:
  - wiki/architecture/app-structure.md
  - wiki/architecture/data-model.md
wiki_sync:
  required: true
  done: true
  pages:
    - wiki/architecture/app-structure.md
    - wiki/architecture/data-model.md
  notes: "Host contract published as docs/integration/embed.md."
archive:
  eligible: true
  reason: "Embed surface, claim funnel, GC script and host docs shipped 2026-09-06; guest GC needs a scheduled run."
---

# Embeddable guest-first character creator

## Context

Settled in the 2026-07-24/25 architecture interview. Product model is Ready-Player-Me-style **developer widget** (host site gets a GLB URL back), with the consumer/shareable case as a special instance of it. Key constraints discovered:

- **Third-party storage partitioning** (Chrome + Safari, 2026) makes in-iframe login worthless: sessions don't carry across host sites or to characterstudio.com. Therefore: no login UI in the iframe, ever, in v1. Identity = guest token; continuity = claim flow (and later, RPM-style partner-minted `?token=` restore).
- **Server-side bakes (data-bake-pipeline) make anonymity a non-issue**: capability needs no account; auth only decides ownership.
- **v1 is deliberately registry-free**: open embedding (`/embed` iframe-able anywhere), no API keys, no partner endpoints. Nothing privileged lives in the iframe so open embedding is safe with per-IP rate limits. The guest record shape matches what partner-created guests will use, so the v2 partner API (`POST /api/embed/guests`, `POST /api/embed/token`, `EmbedApps` registry with allowedOrigins) is purely additive.
- **The postMessage contract is the only unbreakable API** — three events, versioned `cs.v1.*`, frozen before any partner ships against it.
- **The per-bake manifest already exists** (2026-09-04): `GET /api/models/b/{bakeId}.json` (`character-studio.manifest.v1`, built by `src/lib/server/manifest.js` from `src/lib/bake/rigContract.js` + `src/lib/generated/animation-clips.json`). `cs.v1.character.exported.manifestUrl` must point at it, and the integration doc (`docs/integration/character-studio-glb.md`, served as `/llms.txt`, installable via `npx skills add wass08/character-studio`) is what host developers and their agents read.
- White-labeling is a future paid tier; v1 stays CS-branded (growth loop).

## Goal

Ship `/embed` as an acquisition channel: hosts integrate a character creator in an afternoon; end-users create without accounts; the claim funnel converts guests into Character Studio users after they've gotten value.

## Phases

### Phase 1 — Embed surface

- [x] `/embed` route: creator UI in embed chrome (no site nav, CS badge), self-issued guest token (sessionStorage), guest-owned character records. Implemented as server routes `/api/embed/characters` (+ `/{id}`) that validate the payload and store only a token hash in a hidden `guestTokenHash` field — no PocketBase rule change; guests never write to PB directly.
- [x] postMessage bus: emit `cs.v1.ready` / `cs.v1.character.exported` / `cs.v1.error`; "Done" saves, waits on `/api/models/c/{id}.json` (cold-path hold-open) and emits URLs from the manifest (`src/lib/embed/contract.js`, `src/components/embed/`).
- [x] Per-IP rate limits: 10 creates/min, 60 other embed calls/min (`checkRateLimit` scopes).

### Phase 2 — Claim funnel

- [x] Claim codes: single-use, 15 min TTL, hashed on the character (`claimCodeHash`, `claimExpires`); "Save to Character Studio" opens `/claim?code=…` in a new tab; OTP login → `POST /api/embed/claim` reassigns to `user`, clears guest fields.
- [x] `/studio` shows claimed characters (normal `user` filter); public listings exclude `guest = true`.
- [x] Guest GC: `npm run guests:gc -- --apply` (dry run by default) deletes unclaimed guests older than 30 days; bakes are never touched. Still needs a scheduled run (cron/Elestio job).

### Phase 3 — Integration doc + hardening

- [x] `docs/integration/embed.md` + live demo `public/embed-demo.html`.
- [x] `npm run embed:smoke` (create → ownership → bake manifest → claim code → claim via impersonated user → cleanup) against any deployment; the demo page doubles as the fixture host for headless browser checks.

## Open questions

- Seed param (`?character=` / `?gender=`) for hosts that want a starting point?
- Does /embed reuse EditorView wholesale or a slimmed ModeSelector variant? (It already has an `embedded` prop — check fit.)

## Wiki sync

- `wiki/architecture/app-structure.md` owns the /embed and /claim surfaces.
- `wiki/architecture/data-model.md` owns the guest fields, claim codes and retention.
