# Plans Index

Plans are for work being built, explored, verified, or intentionally deferred. The [`wiki/`](../wiki/README.md) explains how the codebase works today; this directory explains where it is going next.

## Plan file format

Every plan starts with YAML frontmatter so humans and agents can scan the set without rereading each body.

```yaml
---
plan_id: short-kebab-id
title: Human title
status: draft | exploratory | planned | in_progress | blocked | verification | implemented | done | backlog
kind: living-plan | investigation | implementation-record | architecture-review | status-record | backlog
priority: p0 | p1 | p2 | p3
last_reviewed: YYYY-MM-DD
goal: "One-sentence done state; use TBD while still defining criteria."
readiness: needs_criteria | ready | blocked | verifying | reference
success_criteria:
  - "Specific measurable outcome -> proof artifact"
depends_on: []
related_plans: []
related_wiki: []
wiki_sync:
  required: true | false
  done: true | false
  pages: []          # wiki/ pages that need (or got) updated
  notes: ""          # why no sync is required, if applicable
archive:
  eligible: false
  reason: "Why this should stay active or can be archived."
---
```

`goal`, `readiness`, and `success_criteria` are the execution header — keep them short enough to scan in one screen. `success_criteria` are 1–3 terse pass/fail outcomes with the proof path inline (test name, screenshot location, command output, deployed URL).

`depends_on` is for hard plan-to-plan blockers only. Wiki references go in `related_wiki`.

Progress lives in checklists inside the plan body, not in the frontmatter — a single percentage tends to be both inaccurate and unmaintained.

## Goal, criteria, and readiness

- `goal`: what "done" means in one sentence.
- `readiness`: whether the next execution slice is ready, still defining criteria, blocked, verifying, or serving as a reference record.
- `success_criteria`: the shortest measurable outcomes that prove the plan worked.

Clear criteria are not required on the first draft. If meaningful criteria are unknown, set `readiness: needs_criteria`, keep `status` as `draft` or `exploratory`, and make the first phase about defining the criteria. Don't promote a plan to `planned`, `in_progress`, or `verification` until the next slice has measurable criteria and a proof path.

## The wiki-sync rule (mandatory)

> **A plan cannot be marked `implemented` until its `wiki_sync` block is satisfied.**

Concretely:

- When a plan ships behavior that introduces or changes a rule, route, store field, PB collection, or any other surface that a future agent will need to know about, the durable "how it works now" lands in [`wiki/`](../wiki/README.md) in the same commit (or the commit immediately following, if the change spans repos).
- The plan's `wiki_sync.pages` lists the wiki pages updated. If no sync is needed, `wiki_sync.required: false` with a one-line `wiki_sync.notes` explanation (e.g. "internal refactor, no public contract change").
- The body of the plan must include a `## Wiki sync` section before `status: implemented` gets set, listing the changes pushed to each page.
- The [`update-wiki-from-plan`](../.agents/skills/update-wiki-from-plan/SKILL.md) skill walks this end-to-end and is the recommended path.

The plan stays as the history of *how* the change got built. The wiki carries the *rule* the change introduced. Skipping the sync is how knowledge rots — agents will keep re-deriving the same answers.

## Living plan workflow

When work continues on a plan:

- Re-read `goal`, `success_criteria`, `readiness`, and `related_plans` before changing code or docs.
- If criteria are unclear, update the plan so the next phase defines criteria first. Ambiguity is not permission to implement the broadest version.
- Update `status` and `last_reviewed` in the frontmatter.
- Keep concrete work in checklists inside the plan body, grouped by phase.
- When a behavior ships and becomes stable, **run the wiki sync before flipping to `implemented`**.
- If one plan supersedes another, link both directions before archiving the old one.

## Execution loop

When a plan is ready to execute:

1. Restate the goal and numbered task list before changing code or docs.
2. Work the list autonomously, using the repo, tools, and tests needed for criteria.
3. After each meaningful step, verify against the proof path.
4. Keep one active goal at a time. If the goal changes, update the plan first.
5. On failure, diagnose and fix in the same plan context. Don't hand back a raw error.
6. If blocked by external decisions, credentials, or unclear criteria, log the blocker with the exact missing input and continue any independent work.
7. Before declaring done, re-read success criteria, record proof artifacts, and **satisfy `wiki_sync`**.

## Naming and prefixes

Active plan files use `<area>-<slug>.md`. The prefix is mandatory — it makes related plans cluster alphabetically.

| Prefix  | Scope |
|---|---|
| `app-`  | Anything in `src/app/` or `src/components/` — hub, editor, play, character pages, me, admin, shell, scene, UI |
| `data-` | PocketBase collections, S3 / asset pipeline, `scripts/setup-pocketbase.js` |
| `meta-` | Plan-system docs, indexes, todos, parking lots |

Rules:

- The prefix marks the plan's **primary** owner, not the only domain it touches.
- Keep the prefix set small. Don't add `auth-`, `hub-`, `editor-` etc. on the next plan — fold into one of the three buckets, or propose a prefix change in this README first.
- The `<slug>` is `kebab-case`, descriptive, and avoids restating the prefix (`app-hub-launch.md`, not `app-app-hub-launch.md`).
- `plan_id` matches the filename without `.md`.
- Avoid dates in active filenames unless the plan is event-specific.

## Resume points (next session)

