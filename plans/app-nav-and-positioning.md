---
plan_id: app-nav-and-positioning
title: Nav + positioning + single-character hero
status: implemented
kind: implementation-record
priority: p0
last_reviewed: 2026-05-23
goal: "Lock the characters-first vocabulary, ship a live single-character hero on /, and propagate the new IA through every label, link, and route in the app. (Multi-character plaza polish is phase 6, deferred to post-beta — see below.)"
readiness: reference
success_criteria:
  - "Vocabulary lock recorded in wiki/architecture/app-structure.md ## Vocabulary, with label + URL tables and the rules section. Shipped on b5fb384."
  - "Homepage renders one live 3D character (signed-in user's main, anon visitor's persisted, or curator demo as fallback) with marketing copy + single 'Create your character' CTA. Shipped on 6d7ca36."
  - "Every internal Link / router.push uses the locked routes (/studio, /editor, /c/[id]/try/[experiment]). `next.config.mjs` redirects cover the old paths. `rg -i 'hub|experience'` returns only intentional internal component / class / motion-id names. Shipped on d97ce35, ce20aaf, 32bfa8d."
depends_on: []
related_plans:
  - app-beta-production
  - app-shadcn-everywhere
related_wiki:
  - wiki/architecture/app-structure.md
wiki_sync:
  required: true
  done: true
  pages:
    - wiki/architecture/app-structure.md
  notes: "Vocabulary section landed on b5fb384 (phase 1). The homepage section + final surface↔route table + shipped-route notes landed in this commit (phase 5)."
archive:
  eligible: false
  reason: "Newest reference implementation. Phase 6 (plaza polish) remains open at the end of the body but is explicitly deferred to post-beta."
---

# Nav + positioning + single-character hero

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

## Phase 3 — Ship on `/` (pivoted design)

**Pivot rationale (2026-05-23):** The multi-character `/lab/wall` prototype proved the canvas pattern works but exposed two real engineering investigations (animation mixer not driving cloned bones, head/face assets not resolving). Rather than block the homepage on those, phase 3 ships a *simpler* hero: **one big animated character + 2D card gallery below**. The multi-character "plaza" feeling becomes phase 6, scoped as polish once the engine rewrite has refactored the store coupling that made cloned-skeleton animation hard.

This pivot works because the editor's `Avatar.jsx` + `useConfiguratorStore` pipeline already animates correctly. We reuse it for the homepage hero by pre-loading a featured character into the store. No multi-character canvas needed for v1.

### Hero design (single live character)

- [ ] Add a new `src/components/home/HeroStage.jsx` (or rename `hub/HubHero.jsx` in phase 4) that mounts the editor's `<Scene>` with a *display-mode* camera config (no orbit controls, no leva, no screenshot helpers) and renders the `<Avatar />` already in the editor scene.
- [ ] On first paint, pre-load a curator-owned featured character into `useConfiguratorStore` via `loadCharacter(record)`. Cache by ID in localStorage so the same hero character returns next visit (or randomise from the featured pool — decide based on how it feels).
- [ ] Signed-in users see *their main character* in the hero instead of the demo, when one exists. Falls back to the curator character if not.
- [ ] Hover/idle interaction: keep the existing idle animation. No tooltip. Maybe a soft auto-rotation. The character does the heavy lifting visually.
- [ ] Layout: hero stage takes ~60% viewport height on desktop, 40% on mobile. Marketing copy ("Create your character" CTA) sits beside the stage on desktop, above it on mobile.

### Below the hero (2D, existing)

- [ ] Keep [FeaturedRow](../src/components/hub/FeaturedRow.jsx) and [LivingWall](../src/components/hub/LivingWall.jsx) — the 2D card grids already work, already use the locked vocabulary, already feel like "social proof". The wall doesn't need to be 3D to do its job.
- [ ] Remove [ExperiencesGrid](../src/components/hub/ExperiencesGrid.jsx) from `/`. Experiences are now subordinated to characters per the locked vocabulary; they're reached from a character page (`/c/[id]`), not from the homepage.
- [x] Remove [ExperiencesGrid](../src/components/hub/ExperiencesGrid.jsx) from `/`. *(Shipped on 6d7ca36 — removed from page.js; file deleted in slice 3, 32bfa8d.)*
- [x] Empty-state: FeaturedRow hides itself on empty; LivingWall renders its dashed-border placeholder. HeroStage canvas stays blank on no-character-found (silent fallthrough). *(Existing behaviour; verified in `## Homepage` wiki section.)*

### Curator account decision

Deferred — the demo-character bootstrap currently falls back to "most recent non-hidden" when no `featured = true` exists. Curating a stable featured character is a tiny admin task that can happen any time; not a blocker for shipping.

