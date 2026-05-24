---
plan_id: app-nav-and-positioning
title: Nav + hub positioning + Mii-wall homepage
status: in_progress
kind: living-plan
priority: p0
last_reviewed: 2026-05-23
goal: "Lock the characters-first vocabulary, build a Mii-style live 3D wall on the homepage, and propagate both through every label, link, and route name in the app."
readiness: ready
success_criteria:
  - "Vocabulary lock recorded in wiki/architecture/app-structure.md, with a table mapping today's labels → beta labels and the rationale."
  - "Homepage renders ≥ 6 random community characters in a live 3D scene, idle/wave animations, name tooltip on hover, ≥ 50 fps on M-series Macs and ≥ 30 fps on a 2022 mid-tier Android in Chrome — verified by manual run + frame-time capture."
  - "Every route's chrome and every existing link uses the locked vocabulary; `rg -i 'hub|experience'` returns only intentional matches (component file names + rationale comments)."
depends_on: []
related_plans:
  - app-beta-production
related_wiki:
  - wiki/architecture/app-structure.md
wiki_sync:
  required: true
  done: false
  pages:
    - wiki/architecture/app-structure.md
  notes: "On completion: rewrite the surface ↔ route table with the locked vocabulary; add a 'Vocabulary' section above it; document the Mii-wall component contract."
archive:
  eligible: false
  reason: "Active sub-plan of app-beta-production."
---

# Nav + hub positioning + Mii-wall homepage

Sub-plan of [app-beta-production](app-beta-production.md). This is the IA and homepage work that every other beta sub-plan inherits vocabulary from — it ships first or nothing else lands cleanly.

## Context

After [app-hub-launch](app-hub-launch.md), the homepage at `/` is called "Hub" and "Experiences" sits as a peer to characters in the IA. That framing makes the product feel like a launcher of mini-games. We want the opposite: characters are the product, experiences are how you try a character.

References:

- Nintendo Mii Plaza — wall of characters living their own micro-lives. The feeling we want on `/`.
- Ready Player Me hub — characters-first marketing.
- The Sims character gallery — characters as social/shareable artifacts.

## Phase 1 — Research & vocabulary lock ✅

Goal of this phase: pick the words and the IA, with enough rationale that we don't reopen the decision in two weeks.