The whole beta plan is opened. 4 sub-plans shipped end-to-end, 1 in-progress (engine rewrite, 67% TS-converted), 1 deferred (experiences polish). Three concrete pick-up paths, ordered by what's most ready:

1. **Verification pass (user-led)** — run through every shipped route at desktop + mobile, test the redirects (`/me` → `/studio`, `/create/[id]` → `/editor/[id]`, `/play/[experiment]` → `/studio`), save a character + confirm the new 512² thumbnail, click "Try [name] in …" from `/c/[id]`. Issues feed back into the relevant sub-plan's body, not new plans.
2. **Engine rewrite Phase 4a + 5a + 8a (CharacterContext refactor + Asset/Avatar/exportWorker)** — focused design session. The pattern: introduce a `CharacterContext` so `Asset` and `Avatar` stop reading `useConfiguratorStore` directly (editor wraps the context with the store; hero/plaza wrap it with props). Lands the three remaining TS conversions in one pass. See [app-engine-rewrite.md `### Phases 4a, 5a, 8a (remaining)`](app-engine-rewrite.md).
3. **Engine rewrite Phase 1b (WebGPU spike on Backdrop)** — only with hardware. Convert Backdrop's floor material to TSL, add the renderer-switch factory in Scene.tsx behind a feature flag, eyeball Chrome (WebGPU) + Safari (WebGL fallback), measure perf + bundle delta.

The "How we work this" section in [app-beta-production.md](app-beta-production.md#how-we-work-this) still applies — Claude designs + reviews, Codex picks up mechanical slices, every shipping commit is one logical change.

## Development order

Living plans, in current priority order. Update `status`, `priority`, and `last_reviewed` in each plan's frontmatter; this table is a scan, not the source of truth.

| Order | Plan | Status | Priority | Notes |
|---:|---|---|---|---|
| 1 | [Beta production](app-beta-production.md) | in_progress | p0 | Charter — characters-first studio. Sub-plans materialise via `start-plan` as workstreams are picked up. |
| 1.1 | [Nav + positioning](app-nav-and-positioning.md) | **implemented** | p0 | Phases 1, 3, 4, 5 shipped. Vocabulary locked, single-character hero on /, all routes renamed (`/studio`, `/editor`, `/c/[id]/try/[experiment]`) with redirects, legacy components deleted. Phase 2 `/lab/wall` paused as deliberate reference for phase 6 (plaza polish, deferred behind engine rewrite). |
| 1.2 | [shadcn-everywhere](app-shadcn-everywhere.md) | **implemented** | p1 | All 5 phases shipped. Zero direct Radix imports outside `src/components/ui/`, zero hand-rolled buttons in JSX, shims for Dialog/Tooltip/Toast/IconButton over shadcn, wiki `## UI primitives` section landed. |
| 1.3 | [Engine rewrite — TS + WebGPU/TSL](app-engine-rewrite.md) | in_progress | p1 | Phase 0 design done. **6 of 9 engine files converted to TS** (Backdrop, lipsync, LipsyncDriver, SkinManager, CameraManager, Scene). Remaining: Asset/Avatar (need CharacterContext refactor), exportWorker (defer until Avatar updates the `new URL()` import). TSL/WebGPU layer reserved for hardware-verification session. |
| 1.4 | [Thumbnails](app-thumbnails.md) | **implemented** | p2 | Phase 1: 512² stored, 1024² supersampled, head+shoulders framing. Phases 2-3 deferred behind engine rewrite. |
| 1.5 | [Editor mobile](app-editor-mobile.md) | **implemented** | p2 | ModeSelector mobile-first refactor; tighter mobile padding; ## Responsive conventions wiki section locks the mobile-first rule for positioning utilities. |
| 1.6 | [Experiences polish](app-experiences-polish.md) | draft (blocked) | p3 | Skeleton only — deferred behind 1.3 engine rewrite. Per-experiment sub-plans open lazily. |

## Reference and follow-up plans

| Plan | Status | Archive | Notes |
|---|---|---|---|
| [Hub launch](app-hub-launch.md) | implemented | active | Implementation record for `feat/hub` (commit `458ef16`). Kept active as the worked example of the wiki-sync contract. |
| [To-dos](meta-todos.md) | backlog | active | Parking lot for ideas out of scope for current work. |

## How plans fit with the wiki

- Root [README](../README.md) — repo entry point.
- [wiki/README.md](../wiki/README.md) — current-state docs (architecture rules, runbooks).
- This index — active and future work. When a plan becomes the truth of how the system works today, the wiki sync (above) is mandatory before `status: implemented`.

## Archive

Archive only after all active follow-ups have either shipped, moved to a successor plan, or moved to [todos](meta-todos.md). Archived files keep their original filename and live under a `YYYY-MM` folder reflecting **when the plan was active**:

```text
plans/archive/YYYY-MM/<original-filename>.md
```

Before moving a file:

- Set `status` to `done` or `implemented`.
- Confirm `wiki_sync.done: true` (or `wiki_sync.required: false` with a reason).
- Set `archive.eligible: true` with a reason.
- Move remaining tasks to a successor plan or [todos](meta-todos.md).
- Update links in active plans and `wiki/`.
- Add `archived_on: YYYY-MM-DD` to the frontmatter.

Archived entries are not listed in this index so the active surface stays short.