### Ship checklist

- [ ] OG image refresh — descoped to a follow-up (logo/copy in metadata is correct; OG image generation is its own job).
- [ ] Lighthouse perf ≥ 85 on mobile — not measured in this cycle; smoke confirmed the page renders without errors.
- [x] Manual smoke: anonymous visitor sees Jane (most-recent fallback) as hero; chip shows her in the header; clothes/face/hair render; idle pose driving.
- [ ] Perf trace — descoped to a follow-up.

## Phase 4 — Rename pass ✅

Shipped across 3 slices on commits d97ce35, ce20aaf, 32bfa8d.

### Slice 1 — folder + Link renames

- [x] `/me` → `/studio` (`git mv src/app/me src/app/studio`, page metadata + function name updated).
- [x] `/create`, `/create/[id]` → `/editor`, `/editor/[id]`.
- [x] `next.config.mjs` redirects: `/me*` → `/studio*` (308), `/create*` → `/editor*` (308), `/play/:experiment` → `/studio` (307).
- [x] Internal Link / router.push sweep across 13 sites (HubHeader nav, HeroStage CTA, CharacterChip, AccountIdentity, MyCharactersPage CTA, NoCharacterOverlay CTA, PlayShell back-link, ModeSelector back-link, EditorView replace, CharacterPageView fork, CharacterChip empty-state, GlobalChrome FULLSCREEN_PREFIXES).

### Slice 2 — play → per-character experiment routes

- [x] New routes `src/app/c/[id]/try/{lipsync,platformer,playground}/page.js`.
- [x] New loader `src/components/play/CharacterScopedPlay.jsx` resolves the URL's character against the store; loads from PB if needed; renders an error panel on 404 and a spinner while loading.
- [x] `PlayShell` reads `currentCharacterId` / `currentCharacterName` from the store; back-link points to `/c/[id]` with the character's name (truncated 140px), falls back to `/studio` if no character.
- [x] `CharacterPageView` TRY_LINKS reshaped to `{ slug, label, icon }`; hrefs built per render as `/c/${id}/try/${slug}`; section heading reads "Try {name} in".
- [x] Old `src/app/play/` folder removed.

### Slice 3 — legacy cleanup + comment vocabulary

- [x] Deleted: `HubHero.jsx`, `ExperiencesGrid.jsx` (replaced by HeroStage), `MyCharactersBox/` (unreachable since the MY_CHARACTERS mode pill was dropped in phase 1).
- [x] Dropped `UI_MODES.MY_CHARACTERS` constant + the `mode === MY_CHARACTERS` branch in `UI.jsx`. `PHOTO` mode kept — still used by per-character play views.
- [x] Comment vocabulary refresh in `FeaturedRow`, `LivingWall`, `useConfiguratorStore` (partialize), `NoCharacterOverlay`, `CharactersAdminPanel`.
- [x] Final `rg -i 'hub|experience'` audit: remaining matches are internal-only — `src/components/hub/` folder + `HubHeader` component/variant + `hub-bg` CSS class + `layoutId="hub-nav-active"`. File renames deferred to "only where actively misleading" (none qualify).

### Component file rename status

Per the plan's "only where actively misleading" rule:

