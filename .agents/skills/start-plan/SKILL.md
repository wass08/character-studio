---
name: start-plan
description: Create a new plan file under plans/ with the correct prefix, frontmatter, and skeleton sections. Use when the user asks to start a plan, open a charter, kick off a new feature/investigation, or when non-trivial work is about to start without an existing plan covering it.
allowed-tools: Bash(git *) Read Write Edit Glob Grep
---

Create a new plan file in `plans/` that follows the conventions in [`plans/README.md`](../../../plans/README.md).

## 1. Confirm scope and prefix

Ask (or infer from the user's request) two things:

1. **Slug** — short, kebab-case, no prefix duplication. Examples: `hub-search`, `editor-export-formats`, `pb-schema-v2`.
2. **Prefix** — exactly one of:
   - `app-` — anything in `src/app/` or `src/components/` (hub, editor, play, character pages, me, admin, shell, scene, UI).
   - `data-` — PocketBase collections, S3 / asset pipeline, `scripts/setup-pocketbase.js`.
   - `meta-` — plan-system docs, indexes, todos, parking lots.

If the work doesn't fit any prefix, **stop** and either (a) reframe so it does, or (b) propose a prefix change and update [`plans/README.md`](../../../plans/README.md) first. Don't invent prefixes silently.

Filename: `plans/<prefix>-<slug>.md`. `plan_id` matches without `.md`.

## 2. Check for an existing plan

Before writing, glob the prefix and grep for the slug:

```bash
ls plans/<prefix>-*.md
rg -l "<slug>" plans/ plans/archive/
```

If something already covers the scope, append to that plan or split it into a sub-plan rather than creating a parallel charter.

## 3. Write the file

Use this skeleton. Fill in everything that's knowable now; leave `success_criteria` as `TBD` and `readiness: needs_criteria` if criteria aren't clear yet — the first phase should then be about defining them.

```markdown
---
plan_id: <prefix>-<slug>
title: <Human title>
status: draft
kind: living-plan
priority: p2
last_reviewed: YYYY-MM-DD
goal: "<One-sentence done state, or TBD>"
readiness: needs_criteria
success_criteria:
  - "TBD — first phase defines these"
depends_on: []
related_plans: []
related_wiki: []
wiki_sync:
  required: true
  done: false
  pages: []
  notes: ""
archive:
  eligible: false
  reason: "Just opened."
---

# <Title>

## Context

<Why this work, what triggered it, what's already known.>

## Goal

<Restate the goal sentence; expand into 2-3 sentences if the headline can't carry it.>

## Phases

### Phase 1 — <name>

- [ ] <Concrete task with proof path>
- [ ] <…>

## Open questions

- <…>

## Wiki sync

_Filled in before flipping `status: implemented`. List the wiki pages this plan updated and what changed on each. See [update-wiki-from-plan](../update-wiki-from-plan/SKILL.md)._
```

Use today's date for `last_reviewed`. Set `priority` based on the user's signal — default `p2` if unsure.

## 4. Update the index

Add a row to the "Development order" table in [`plans/README.md`](../../../plans/README.md). Pick an `Order` number that reflects where it sits in current priority — bump existing rows down if it's a `p0`/`p1`.

## 5. Wire related work

- If this plan supersedes another, link both in `related_plans` and note it in the old plan's body.
- If a wiki page is the natural starting context, add it to `related_wiki`.
- If a `meta-todos.md` item is being promoted, move it to the "Recently promoted" section there with a link to the new plan.

## 6. Report

Return:

- New file path.
- Prefix + slug chosen and why.
- Whether the README index was updated.
- The next concrete action (define criteria, list phase-1 tasks, etc.).

Do not start executing the plan in the same turn unless the user asks — the skill is "open the charter", not "ship it".
