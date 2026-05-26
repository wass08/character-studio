---
plan_id: app-experiences-playground
title: Experiences — Playground polish
status: draft
kind: living-plan
priority: p3
last_reviewed: 2026-05-25
goal: "Turn the Playground from a single-backdrop pose-and-capture surface into a punchy photobooth — 2-3 backdrop/lighting presets, a mobile gallery, and a shareable link per photo."
readiness: ready
success_criteria:
  - "Phase 1 (this plan) lands the three items from the parent spec's 'smallest unblock-launch change set': backdrop presets visible inline + mobile bottom-sheet gallery + copy-link on saved photos. Proof = the three checkbox-clusters below, each verified on /c/[id]/try/playground at desktop + mobile."
  - "Wiki sync: a new wiki/per-character-experiments/playground.md (or a section in an experiments page) lists the backdrop preset names, the mobile gallery breakpoint rule, and the copy-link URL shape, before status flips to implemented."
depends_on: []
related_plans:
  - app-experiences-polish     # parent — owns the cross-experiment scope & rollout stance
  - app-engine-rewrite         # Backdrop.tsx is the engine-rewrite-converted file we're parameterising
related_wiki:
  - wiki/architecture/data-model.md   # CharacterStudioPhotos collection + savePhoto contract
wiki_sync:
  required: true
  done: false
  pages:
    - wiki/per-character-experiments/playground.md   # to be created — preset names + gallery breakpoints + share URL shape
  notes: "Cross-cutting playground rules (backdrop preset enum, mobile gallery breakpoint, share URL shape) need a durable home — no existing wiki page owns the per-character experiment surface yet, so this plan creates one."
archive:
  eligible: false
  reason: "Just opened — Phase 1 not started."
---

# Playground polish

Sub-plan of [app-experiences-polish](app-experiences-polish.md). The parent plan's Phase 1 spec for Playground is the contract for **this plan's Phase 1**; reproduced inline so this file stands alone if the parent gets archived.

## Context

The Playground route ([src/components/play/PlaygroundView.jsx](../src/components/play/PlaygroundView.jsx)) is the in-app photobooth: locks `UI_MODES.PHOTO`, shows the editor's `<PosesBox>` pose pills + `<PhotoGalleryBox>` left rail. Capture goes through `savePhoto()` → `CharacterStudioPhotos` on PocketBase; download is the same canvas via `screenshot()`. Today the gallery is hidden on mobile via `max-md:hidden`, the world is one single look ([Backdrop.tsx](../src/components/scene/Backdrop.tsx) — stool + floor + plant GLB), and a saved photo lives only in the user's own gallery — there's no way to send one to a friend short of right-clicking the thumbnail.

The parent plan's target-feel reference is a Polaroid booth: pick pose → snap → thumbnail animates in → repeat, with a clear payoff (a shareable artefact). Phase 1 here is the smallest cut that hits that loop.

## Goal

Phase 1 — ship the parent spec's "smallest unblock-launch change set": backdrop/lighting presets exposed inline, mobile bottom-sheet gallery, copy-link on saved photos. Phase 2+ as the polish work uncovers them.

## Phases

### Phase 1 — Smallest unblock-launch change set (READY)

Three independent sub-slices. They share no critical-path code so they can ship in any order, ideally as three small commits.

#### Phase 1a — Backdrop presets

Parameterise [Backdrop.tsx](../src/components/scene/Backdrop.tsx) and the Scene-level lights so the Playground can swap between 2-3 looks at runtime.