- `src/components/hub/` — keep. Folder name is internal; component file names (FeaturedRow, LivingWall, CharacterCard) are still accurate.
- `src/components/me/MyCharactersPage.jsx` — keep. Routes to `/studio` now, but the component file name still describes what it shows (the user's own characters).
- `HubHeader.jsx` — keep. "Hub" is a fine internal name for the chrome shell; only the user-visible string mattered.
- `LivingWall.jsx` — keep. Name is descriptive; not misleading.

If any of these get touched for unrelated work later, opportunistic rename is fine.

**Owner shift**: spec'd "Codex executes the sweep against the vocabulary table". Ended up inline because the sweep was small enough (~17 files across 3 slices) that a Codex round-trip would have been slower than doing it directly.

## Phase 5 — Wiki sync & close (single-hero scope) ✅

- [x] Updated `wiki/architecture/app-structure.md`:
  - `## Vocabulary` URL table rewritten to "shipped" state (was "today vs locked future"); redirects noted per row.
  - `## Vocabulary` rules section updated: "Hub" survives only in internal names; old-paths-redirect rule added.
  - `## Surface ↔ route map` rewritten to reflect today's shipped routes; component folder column notes which legacy names were kept.
  - New `## Homepage` section documents the HeroStage contract: which character loads (signed-in main → anon persisted → curator featured → most-recent fallback), camera framing (`onCreated` lookAt override), empty states, and the deferred-to-phase-6 plaza note.
  - Server-vs-client paragraph updated to reflect the shadcn `TooltipProvider` + sonner `Toaster` (already correct from app-shadcn-everywhere sync, refined here).
- [x] Beta charter — workstream #1 row marked implemented; beta-gate items "vocabulary lock" and "homepage hero" ticked.
- [x] Flipped `status: implemented`, `kind: implementation-record`, `readiness: reference`, `wiki_sync.done: true`, `last_reviewed: 2026-05-23` in this file's frontmatter.

## Phase 6 — Plaza polish (deferred) 🅿️

Picks up where the `/lab/wall` prototype paused. Tracked here so it doesn't fall off the radar, but explicitly *not* required for beta. Earliest sensible start: after the [engine rewrite](app-beta-production.md#5-engine-rewrite--ts--webgpultsl-coupled) refactors the store-coupled character pipeline (`Avatar` / `Asset` / `SkinManager`) so per-character config-driven rendering doesn't need workaround clones.

### What's known to be broken on `/lab/wall`

- **Animation mixer doesn't drive the cloned bones.** `useAnimations` likely registers against the `<group>` ref before the bones-mounted primitive child synchronously appears beneath it. Needs either an explicit child ref to `useAnimations`, or a structural change so the bones are children of `group` at first render.
- **Head / face assets don't render** despite their `assetId`s resolving. Probably the same bone-binding root cause — face meshes are skinned to head bones that exist in the clone but aren't being driven.
- **No `Wave` / `Look` clips** in the Animations.glb (46 clips, none match). Either ship new clips or pick alternatives from the existing library (`Rig|Idle_Talking_Loop`, `Rig|Interact`, `Rig|Dance_Loop`).
- **Hover tooltip** is coded but unverified (depends on head bone being transformed correctly).
- **Only 3 characters in the DB** — can't validate the ≥ 6 character target.

### What this phase ships

- [ ] Fix the animation + heads issue (one investigation, likely one fix).
- [ ] Add or pick one-shot clips so the stagger isn't a no-op.
- [ ] Verify hover tooltip with the head bone correctly transformed.
- [ ] Scale to ≥ 6 characters (requires either more characters in the DB or seeded demos).
- [ ] Perf pass: lock 16ms desktop / 33ms mobile mid-tier; share materials, instance where possible, consider LOD if 6+ characters blow the budget.
- [ ] Decide where the wall *lives* once it works: a `/gallery` destination, a secondary section on `/`, or a hover-promoted state on a single character's card. Re-decide with the wall actually rendering.
- [ ] Update [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md) `## Homepage` (and possibly a new `## Plaza` section) when this ships.

### Why this is deferred

- The single-character hero in phase 3 already delivers "alive feeling" on the homepage without the multi-character investigation.
- The engine rewrite sub-plan will refactor `Avatar`/`Asset`/`SkinManager` to drop the singleton-store dependency. Doing that refactor first means the wall can be built on the new pipeline, not the workaround clones.
- Polishing now would touch code that the rewrite is about to replace.

## Open questions

- Which curator account hosts the featured character for the homepage hero (phase 3)? Same account would seed any demo characters for empty-state fallbacks.
- For phase 3: signed-in users — show *their main character* or always *the featured demo* in the hero? Current plan says main if exists; confirm with first run.
- For phase 6: WebGPU/TSL or stay on WebGL for the multi-character wall? The [engine rewrite](app-beta-production.md#5-engine-rewrite--ts--webgpultsl-coupled) covers the renderer switch; the polish phase should land *after* it.

## Wiki sync

Landed across two commits.

**Phase 1** (b5fb384, 2026-05-23) — initial `## Vocabulary` section in [wiki/architecture/app-structure.md](../wiki/architecture/app-structure.md):

- Position statement (pro creator product; product is character creation).
- Labels table (today's word → locked word → why).
- URLs table (today → locked → redirect strategy).
- Five rules going forward (no Hub, no Experiences section, Studio singular, CTA copy split, character URLs stay short).
- Surface ↔ route table updated to "today vs locked future".

**Phase 5** (this commit) — single-hero scope sync:

- `## Vocabulary` URL table rewritten as "shipped" (with redirect notes per row).
- Rules section updated for the post-sweep state.
- `## Surface ↔ route map` rewritten to reflect today's actual routes; legacy folder names called out.
- New `## Homepage` section — full HeroStage contract (composition, character-loading priority, camera framing, empty states), plus pointer to phase 6 plaza polish.
- Server-vs-client paragraph refreshed to match the shadcn-everywhere providers.

Plaza polish (phase 6) is intentionally **not** synced here — it ships its own wiki update when it eventually lands.