- [x] Audit current vocabulary: list every visible label in chrome, route, and CTA across the app. Source: `rg -n "Hub\|Experience\|My Characters\|Customize\|Play" src/`.
- [x] Sketch 3 IA candidates and their full label sets. *Three "name the home" candidates were rejected by the user, who reframed around the actual goal (get visitors to create). Replaced with a pro-creator framing (Ready Player Me / Meshy / Inworld Studio) and signed off via four targeted product decisions.*
- [x] Pick one. *Locked: pro-creator IA — `Studio` for the workspace, `/gallery` deferred, shared marketing home for signed-in users, in-memory editor draft until first save. Documented in [wiki/architecture/app-structure.md `## Vocabulary`](../wiki/architecture/app-structure.md#vocabulary).*
- [x] Update the chrome components — [HubHeader](../src/components/shell/HubHeader.jsx) (nav drops the home label; "My" → "Studio"; "+ Create" → "+ New character"), [PlayShell](../src/components/play/PlayShell.jsx) and [ModeSelector](../src/components/ui/ModeSelector/ModeSelector.jsx) back-links ("← Hub" → "← Studio", pointing at `/me` until phase 4 route rename). [GlobalChrome](../src/components/shell/GlobalChrome.jsx) and [CharacterChip](../src/components/shell/CharacterChip.jsx) had no vocabulary-impacted strings.

**Owner**: Claude. Decision-heavy work; the rename in phase 4 is the slice that goes to Codex.

### Locked decisions (2026-05-23)

| Decision | Lock |
|---|---|
| Workspace name | **Studio** (at `/studio`) |
| Gallery destination | **Home only for now**; `/gallery` deferred until volume justifies it |
| Signed-in `/` | **Same marketing home for everyone** |
| Editor URL on first creation | **`/editor` with in-memory draft → `/editor/[id]` after first save** |
| `/play/*` URL shape | **`/c/[id]/try/[experiment]`** (redirect from `/play/*`) — enforces "experiments belong to characters" in the URL itself |

The full label and URL tables live in [wiki/architecture/app-structure.md `## Vocabulary`](../wiki/architecture/app-structure.md#vocabulary). That section is now the single source of truth for visible strings — reviewers reject PRs that reintroduce removed words.

### Out of phase 1 (deferred to later phases)

- Homepage section labels (`HubHero` copy, `ExperiencesGrid` heading + tagline) — owned by phase 3 (Mii-wall ship).
- Legacy in-editor `MyCharactersBox` — owned by phase 4 (sweep).
- Per-character CTA framing on `/c/[id]` ("Try [name] in …") — owned by phase 4.
- Route renames (`/me` → `/studio`, `/create` → `/editor`, `/play/[x]` → `/c/[id]/try/[x]`) + redirects + folder renames — owned by phase 4 (Codex executes against the locked vocabulary table).

## Phase 2 — Mii-wall homepage prototype 🟡 partial

Goal: prove the live 3D wall concept on a throwaway route before touching `/`.

- [x] Stand up `/lab/wall` that fetches up to 8 random characters from `CharacterStudioCharacters` (`sort: "@random"`, filter `hidden != true`). Internal-only route under `/lab/` so it doesn't pollute the IA; deleted when the wall ships on `/` in phase 3.
- [x] Render each in a shared R3F canvas (one canvas, N characters — independent skeletons via `SkeletonUtils.clone`, shared geometry/materials). Lighting kept simple — hemisphere + ambient + 2 directional, no shadows, no environment map. Handoff to sub-plan #2 (thumbnails) when it lands.
- [x] PocketBase schema discovery: customization sits at the **top level** of the character record, not under `.config`. Each `customization[category]` entry stores an `assetId` (PB relation), not an embedded asset. The wall side-loads the entire `CharacterStudioAssets` collection once and resolves IDs from a `Map`.
- [ ] **Heads missing on rendered characters.** Body / clothes / footwear render correctly, but face / eyes / mouth / head assets don't appear. Likely the same skeleton-binding gap that hides the bind pose — the head assets are skinned to bones (DEF-head, DEF-jaw, etc.) that exist in our clone, so they *should* render. Needs runtime inspection of the cloned skeleton's bone bindings vs. the head asset's expected skeleton.
- [ ] **Animations not driving.** Posture is stuck in bind pose despite `useAnimations` returning actions and `idleAction.play()` being called. Suspect `useAnimations` registers the mixer against the `<group>` ref *before* `<primitive object={boneRoots.root} />` mounts a useful subtree. Try moving the bone subtree into a stable child of `group` declared *before* the useAnimations hook runs, or refactor to pass an explicit bones-mounted ref to `useAnimations`.
- [ ] Per-character one-shots (wave / look-around). Code is in place but the Animations.glb has no clips matching `wave` or `look` — the stagger naturally no-ops. Either ship new clips or pick alternative one-shots from the existing 46-clip library (e.g. `Rig|Idle_Talking_Loop`, `Rig|Interact`, `Rig|Dance_Loop`).
- [ ] Hover tooltip. Code in place (`<Html>` anchored to head bone), but untested until the head bone resolves correctly post-animation-fix.
- [ ] Performance pass. Deferred until rendering is correct — measuring fps with frozen bind-pose characters wouldn't validate the real budget.

**Owner**: Claude leads design + per-file decisions; the foundation cut was built by Codex from a spec; Claude diagnosed and fixed the data-shape mismatch (assets-by-id) inline. The animation + heads investigation is the next slice — well-scoped enough to delegate again, but it's also the kind of three.js debugging that's faster done with live preview inspection.

### What's in the commit (architectural shape, deliberately scoped)

```
src/app/lab/wall/page.js           — route shell
src/components/lab/WallView.jsx    — fetch (characters ⊕ assets), skeleton, empty-state
src/components/lab/WallScene.jsx   — single Canvas, lights, ground, grid layout, tooltip slot
src/components/lab/WallCharacter.jsx — gender-keyed Armature/Animations load, SkeletonUtils.clone,
                                       bone-roots mount, per-asset render, hover handlers
src/components/lab/WallAsset.jsx   — config-driven skinnedMesh renderer (clone of editor's
                                       Asset.jsx without the store reads)
```

Architecture verified working:
- Multi-character canvas (3 characters render side by side, gender-correct rig, clothes-correct config).
- Per-character skeleton clones (no shared-pose bleed).
- Asset lookup by `assetId` against side-loaded `CharacterStudioAssets` map.
- Bone subtree mounting (`root` + `MCH-eyes_parent`) without the Plane.002 placeholder artifact.

Architecture **not yet verified**:
- Animation mixer actually drives bones (suspected ref-timing issue).
- Head/face assets render (likely related — they may animate but be stuck at bind position).
- Tooltip positioning (depends on head bone being correctly transformed).

## Phase 3 — Ship on `/`

- [ ] Replace [HubHero](../src/components/hub/HubHero.jsx) + [LivingWall](../src/components/hub/LivingWall.jsx) with the prototype. Keep [FeaturedRow](../src/components/hub/FeaturedRow.jsx) and [ExperiencesGrid](../src/components/hub/ExperiencesGrid.jsx) for now — they get renamed in phase 4 but the components stay.
- [ ] Empty-state: if the random pool returns < 3 characters, render a seeded set of demo characters owned by a known curator account (decide the account in phase 1 vocabulary work).
- [ ] OG image / metadata refresh on `/` to match the new positioning.
- [ ] Capture a perf trace + a screenshot for the wiki sync.

## Phase 4 — Rename pass

- [ ] Apply the vocabulary table app-wide: every visible string in `src/components/**` and `src/app/**`, every `metadata.title` / `metadata.description`.
- [ ] Decide route renames (e.g. should `/play/*` become `/try/*`? Should `/me` become `/<new-collection-word>`?). Land redirects from old paths so external links don't break.
- [ ] Update component **file names** only where the old name actively misleads (e.g. `LivingWall.jsx` may become `CharacterWall.jsx`); skip cosmetic renames.
- [ ] Final `rg -i 'hub|experience'` audit — every remaining match is either an intentional component name, a comment explaining the rationale, or this file.

**Owner**: Codex executes the sweep against the vocabulary table from phase 1. Claude reviews.

## Phase 5 — Wiki sync & close

- [ ] Update `wiki/architecture/app-structure.md`: surface ↔ route table reflects renamed routes; new `## Vocabulary` section at the top; new `## Homepage wall` section documenting the component contract (props, perf budget, fallback rules).
- [ ] Update `plans/app-beta-production.md` beta-gate checklist to mark items 1 + 2 done.
- [ ] Flip `wiki_sync.done: true`, `status: implemented`, `readiness: reference`, `last_reviewed: <today>` here.

## Open questions

- Which curator account hosts the seeded demo characters for empty-state fallback?
- WebGPU/TSL or stay on WebGL for the wall? The [engine rewrite](app-beta-production.md#5-engine-rewrite--ts--webgpultsl-coupled) sub-plan covers the renderer switch; if the wall ships before that lands, it ships on WebGL and gets ported in the rewrite (touched twice, but acceptable for one component).
- Should the wall characters be clickable → `/c/:id`? Probably yes; confirm in phase 2 design.

## Wiki sync

_To be filled before flipping `status: implemented`. Will list the exact sections added/changed in `wiki/architecture/app-structure.md`._
