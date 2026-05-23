# Agent Instructions — `character-studio`

A Next.js 16 app (App Router, React 19, React Compiler) for building, playing with, and sharing 3D characters. Three.js + R3F for the canvas, Zustand for state, PocketBase for persistence, S3 for asset storage, shadcn/ui + Tailwind v4 for chrome.

## Repo shape

| Path | Purpose |
|---|---|
| `src/app/` | Next.js App Router routes — hub (`/`), editor (`/create`, `/create/[id]`), public character page (`/c/[id]`), play experiences (`/play/{lipsync,platformer,playground}`), `/me`, `/admin/*` |
| `src/components/{hub,editor,play,character,me,admin,shell,scene,ui}/` | View-level React components, grouped by surface |
| `src/stores/` | Zustand stores — `useConfiguratorStore` (character config + PB client), `useAuthStore` (current user) |
| `src/lib/` | Pure helpers (`lipsync.js`, etc.) |
| `src/hooks/` | Reusable hooks |
| `scripts/` | One-off Node scripts — e.g. `setup-pocketbase.js` |
| `public/` | Static assets |

## Where to look

- **Architecture rules** — `wiki/architecture/` (read on demand; index in [`wiki/architecture/README.md`](wiki/architecture/README.md)).
- **General wiki** (how things work today) — [`wiki/README.md`](wiki/README.md).
- **Active plans** (what we're building next) — [`plans/README.md`](plans/README.md).
- **Skills (ready workflows)** — `.agents/skills/<name>/SKILL.md`. Same content is reachable as `.claude/skills/`, `.codex/skills/`, `.cursor/skills/` (symlinks to `.agents/skills/`).
- **Repo orientation for humans** — [`README.md`](README.md).

`CLAUDE.md` is a symlink to this file. Codex and Cursor read it directly. If a `GEMINI.md` or `.github/copilot-instructions.md` is added later, symlink them here too.

## Codebase knowledge: plans and wiki

Two structured knowledge layers live beyond the code:

- **`plans/`** — work being built, explored, or intentionally deferred. Product direction, architecture decisions, mid-flight investigations. Active index: [`plans/README.md`](plans/README.md).
- **`wiki/`** — how the system works **today**. Architecture rules, runbooks, conventions. Entry point: [`wiki/README.md`](wiki/README.md).
- **`plans/archive/YYYY-MM/`** — historical plans. Folder month = when the plan was active. Search archive when a bug looks familiar.

Plan files are named `<area>-<slug>.md` with one of these prefixes: `app-`, `data-`, `meta-`. Each plan has YAML frontmatter (`goal`, `readiness`, `success_criteria`, `last_reviewed`, …). Filter by frontmatter before reading bodies.

**Read before acting when**:

- Touching a stable surface → the matching `wiki/architecture/<page>.md`.
- Working in a domain → glob the matching `<area>-*` plan(s).
- Debugging a surprising bug → grep `plans/` *and* `plans/archive/`.
- Starting non-trivial work → confirm no existing plan already owns the scope.

**The plan ↔ wiki contract** (non-negotiable):

> When a behavior shipped via a plan stabilises, the durable "how it works now" **must** land in `wiki/` in the same commit, or as an explicit `wiki-sync` checkbox in the plan body that gates `status: implemented`. The plan stays as the history of how it got built; the wiki becomes the read-on-demand reference. Skipping the wiki sync is how knowledge rots.

The [`update-wiki-from-plan`](.agents/skills/update-wiki-from-plan/SKILL.md) skill walks this end-to-end.

## Operating rules

- Read the full file before editing. Plan all changes, then make one complete edit.
- When the user corrects you, stop and re-read their message.
- After two consecutive tool failures, stop and change approach.
- Don't introduce backwards-compatibility shims, dead code, or speculative abstractions.
- Don't write new comments unless they explain a non-obvious *why*.
- Tangential ideas surfaced mid-task → append to [`plans/meta-todos.md`](plans/meta-todos.md); don't act on them.

## Common commands

```bash
bun dev               # next dev (port 3000)
bun build             # next build
bun lint              # biome check
bun format            # biome format --write
bun scripts/setup-pocketbase.js   # bootstrap PB collections locally
```

## Next.js

This project is on Next 16 with React 19 and the React Compiler enabled. Before any Next.js work, consult `node_modules/next/dist/docs/` — training data lags behind the local docs.
