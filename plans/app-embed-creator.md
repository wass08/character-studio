---
plan_id: app-embed-creator
title: Embeddable guest-first character creator
status: draft
kind: living-plan
priority: p2
last_reviewed: 2026-07-25
goal: "Any site can iframe /embed; an anonymous visitor creates a character, the host page receives immutable GLB URLs via postMessage, and the visitor can claim the character into a Character Studio account via a first-party tab."
readiness: ready
success_criteria:
  - "/embed boots with a self-issued guest token, full creator works with zero auth; saving produces a guest-owned character record + server bake."
  - "Host page receives versioned postMessage events: cs.v1.ready, cs.v1.character.exported {characterId, bakeId, glbUrl (/b/ immutable), characterUrl (/c/ mutable), animationsUrl, manifestUrl}, cs.v1.error — and nothing else."
  - "'Save to Character Studio' opens a first-party tab with a single-use ~15-min claim code; after OTP login the guest character attaches to the account and appears in /studio."
  - "Bake/write endpoints are per-IP rate limited; unclaimed guest records GC after ~30 days, but their externally exported bakes are never deleted."
  - "No login UI exists inside the iframe (storage partitioning makes it worthless); widget stays 'Powered by Character Studio' branded."
depends_on: ["data-bake-pipeline"]
related_plans: ["data-bake-pipeline"]
related_wiki: []
wiki_sync:
  required: true
  done: false
  pages: []
  notes: "Publish the postMessage contract + embed integration doc when frozen."
archive:
  eligible: false
  reason: "Just opened; blocked on bake pipeline phases 1–3."
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

- [ ] `/embed` route: creator UI in embed chrome (no site nav, CS badge), self-issued guest token, guest-owned character records (PB: `guestToken` field, no `user` relation; collection rules allowing guest create/update scoped by token).
- [ ] postMessage bus: emit `cs.v1.ready` / `cs.v1.character.exported` / `cs.v1.error`; "Done" triggers eager default bake and emits URLs from the bake manifest.
- [ ] Per-IP rate limits on guest character create + bake trigger.

### Phase 2 — Claim funnel

- [ ] Claim codes: single-use, ~15 min TTL, bound to character; "Save to Character Studio" button opens `characterstudio.com/claim?code=…` in a new tab; OTP login → reassign record `guestToken` → `user`.
- [ ] `/studio` shows claimed characters; community visibility only after claim.
- [ ] Guest GC job: unclaimed records > 30 days deleted; bakes flagged externally-delivered are exempt forever.

### Phase 3 — Integration doc + hardening

- [ ] One-page embed doc (iframe snippet, event contract, param table) — public.
- [ ] Golden integration test: fixture host page, create → export → claim round-trip.

## Open questions

- Seed param (`?character=` / `?gender=`) for hosts that want a starting point?
- Does /embed reuse EditorView wholesale or a slimmed ModeSelector variant? (It already has an `embedded` prop — check fit.)

## Wiki sync

_Filled in before flipping `status: implemented`._