- [ ] Decide preset roster — names + concrete dressing per. Strawman: `Studio` (current look — keep as default), `Sunset` (warmer floor + orange-tinted directional, env rotation), `Night` (cool floor + low ambient + cyan rim light). Lock the enum in the plan body before coding.
- [ ] Lift the floor colour, ambient colour, hemisphere colours, and the three directional-light intensities/colours out of [Backdrop.tsx](../src/components/scene/Backdrop.tsx) + [Scene.tsx](../src/components/scene/Scene.tsx) into a single `BACKDROP_PRESETS` map keyed by the enum. Stool + plant GLB stays shared.
- [ ] Add a `backdrop` field to `useConfiguratorStore` (default `"studio"`) + the matching setter. Persist across mode-switches in the same session; don't write to PB.
- [ ] Plumb the active preset through `<Backdrop preset={…} />` and the Scene lights. Verify the editor still renders identically (default = `studio` = today's values).
- [ ] Add a small preset switcher to [PlaygroundView.jsx](../src/components/play/PlaygroundView.jsx) — a top-right or top-centre pill row, same glass-panel idiom as `PosesBox`. Use a thumb of each preset rendered as a static PNG under `public/images/backdrop-presets/<name>.png` so the switcher reads visually, not as text labels.
- [ ] Proof: open `/c/<id>/try/playground` on desktop, cycle the three presets, confirm (a) avatar lighting changes with no flash, (b) `PHOTO_POSES` framing still centres correctly, (c) capture flow still saves a sensible thumbnail (no black frames).

#### Phase 1b — Mobile gallery bottom sheet

Today [PhotoGalleryBox.jsx](../src/components/ui/PhotoGalleryBox/PhotoGalleryBox.jsx) is `max-md:hidden` — mobile users can capture but can't browse what they've saved.

- [ ] Read the existing `PhotoGalleryBox` and decide split vs. branch. Recommended: keep the desktop left-rail render, add a sibling `PhotoGallerySheet.jsx` that uses the existing shadcn `Sheet` primitive (`src/components/ui/sheet.tsx` per the shadcn-everywhere plan) on mobile only.
- [ ] Sheet trigger: a small floating button bottom-right of `PlaygroundView` on mobile, with the gallery count badge. Tap → opens a half-height sheet with the same grid + Capture button.
- [ ] Mobile capture from inside the sheet should close the sheet after the toast (or feel like it) — the existing `photosChangedAt` re-fetch handles the data side.
- [ ] Proof: open `/c/<id>/try/playground` on a `390×844` iPhone-size preview, confirm (a) gallery button visible without overlapping the chip header or `PosesBox`, (b) sheet opens with grid populated for a signed-in user, (c) capture from inside the sheet adds a new thumbnail without a layout pop.

#### Phase 1c — Copy-link per photo

The PB `image` field is a public direct URL via `pb.files.getURL(p, p.image)`. The smallest payoff is a one-tap copy.

- [ ] Add a "Copy link" affordance per gallery thumbnail — small button overlay alongside the existing Delete, visible on hover (desktop) or always (mobile sheet). Use the same icon language as the rest of the gallery (lucide).
- [ ] On click, `navigator.clipboard.writeText(pb.files.getURL(p, p.image))` then a toast confirming copy. Bail to a `prompt()` fallback if clipboard write rejects (Safari focus quirks).
- [ ] Decide URL shape — `pb.files.getURL` direct, or a deferred wrapper route like `/photo/<id>`. Phase 1 ships the direct URL; the wrapper route is Phase 2 if we want OG-card unfurls.
- [ ] Proof: capture a photo, hit copy-link, paste in a new tab — image opens directly. On mobile Safari, confirm the clipboard write either succeeds silently or the fallback prompt appears.

#### Phase 1 — close-out

- [ ] All three sub-slices verified at desktop + iPhone-size preview.
- [ ] Wiki sync — write `wiki/per-character-experiments/playground.md` listing (a) the `BACKDROP_PRESETS` enum names + what each tweaks, (b) the mobile-sheet breakpoint rule (md), (c) the share-URL shape currently in use. Plus a one-line link from [wiki/README.md](../wiki/README.md) under whatever the existing experiments section is (or open a new "Per-character experiments" bucket).
- [ ] Flip `status` → `verification`, then `implemented` once the user has eyeballed the live route.

### Phase 2+ — Beyond unblock-launch

Not the focus of this charter. Captured here so they don't get lost when the parent plan eventually archives:

- Caption per photo (PB field add on `CharacterStudioPhotos`; needs a `setup-pocketbase.js` migration).
- Public photo route `/photo/<id>` with OG meta tags for unfurls (Twitter/Bluesky/Discord).
- Capture-flash polish — the parent spec calls out a shutter-blink or haptic ring as a Phase 2 stretch.
- Light-direction slider per preset (Phase 2 if users ask).

Promote any of these to its own Phase 2+ block in this plan when picked up; only spin a fresh `app-experiences-playground-<topic>.md` if scope creep makes the body unreadable.

## Open questions

- **Preset count** — the parent spec says "2-3"; this plan strawman-locked it at 3 (`studio` / `sunset` / `night`). Confirm the third earns its keep before shipping; cutting to 2 is fine if `night` doesn't look good with the existing stool/plant materials.
- **Backdrop preset persistence** — session-only vs. per-character on PB? Phase 1 ships session-only because the parent plan rolls out to all users without a toggle; a per-character "preferred backdrop" is a Phase 2 conversation.
- **Wiki home** — does the experiment doc live at `wiki/per-character-experiments/playground.md` or do we group all three under one `wiki/architecture/experiments.md`? Decide before the wiki-sync step lands. (Recommendation: a directory, since each experiment will likely earn its own page as its polish plan lands.)

## Wiki sync

_Filled in before flipping `status: implemented`. Plan: create `wiki/per-character-experiments/playground.md` with the preset enum, mobile breakpoint, and share-URL shape; link from `wiki/README.md`. See [update-wiki-from-plan](../.claude/skills/update-wiki-from-plan/SKILL.md)._
