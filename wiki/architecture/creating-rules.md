# Creating Architecture Pages

*How to add or update a page under `wiki/architecture/`.*

The pages in `wiki/architecture/` are the canonical source of architectural rules. AI agents (Claude, Codex, Cursor) read them on demand via `AGENTS.md`.

## Workflow

1. Pick a focused topic — one concept per page (stores, data-model, app-structure, …).
2. Create `wiki/architecture/<slug>.md`. Slugs are short, kebab-case.
3. Add an entry to [`wiki/architecture/README.md`](README.md) so the new page is discoverable.
4. If the page should be read for every PR review, link it from `.agents/skills/review-architecture/SKILL.md` (create the skill the first time a review needs it; don't pre-create it).

## Page format

```markdown
# Page Title

*One-line italic description of what this page covers.*

Applies to: `src/path/glob/**`.

Short intro paragraph.

## Section

Concrete guidance with code examples and rules.
```

The italic description and `Applies to:` line are plain markdown so every agent sees them.

## Good practice

- Keep a page focused on one concept. Split if it grows past ~500 lines.
- Lead with the rule, follow with the example. Show the correct shape before listing prohibitions.
- Reference real source files with a plain backtick path (e.g. `src/stores/useConfiguratorStore.js`).
- Add a new page **after** the same mistake has been made twice — not preemptively.
- Never duplicate content across pages. Link instead.

## When updates come from a plan

If a plan is in `verification` or `implemented` and the behavior it introduced is now stable, copy the durable rules into the matching architecture page (or create one). The plan keeps the history; the wiki carries the rule. See [`update-wiki-from-plan`](../../.agents/skills/update-wiki-from-plan/SKILL.md).

## Existing pages

See [`wiki/architecture/README.md`](README.md) for the current index.
