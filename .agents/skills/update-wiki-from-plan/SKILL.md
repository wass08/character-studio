---
name: update-wiki-from-plan
description: Promote stable behavior from a plan into wiki/ and satisfy the plan's wiki_sync block. Use when a plan is moving toward implemented, when a feature has stabilised and isn't reflected in the wiki yet, or when the user asks to "sync the wiki", "update docs from the plan", or "close out the plan".
allowed-tools: Bash(git *) Read Write Edit Glob Grep
---

Move the durable "how it works now" from a plan into `wiki/`, satisfy the plan's `wiki_sync` block, and only then mark the plan `implemented`. This is **mandatory** before any plan flips to `implemented` — the rule lives in [`plans/README.md`](../../../plans/README.md) and [`AGENTS.md`](../../../AGENTS.md).

## 1. Pick the plan

If the user named one, use that. Otherwise:

```bash
rg -l "status: (in_progress|verification)" plans/*.md
```

Pick the plan whose behavior has shipped and stabilised. If multiple are eligible, ask the user.

Read the plan's frontmatter and body in full before touching the wiki — especially `goal`, `success_criteria`, `related_wiki`, and `wiki_sync.pages` if already populated.

## 2. Classify what the plan introduced

For each piece of behavior the plan shipped, decide which wiki page owns the rule. Use the existing index:

```bash
cat wiki/architecture/README.md
cat wiki/README.md
```

Map each change to a page:

| Change touches… | Wiki page |
|---|---|
| Routes, surface ownership, where chrome mounts | [`wiki/architecture/app-structure.md`](../../../wiki/architecture/app-structure.md) |
| Zustand store fields, hydration, PB client usage | [`wiki/architecture/stores.md`](../../../wiki/architecture/stores.md) |
| PocketBase collections, list/view rules, S3 contract | [`wiki/architecture/data-model.md`](../../../wiki/architecture/data-model.md) |
| Something with no obvious home | Create a new page — follow [creating-rules](../../../wiki/architecture/creating-rules.md) |

If a single rule would need duplicating across two pages, **link instead** — pick the canonical home and reference it from the other page.

## 3. Edit the wiki

For each target page:

- **Add or update the rule, not the story.** The wiki carries "this is how it is" — the plan keeps "this is how we got here". Strip motivation, alternatives considered, and debugging history; keep only what a future agent needs to act correctly.
- **Lead with the rule, follow with the example.** Real file paths in backticks (e.g. `src/stores/useConfiguratorStore.js`).
- **Don't duplicate.** If the rule already exists, sharpen it; don't paste a second copy.
- **One concept per page.** If a plan introduced two distinct concepts, edit two pages — don't bundle.
- **Update the table in `wiki/architecture/README.md`** when a new page lands.

Keep changes scoped to what the plan actually shipped. Don't rewrite adjacent sections just because they're nearby.

## 4. Satisfy the plan's `wiki_sync`

Open the plan and update the frontmatter:

```yaml
wiki_sync:
  required: true
  done: true
  pages:
    - wiki/architecture/<page-a>.md
    - wiki/architecture/<page-b>.md
  notes: ""
```

Then add (or update) a `## Wiki sync` section at the bottom of the plan body with a one-line summary per page of what changed there. This is what makes the contract auditable later.

## 5. Flip the plan status

Only now is it safe to set:

```yaml
status: implemented
readiness: reference
last_reviewed: <today>
```

If `success_criteria` haven't been verified, stop and verify first — don't flip the status to clear a board.

## 6. Stage and commit together

The wiki update and the plan status flip belong in the **same commit** so the audit trail is self-contained:

```bash
git add wiki/ plans/<the-plan>.md
git commit -m "docs(<area>): sync wiki from <plan-id>"
```

If the plan's behavior shipped in a previous commit and only the docs are landing now, that's fine — call it `docs(...)` and reference the plan in the body.

## 7. Report

Return:

- Plan ID and its new status.
- Each wiki page touched and a one-line description of the rule added/sharpened.
- Whether `wiki/architecture/README.md` needed a new row.
- Any rule from the plan that you deliberately did **not** promote, with the reason (e.g. "still in flux, kept in plan body").
